import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { normalizePhone } from "../services/phone-utils.js";

const crmRoles = ["SUPER_ADMIN", "ADMIN", "CALL_CENTER"] as const;
const taskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const createRecallSchema = z.object({
  patientId: z.string().min(1),
  assigneeUserId: z.string().min(1).optional(),
  dueDate: z.string().datetime(),
  reason: z.string().trim().min(3).max(600),
  priority: taskPrioritySchema.default("MEDIUM"),
});

const leadStatusSchema = z.enum(["NEW", "CONTACTED", "APPOINTMENT_PLANNED", "CONVERTED", "LOST"]);
const leadSourceSchema = z.enum(["PHONE", "WHATSAPP", "INSTAGRAM", "REFERRAL", "WALK_IN", "WEBSITE", "OTHER"]);

const createLeadSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(5).max(40),
  source: leadSourceSchema.default("OTHER"),
  interest: z.string().trim().max(300).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
  assignedToUserId: z.string().min(1).nullable().optional(),
});

const listLeadQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  q: z.string().trim().max(80).optional(),
  take: z.coerce.number().int().min(1).max(200).default(80),
});

const createLeadActivitySchema = z.object({
  type: z.enum(["CALL", "WHATSAPP", "NOTE", "PRICE_SENT", "FOLLOW_UP"]).default("NOTE"),
  channel: z.enum(["PHONE", "WHATSAPP", "INSTAGRAM", "SYSTEM", "OTHER"]).default("PHONE"),
  summary: z.string().trim().min(2).max(1000),
  nextActionAt: z.string().datetime().nullable().optional(),
});

const convertLeadSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  identityNumber: z.string().trim().min(3).max(80).optional(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  gender: z.enum(["FEMALE", "MALE", "OTHER"]).default("OTHER"),
  birthDate: z.string().datetime().optional(),
});

const listRecallQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  take: z.coerce.number().int().min(1).max(200).default(80),
});

export async function crmRoutes(app: FastifyInstance) {
  app.get(
    "/crm/agents",
    { preHandler: [app.authenticate, app.authorize([...crmRoles])] },
    async (request) => {
      const rows = await app.prisma.user.findMany({
        where: {
          clinicId: request.user.clinicId,
          active: true,
          role: { in: ["CALL_CENTER", "ADMIN"] },
        },
        orderBy: [{ role: "asc" }, { email: "asc" }],
        select: { id: true, email: true, role: true },
      });
      return rows;
    },
  );

  app.get(
    "/crm/leads",
    { preHandler: [app.authenticate, app.authorize([...crmRoles])] },
    async (request) => {
      const query = listLeadQuerySchema.parse(request.query);
      const userId = request.user.sub;
      const isOperator = request.user.role === "CALL_CENTER";

      const rows = await app.prisma.lead.findMany({
        where: {
          clinicId: request.user.clinicId,
          ...(query.status ? { status: query.status } : {}),
          ...(query.q
            ? {
                OR: [
                  { fullName: { contains: query.q, mode: "insensitive" } },
                  { phone: { contains: query.q } },
                  { interest: { contains: query.q, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(isOperator ? { OR: [{ assignedToUserId: userId }, { assignedToUserId: null }] } : {}),
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: query.take,
        include: {
          assignedTo: { select: { id: true, email: true, role: true } },
          createdBy: { select: { id: true, email: true, role: true } },
          activities: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: { createdBy: { select: { email: true } } },
          },
        },
      });

      return rows.map((lead) => ({
        id: lead.id,
        fullName: lead.fullName,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        interest: lead.interest,
        note: lead.note,
        convertedPatientId: lead.convertedPatientId,
        assignedTo: lead.assignedTo,
        createdBy: lead.createdBy,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        activities: lead.activities.map((activity) => ({
          id: activity.id,
          type: activity.type,
          channel: activity.channel,
          summary: activity.summary,
          nextActionAt: activity.nextActionAt?.toISOString() ?? null,
          createdAt: activity.createdAt.toISOString(),
          createdBy: activity.createdBy.email,
        })),
      }));
    },
  );

  app.post(
    "/crm/leads",
    { preHandler: [app.authenticate, app.authorize([...crmRoles])] },
    async (request, reply) => {
      const body = createLeadSchema.parse(request.body);
      const createdByUserId = request.user.sub;
      if (!createdByUserId) return reply.code(401).send({ message: "Giriş tələb olunur." });

      let assignedToUserId = body.assignedToUserId ?? null;
      if (!assignedToUserId && request.user.role === "CALL_CENTER") assignedToUserId = createdByUserId;
      if (assignedToUserId) {
        const assignee = await app.prisma.user.findFirst({
          where: {
            id: assignedToUserId,
            clinicId: request.user.clinicId,
            active: true,
            role: { in: ["CALL_CENTER", "ADMIN"] },
          },
          select: { id: true },
        });
        if (!assignee) return reply.code(400).send({ message: "Məsul işçi tapılmadı və ya aktiv deyil." });
      }

      const lead = await app.prisma.lead.create({
        data: {
          clinicId: request.user.clinicId,
          fullName: body.fullName,
          phone: body.phone,
          source: body.source,
          interest: body.interest ?? null,
          note: body.note ?? null,
          assignedToUserId,
          createdByUserId,
          activities: {
            create: {
              clinicId: request.user.clinicId,
              type: "NOTE",
              channel: body.source === "WHATSAPP" ? "WHATSAPP" : "PHONE",
              summary: body.note || `Lead yaradıldı: ${body.interest || body.source}`,
              createdByUserId,
            },
          },
        },
      });

      return reply.code(201).send({ id: lead.id });
    },
  );

  app.patch(
    "/crm/leads/:id/status",
    { preHandler: [app.authenticate, app.authorize([...crmRoles])] },
    async (request, reply) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = z.object({ status: leadStatusSchema, note: z.string().trim().max(600).optional() }).parse(request.body);
      const userId = request.user.sub;
      const isOperator = request.user.role === "CALL_CENTER";

      const lead = await app.prisma.lead.findFirst({ where: { id: params.id, clinicId: request.user.clinicId } });
      if (!lead) return reply.code(404).send({ message: "Lead tapılmadı." });
      if (isOperator && lead.assignedToUserId && lead.assignedToUserId !== userId) {
        return reply.code(403).send({ message: "Bu lead sizə təyin edilməyib." });
      }

      await app.prisma.$transaction([
        app.prisma.lead.update({ where: { id: lead.id }, data: { status: body.status } }),
        app.prisma.cRMActivity.create({
          data: {
            clinicId: request.user.clinicId,
            leadId: lead.id,
            type: "STATUS_CHANGE",
            channel: "SYSTEM",
            summary: body.note || `Status dəyişdi: ${body.status}`,
            createdByUserId: userId!,
          },
        }),
      ]);

      return { id: lead.id, status: body.status };
    },
  );

  app.post(
    "/crm/leads/:id/convert-patient",
    { preHandler: [app.authenticate, app.authorize([...crmRoles])] },
    async (request, reply) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = convertLeadSchema.parse(request.body ?? {});
      const userId = request.user.sub;
      const isOperator = request.user.role === "CALL_CENTER";
      if (!userId) return reply.code(401).send({ message: "Giriş tələb olunur." });

      const lead = await app.prisma.lead.findFirst({
        where: { id: params.id, clinicId: request.user.clinicId },
        select: {
          id: true,
          fullName: true,
          phone: true,
          status: true,
          convertedPatientId: true,
          assignedToUserId: true,
        },
      });
      if (!lead) return reply.code(404).send({ message: "Lead tapılmadı." });
      if (isOperator && lead.assignedToUserId && lead.assignedToUserId !== userId) {
        return reply.code(403).send({ message: "Bu lead sizə təyin edilməyib." });
      }
      if (lead.convertedPatientId) {
        return { id: lead.id, patientId: lead.convertedPatientId, alreadyConverted: true };
      }

      const nameParts = lead.fullName.trim().split(/\s+/).filter(Boolean);
      const firstName = body.firstName ?? nameParts[0] ?? "Lead";
      const lastName = body.lastName ?? (nameParts.slice(1).join(" ") || "Pasiyent");
      const identityNumber = body.identityNumber ?? `LEAD-${lead.id.slice(-8).toUpperCase()}`;
      const email = body.email ?? `lead-${lead.id.slice(0, 8)}@lovelydent.local`;
      const passwordHash = await bcrypt.hash(body.password ?? crypto.randomUUID(), 10);

      const result = await app.prisma.$transaction(async (tx) => {
        const existingIdentity = await tx.patientProfile.findFirst({
          where: { clinicId: request.user.clinicId, identityNumber },
          select: { id: true },
        });
        if (existingIdentity) return { error: "IDENTITY_EXISTS" as const };

        const existingEmail = await tx.user.findUnique({ where: { email }, select: { id: true } });
        if (existingEmail) return { error: "EMAIL_EXISTS" as const };

        const patientUser = await tx.user.create({
          data: {
            clinicId: request.user.clinicId,
            email,
            passwordHash,
            role: "PATIENT",
          },
        });
        const patient = await tx.patientProfile.create({
          data: {
            clinicId: request.user.clinicId,
            userId: patientUser.id,
            identityNumber,
            firstName,
            lastName,
            phone: lead.phone,
            phoneNormalized: normalizePhone(lead.phone),
            gender: body.gender,
            birthDate: body.birthDate ? new Date(body.birthDate) : new Date("1990-01-01T00:00:00.000Z"),
          },
        });

        await tx.lead.update({
          where: { id: lead.id },
          data: {
            status: "CONVERTED",
            convertedPatientId: patient.id,
          },
        });
        await tx.cRMActivity.create({
          data: {
            clinicId: request.user.clinicId,
            leadId: lead.id,
            patientId: patient.id,
            type: "CONVERTED",
            channel: "SYSTEM",
            summary: `Lead pasiyent kartına çevrildi: ${firstName} ${lastName}`,
            createdByUserId: userId,
          },
        });

        return { patient };
      });

      if ("error" in result) {
        if (result.error === "IDENTITY_EXISTS") {
          return reply.code(409).send({ message: "Bu şəxsiyyət/unikal nömrə ilə pasiyent artıq var." });
        }
        return reply.code(409).send({ message: "Bu e-poçt ilə istifadəçi artıq var." });
      }

      return reply.code(201).send({ id: lead.id, patientId: result.patient.id });
    },
  );

  app.post(
    "/crm/leads/:id/activities",
    { preHandler: [app.authenticate, app.authorize([...crmRoles])] },
    async (request, reply) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = createLeadActivitySchema.parse(request.body);
      const userId = request.user.sub;
      const isOperator = request.user.role === "CALL_CENTER";
      if (!userId) return reply.code(401).send({ message: "Giriş tələb olunur." });

      const lead = await app.prisma.lead.findFirst({
        where: { id: params.id, clinicId: request.user.clinicId },
        select: { id: true, status: true, assignedToUserId: true },
      });
      if (!lead) return reply.code(404).send({ message: "Lead tapılmadı." });
      if (isOperator && lead.assignedToUserId && lead.assignedToUserId !== userId) {
        return reply.code(403).send({ message: "Bu lead sizə təyin edilməyib." });
      }

      const activity = await app.prisma.$transaction(async (tx) => {
        const created = await tx.cRMActivity.create({
          data: {
            clinicId: request.user.clinicId,
            leadId: lead.id,
            type: body.type,
            channel: body.channel,
            summary: body.summary,
            nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null,
            createdByUserId: userId,
          },
        });
        if (lead.status === "NEW") {
          await tx.lead.update({ where: { id: lead.id }, data: { status: "CONTACTED" } });
        } else {
          await tx.lead.update({ where: { id: lead.id }, data: { updatedAt: new Date() } });
        }
        return created;
      });

      return reply.code(201).send({
        id: activity.id,
        createdAt: activity.createdAt.toISOString(),
      });
    },
  );

  app.get(
    "/crm/recalls",
    { preHandler: [app.authenticate, app.authorize([...crmRoles])] },
    async (request) => {
      const query = listRecallQuerySchema.parse(request.query);
      const userId = request.user.sub;
      const isOperator = request.user.role === "CALL_CENTER";

      const rows = await app.prisma.task.findMany({
        where: {
          clinicId: request.user.clinicId,
          title: { startsWith: "CRM recall" },
          active: true,
          ...(query.status ? { status: query.status } : {}),
          ...(isOperator ? { assigneeUserId: userId } : {}),
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: query.take,
        include: {
          assignee: { select: { id: true, email: true, role: true } },
          createdBy: { select: { id: true, email: true, role: true } },
        },
      });

      const now = Date.now();
      return rows.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate.toISOString(),
        status: task.status,
        priority: task.priority,
        isOverdue: ["PENDING", "IN_PROGRESS"].includes(task.status) && task.dueDate.getTime() < now,
        assignee: task.assignee,
        createdBy: task.createdBy,
        createdAt: task.createdAt.toISOString(),
      }));
    },
  );

  app.post(
    "/crm/recalls",
    { preHandler: [app.authenticate, app.authorize([...crmRoles])] },
    async (request, reply) => {
      const body = createRecallSchema.parse(request.body);
      const clinicId = request.user.clinicId;
      const createdByUserId = request.user.sub;

      if (!createdByUserId) {
        return reply.code(401).send({ message: "Giriş tələb olunur." });
      }

      const dueDate = new Date(body.dueDate);
      if (dueDate <= new Date()) {
        return reply.code(400).send({ message: "Recall tarixi gələcək tarix olmalıdır." });
      }

      const patient = await app.prisma.patientProfile.findFirst({
        where: { id: body.patientId, clinicId },
        select: { id: true, firstName: true, lastName: true, phone: true, identityNumber: true },
      });
      if (!patient) return reply.code(404).send({ message: "Pasiyent tapılmadı." });

      let assigneeUserId = body.assigneeUserId;
      if (!assigneeUserId && request.user.role === "CALL_CENTER") {
        assigneeUserId = createdByUserId;
      }
      if (!assigneeUserId) {
        const firstAgent = await app.prisma.user.findFirst({
          where: { clinicId, active: true, role: "CALL_CENTER" },
          orderBy: { email: "asc" },
          select: { id: true },
        });
        assigneeUserId = firstAgent?.id;
      }
      if (!assigneeUserId) {
        return reply.code(400).send({ message: "Recall üçün aktiv qeydiyyatçı tapılmadı." });
      }

      const assignee = await app.prisma.user.findFirst({
        where: {
          id: assigneeUserId,
          clinicId,
          active: true,
          role: { in: ["CALL_CENTER", "ADMIN"] },
        },
        select: { id: true },
      });
      if (!assignee) return reply.code(400).send({ message: "Məsul işçi tapılmadı və ya aktiv deyil." });

      const patientName = `${patient.firstName} ${patient.lastName}`;
      const task = await app.prisma.task.create({
        data: {
          clinicId,
          title: `CRM recall · ${patientName}`,
          description: [
            `Pasiyent: ${patientName}`,
            `Telefon: ${patient.phone}`,
            `FIN/ID: ${patient.identityNumber}`,
            `Səbəb: ${body.reason}`,
          ].join("\n"),
          assigneeUserId,
          createdByUserId,
          dueDate,
          priority: body.priority,
          status: "PENDING",
          active: true,
        },
      });

      return reply.code(201).send({ id: task.id });
    },
  );

  app.patch(
    "/crm/recalls/:id/status",
    { preHandler: [app.authenticate, app.authorize([...crmRoles])] },
    async (request, reply) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = z.object({ status: taskStatusSchema }).parse(request.body);
      const userId = request.user.sub;
      const isOperator = request.user.role === "CALL_CENTER";

      const task = await app.prisma.task.findFirst({
        where: {
          id: params.id,
          clinicId: request.user.clinicId,
          title: { startsWith: "CRM recall" },
        },
      });
      if (!task) return reply.code(404).send({ message: "Recall tapılmadı." });
      if (isOperator && task.assigneeUserId !== userId) {
        return reply.code(403).send({ message: "Bu recall sizə təyin edilməyib." });
      }

      const now = new Date();
      const updated = await app.prisma.task.update({
        where: { id: task.id },
        data: {
          status: body.status,
          completedAt: body.status === "COMPLETED" ? now : null,
          cancelledAt: body.status === "CANCELLED" ? now : null,
        },
        select: { id: true, status: true, completedAt: true, cancelledAt: true },
      });

      return {
        id: updated.id,
        status: updated.status,
        completedAt: updated.completedAt?.toISOString() ?? null,
        cancelledAt: updated.cancelledAt?.toISOString() ?? null,
      };
    },
  );
}
