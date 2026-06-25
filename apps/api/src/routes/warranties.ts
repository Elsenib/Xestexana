import type { FastifyInstance } from "fastify";
import { z } from "zod";

const warrantyReaderRoles = ["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "CALL_CENTER", "MANAGEMENT"] as const;
const warrantyWriterRoles = ["SUPER_ADMIN", "ADMIN", "DOCTOR"] as const;

const templateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  durationDays: z.coerce.number().int().min(1).max(3650),
  conditions: z.string().trim().max(2000).nullable().optional(),
});

const issueWarrantySchema = z.object({
  patientId: z.string().min(1),
  templateId: z.string().min(1).nullable().optional(),
  treatmentPlanId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(2).max(180).optional(),
  durationDays: z.coerce.number().int().min(1).max(3650).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

const listQuerySchema = z.object({
  patientId: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
  take: z.coerce.number().int().min(1).max(200).default(100),
});

const paramsSchema = z.object({ id: z.string().min(1) });

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function warrantyRoutes(app: FastifyInstance) {
  app.get(
    "/warranties/templates",
    { preHandler: [app.authenticate, app.authorize([...warrantyReaderRoles])] },
    async (request) => {
      const templates = await app.prisma.warrantyTemplate.findMany({
        where: { clinicId: request.user.clinicId },
        orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
      });
      return templates.map((template) => ({
        id: template.id,
        name: template.name,
        durationDays: template.durationDays,
        conditions: template.conditions,
        active: template.active,
      }));
    },
  );

  app.post(
    "/warranties/templates",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN", "ADMIN"])] },
    async (request, reply) => {
      const body = templateSchema.parse(request.body);
      const template = await app.prisma.warrantyTemplate.create({
        data: {
          clinicId: request.user.clinicId,
          name: body.name,
          durationDays: body.durationDays,
          conditions: body.conditions ?? null,
        },
      });
      return reply.code(201).send({ id: template.id });
    },
  );

  app.patch(
    "/warranties/templates/:id/active",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN", "ADMIN"])] },
    async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const body = z.object({ active: z.boolean() }).parse(request.body);
      const template = await app.prisma.warrantyTemplate.findFirst({
        where: { id, clinicId: request.user.clinicId },
        select: { id: true },
      });
      if (!template) return reply.code(404).send({ message: "Zəmanət şablonu tapılmadı." });
      await app.prisma.warrantyTemplate.update({ where: { id }, data: { active: body.active } });
      return { id, active: body.active };
    },
  );

  app.get(
    "/warranties",
    { preHandler: [app.authenticate, app.authorize([...warrantyReaderRoles])] },
    async (request) => {
      const query = listQuerySchema.parse(request.query);
      const warranties = await app.prisma.patientWarranty.findMany({
        where: {
          clinicId: request.user.clinicId,
          ...(query.patientId ? { patientId: query.patientId } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
        take: query.take,
        include: {
          patient: { select: { firstName: true, lastName: true, phone: true } },
          template: { select: { name: true } },
          createdBy: { select: { email: true } },
        },
      });

      const now = Date.now();
      return warranties.map((warranty) => ({
        id: warranty.id,
        patientId: warranty.patientId,
        patientName: `${warranty.patient.firstName} ${warranty.patient.lastName}`,
        patientPhone: warranty.patient.phone,
        templateName: warranty.template?.name ?? null,
        title: warranty.title,
        status: warranty.status,
        isExpired: warranty.expiresAt.getTime() < now,
        issuedAt: warranty.issuedAt.toISOString(),
        expiresAt: warranty.expiresAt.toISOString(),
        note: warranty.note,
        createdBy: warranty.createdBy.email,
      }));
    },
  );

  app.post(
    "/warranties",
    { preHandler: [app.authenticate, app.authorize([...warrantyWriterRoles])] },
    async (request, reply) => {
      const body = issueWarrantySchema.parse(request.body);
      const userId = request.user.sub;
      if (!userId) return reply.code(401).send({ message: "Giriş tələb olunur." });

      const patient = await app.prisma.patientProfile.findFirst({
        where: { id: body.patientId, clinicId: request.user.clinicId },
        select: { id: true },
      });
      if (!patient) return reply.code(404).send({ message: "Pasiyent tapılmadı." });

      let template: { id: string; name: string; durationDays: number } | null = null;
      if (body.templateId) {
        template = await app.prisma.warrantyTemplate.findFirst({
          where: { id: body.templateId, clinicId: request.user.clinicId, active: true },
          select: { id: true, name: true, durationDays: true },
        });
        if (!template) return reply.code(400).send({ message: "Aktiv zəmanət şablonu tapılmadı." });
      }

      if (body.treatmentPlanId) {
        const plan = await app.prisma.treatmentPlan.findFirst({
          where: { id: body.treatmentPlanId, clinicId: request.user.clinicId, patientId: body.patientId },
          select: { id: true },
        });
        if (!plan) return reply.code(400).send({ message: "Pasiyentin müalicə planı tapılmadı." });
      }

      const durationDays = body.durationDays ?? template?.durationDays ?? 180;
      const issuedAt = new Date();
      const warranty = await app.prisma.patientWarranty.create({
        data: {
          clinicId: request.user.clinicId,
          patientId: body.patientId,
          treatmentPlanId: body.treatmentPlanId ?? null,
          templateId: template?.id ?? null,
          title: body.title ?? template?.name ?? "Müalicə zəmanəti",
          issuedAt,
          expiresAt: addDays(issuedAt, durationDays),
          note: body.note ?? null,
          createdByUserId: userId,
        },
      });

      return reply.code(201).send({ id: warranty.id });
    },
  );
}
