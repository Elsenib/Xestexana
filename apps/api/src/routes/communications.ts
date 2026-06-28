import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { createUserNotification, notifyUsersByRole } from "../services/user-notification-service.js";
import { normalizePhone } from "../services/phone-utils.js";

const communicationRoles = ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"] as const;
const openSchema = z.object({
  patientId: z.string().min(1),
  message: z.string().trim().min(1).max(2000),
});

type MetaMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string };
  document?: { caption?: string; filename?: string };
  button?: { text?: string };
};

type MetaWebhook = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: MetaMessage[];
      };
    }>;
  }>;
};

function webhookSignatureIsValid(rawBody: string | Buffer | undefined, signature: string | undefined) {
  if (!rawBody || !signature || !env.WHATSAPP_APP_SECRET) return false;
  const expected = `sha256=${createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function messageBody(message: MetaMessage) {
  return message.text?.body
    ?? message.image?.caption
    ?? message.document?.caption
    ?? message.document?.filename
    ?? message.button?.text
    ?? `[${(message.type ?? "message").toUpperCase()} mesajı]`;
}

export async function communicationRoutes(app: FastifyInstance) {
  app.post(
    "/communications/whatsapp/open",
    { preHandler: [app.authenticate, app.authorize([...communicationRoles])] },
    async (request, reply) => {
      const body = openSchema.parse(request.body);
      const patient = await app.prisma.patientProfile.findFirst({
        where: { id: body.patientId, clinicId: request.user.clinicId },
        select: { id: true, phone: true },
      });
      if (!patient) return reply.code(404).send({ message: "Pasiyent tapılmadı." });
      const phone = normalizePhone(patient.phone);
      if (phone.length < 10) return reply.code(400).send({ message: "Pasiyentin WhatsApp nömrəsi düzgün deyil." });
      const now = new Date();
      const conversation = await app.prisma.$transaction(async (tx) => {
        const chat = await tx.whatsAppConversation.upsert({
          where: { patientId: patient.id },
          create: {
            clinicId: request.user.clinicId,
            patientId: patient.id,
            assignedUserId: request.user.sub!,
            phone,
            lastMessageAt: now,
            lastOutboundAt: now,
          },
          update: {
            assignedUserId: request.user.sub!,
            phone,
            lastMessageAt: now,
            lastOutboundAt: now,
          },
        });
        await tx.whatsAppMessage.create({
          data: {
            clinicId: request.user.clinicId,
            conversationId: chat.id,
            sentByUserId: request.user.sub!,
            direction: "OUTBOUND",
            messageType: "TEXT",
            body: body.message,
            status: "OPENED_EXTERNALLY",
            occurredAt: now,
          },
        });
        return chat;
      });
      return {
        conversationId: conversation.id,
        url: `https://wa.me/${phone}?text=${encodeURIComponent(body.message)}`,
      };
    },
  );

  app.get(
    "/communications/whatsapp/conversation",
    { preHandler: [app.authenticate, app.authorize([...communicationRoles])] },
    async (request, reply) => {
      const { patientId } = z.object({ patientId: z.string().min(1) }).parse(request.query);
      const conversation = await app.prisma.whatsAppConversation.findFirst({
        where: { patientId, clinicId: request.user.clinicId },
        include: {
          messages: { orderBy: { occurredAt: "desc" }, take: 100 },
        },
      });
      if (!conversation) return reply.send({ conversation: null, messages: [] });
      return {
        conversation: {
          id: conversation.id,
          phone: conversation.phone,
          lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
        },
        messages: conversation.messages.reverse().map((message) => ({
          id: message.id,
          direction: message.direction,
          messageType: message.messageType,
          body: message.body,
          status: message.status,
          occurredAt: message.occurredAt.toISOString(),
        })),
      };
    },
  );

  app.get("/webhooks/whatsapp", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const valid = query["hub.mode"] === "subscribe"
      && Boolean(env.WHATSAPP_VERIFY_TOKEN)
      && query["hub.verify_token"] === env.WHATSAPP_VERIFY_TOKEN;
    if (!valid) return reply.code(401).send("Webhook verification failed");
    return reply.type("text/plain").send(query["hub.challenge"] ?? "");
  });

  app.post(
    "/webhooks/whatsapp",
    { config: { rawBody: true } },
    async (request, reply) => {
      const signature = typeof request.headers["x-hub-signature-256"] === "string"
        ? request.headers["x-hub-signature-256"]
        : undefined;
      if (!webhookSignatureIsValid(request.rawBody, signature)) {
        return reply.code(401).send({ message: "Webhook imzası düzgün deyil." });
      }
      const payload = request.body as MetaWebhook;
      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          if (env.WHATSAPP_PHONE_NUMBER_ID && value?.metadata?.phone_number_id !== env.WHATSAPP_PHONE_NUMBER_ID) continue;
          for (const message of value?.messages ?? []) {
            const providerMessageId = message.id;
            const from = normalizePhone(message.from ?? "");
            if (!providerMessageId || !from) continue;
            const duplicate = await app.prisma.whatsAppMessage.findUnique({
              where: { providerMessageId },
              select: { id: true },
            });
            if (duplicate) continue;

            const patient = await app.prisma.patientProfile.findFirst({
              where: {
                ...(env.WHATSAPP_CLINIC_ID ? { clinicId: env.WHATSAPP_CLINIC_ID } : {}),
                phoneNormalized: from,
              },
              select: { id: true, clinicId: true, phone: true, firstName: true, lastName: true },
            });
            if (!patient) continue;
            const occurredAt = message.timestamp && /^\d+$/.test(message.timestamp)
              ? new Date(Number(message.timestamp) * 1000)
              : new Date();
            await app.prisma.$transaction(async (tx) => {
              const existing = await tx.whatsAppConversation.findUnique({ where: { patientId: patient.id } });
              let assignedUserId = existing?.assignedUserId ?? null;
              if (!assignedUserId) {
                const encounter = await tx.clinicalEncounter.findFirst({
                  where: { clinicId: patient.clinicId, patientId: patient.id },
                  orderBy: { createdAt: "desc" },
                  select: { doctorUserId: true },
                });
                assignedUserId = encounter?.doctorUserId ?? null;
              }
              const conversation = await tx.whatsAppConversation.upsert({
                where: { patientId: patient.id },
                create: {
                  clinicId: patient.clinicId,
                  patientId: patient.id,
                  assignedUserId,
                  phone: from,
                  lastMessageAt: occurredAt,
                  lastInboundAt: occurredAt,
                },
                update: {
                  assignedUserId,
                  phone: from,
                  lastMessageAt: occurredAt,
                  lastInboundAt: occurredAt,
                },
              });
              await tx.whatsAppMessage.create({
                data: {
                  clinicId: patient.clinicId,
                  conversationId: conversation.id,
                  providerMessageId,
                  direction: "INBOUND",
                  messageType: (message.type ?? "TEXT").toUpperCase(),
                  body: messageBody(message),
                  status: "RECEIVED",
                  occurredAt,
                },
              });
              const notification = {
                clinicId: patient.clinicId,
                type: "WHATSAPP_INBOUND",
                title: `WhatsApp cavabı · ${patient.firstName} ${patient.lastName}`,
                message: messageBody(message),
                href: `/patients/card?id=${patient.id}&tab=whatsapp`,
                entityType: "WhatsAppConversation",
                entityId: conversation.id,
              };
              if (assignedUserId) {
                await createUserNotification(tx, { ...notification, recipientUserId: assignedUserId });
              } else {
                await notifyUsersByRole(tx, { ...notification, roles: ["SUPER_ADMIN", "ADMIN", "CALL_CENTER"] });
              }
            });
          }
        }
      }
      return reply.send({ received: true });
    },
  );
}
