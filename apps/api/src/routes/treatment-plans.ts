import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const clinicalReaders = ["ADMIN", "CALL_CENTER", "DOCTOR", "NURSE"] as const;
const clinicalAuthors = ["ADMIN", "DOCTOR"] as const;
const serviceSchema = z.object({
  code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(200), category: z.string().trim().min(2).max(100),
  price: z.coerce.number().min(0).max(999999999),
  durationMinutes: z.coerce.number().int().min(5).max(1440),
});
const servicePatchSchema = serviceSchema.partial().extend({ active: z.boolean().optional() });
const itemSchema = z.object({
  serviceId: z.string().min(1), tooth: z.string().trim().max(10).nullable().optional(),
  quantity: z.coerce.number().positive().max(1000),
});
const planContentSchema = z.object({
  title: z.string().trim().min(3).max(200), discount: z.coerce.number().min(0).max(999999999).default(0),
  note: z.string().trim().max(2000).nullable().optional(), items: z.array(itemSchema).min(1).max(100),
});
const createPlanSchema = planContentSchema.extend({ patientId: z.string().min(1) });
const listPlanQuery = z.object({ patientId: z.string().min(1).optional(), take: z.coerce.number().int().min(1).max(200).default(100) });
const idParams = z.object({ id: z.string().min(1) });
const statusSchema = z.object({ status: z.enum(["PRESENTED", "ACCEPTED", "PARTIALLY_ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELED"]) });

async function resolvedItems(app: FastifyInstance, clinicId: string, items: z.infer<typeof itemSchema>[]) {
  const ids = [...new Set(items.map((item) => item.serviceId))];
  const services = await app.prisma.service.findMany({ where: { id: { in: ids }, clinicId, active: true } });
  if (services.length !== ids.length) return null;
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  return items.map((item) => ({
    serviceId: item.serviceId, tooth: item.tooth, quantity: item.quantity,
    unitPrice: serviceMap.get(item.serviceId)!.price,
  }));
}

export async function treatmentPlanRoutes(app: FastifyInstance) {
  app.get("/services", { preHandler: [app.authenticate, app.authorize([...clinicalReaders])] }, async (request) => {
    const rows = await app.prisma.service.findMany({ where: { clinicId: request.user.clinicId }, orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }] });
    return rows.map((row) => ({ ...row, price: row.price.toNumber() }));
  });
  app.post("/services", { preHandler: [app.authenticate, app.authorize(["ADMIN"])] }, async (request, reply) => {
    const body = serviceSchema.parse(request.body);
    try {
      const row = await app.prisma.service.create({ data: { ...body, clinicId: request.user.clinicId } });
      return reply.code(201).send({ ...row, price: row.price.toNumber() });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return reply.code(409).send({ message: "Bu xidmət kodu artıq mövcuddur." });
      throw error;
    }
  });
  app.patch("/services/:id", { preHandler: [app.authenticate, app.authorize(["ADMIN"])] }, async (request, reply) => {
    const { id } = idParams.parse(request.params); const body = servicePatchSchema.parse(request.body);
    const existing = await app.prisma.service.findFirst({ where: { id, clinicId: request.user.clinicId } });
    if (!existing) return reply.code(404).send({ message: "Xidmət tapılmadı." });
    const row = await app.prisma.service.update({ where: { id }, data: body });
    return { ...row, price: row.price.toNumber() };
  });

  app.get("/treatment-plans", { preHandler: [app.authenticate, app.authorize([...clinicalReaders])] }, async (request) => {
    const query = listPlanQuery.parse(request.query);
    const rows = await app.prisma.treatmentPlan.findMany({
      where: { clinicId: request.user.clinicId, ...(query.patientId ? { patientId: query.patientId } : {}), ...(request.user.role === "DOCTOR" ? { doctorUserId: request.user.sub } : {}) },
      orderBy: { updatedAt: "desc" }, take: query.take,
      include: { patient: { select: { firstName: true, lastName: true } }, doctor: { select: { email: true } }, versions: { orderBy: { version: "desc" }, take: 1, include: { items: { include: { service: true } } } } },
    });
    return rows.map((row) => {
      const latest = row.versions[0];
      const subtotal = latest?.items.reduce((sum, item) => sum + item.quantity.toNumber() * item.unitPrice.toNumber(), 0) ?? 0;
      return { ...row, patientName: `${row.patient.firstName} ${row.patient.lastName}`, latestVersion: latest ? { ...latest, discount: latest.discount.toNumber(), items: latest.items.map((item) => ({ ...item, quantity: item.quantity.toNumber(), unitPrice: item.unitPrice.toNumber(), service: { ...item.service, price: item.service.price.toNumber() } })) } : null, subtotal, total: Math.max(0, subtotal - (latest?.discount.toNumber() ?? 0)) };
    });
  });

  app.post("/treatment-plans", { preHandler: [app.authenticate, app.authorize([...clinicalAuthors])] }, async (request, reply) => {
    const body = createPlanSchema.parse(request.body); const userId = request.user.sub!; const clinicId = request.user.clinicId;
    const patient = await app.prisma.patientProfile.findFirst({ where: { id: body.patientId, clinicId }, select: { id: true } });
    if (!patient) return reply.code(404).send({ message: "Pasiyent tapılmadı." });
    const items = await resolvedItems(app, clinicId, body.items);
    if (!items) return reply.code(400).send({ message: "Seçilmiş xidmətlərdən biri aktiv deyil." });
    const plan = await app.prisma.treatmentPlan.create({
      data: {
        clinicId,
        patientId: body.patientId,
        doctorUserId: userId,
        title: body.title,
        versions: {
          create: {
            clinicId,
            version: 1,
            discount: body.discount,
            note: body.note,
            createdByUserId: userId,
            items: { create: items },
          },
        },
      },
    });
    return reply.code(201).send(plan);
  });

  app.post("/treatment-plans/:id/versions", { preHandler: [app.authenticate, app.authorize([...clinicalAuthors])] }, async (request, reply) => {
    const { id } = idParams.parse(request.params); const body = planContentSchema.parse(request.body); const clinicId = request.user.clinicId; const userId = request.user.sub!;
    const plan = await app.prisma.treatmentPlan.findFirst({ where: { id, clinicId, ...(request.user.role === "DOCTOR" ? { doctorUserId: userId } : {}) } });
    if (!plan || ["COMPLETED", "CANCELED"].includes(plan.status)) return reply.code(409).send({ message: "Plan tapılmadı və ya bağlanıb." });
    const items = await resolvedItems(app, clinicId, body.items); if (!items) return reply.code(400).send({ message: "Seçilmiş xidmətlərdən biri aktiv deyil." });
    const version = plan.currentVersion + 1;
    await app.prisma.$transaction([app.prisma.treatmentPlanVersion.create({ data: { clinicId, treatmentPlanId: id, version, discount: body.discount, note: body.note, createdByUserId: userId, items: { create: items } } }), app.prisma.treatmentPlan.update({ where: { id }, data: { title: body.title, currentVersion: version, status: "DRAFT" } })]);
    return reply.code(201).send({ id, version });
  });

  app.patch("/treatment-plans/:id/status", { preHandler: [app.authenticate, app.authorize([...clinicalAuthors])] }, async (request, reply) => {
    const { id } = idParams.parse(request.params); const { status } = statusSchema.parse(request.body);
    const plan = await app.prisma.treatmentPlan.findFirst({ where: { id, clinicId: request.user.clinicId, ...(request.user.role === "DOCTOR" ? { doctorUserId: request.user.sub } : {}) } });
    if (!plan) return reply.code(404).send({ message: "Müalicə planı tapılmadı." });
    const allowed: Record<string, string[]> = { DRAFT: ["PRESENTED", "CANCELED"], PRESENTED: ["ACCEPTED", "PARTIALLY_ACCEPTED", "CANCELED"], ACCEPTED: ["IN_PROGRESS", "CANCELED"], PARTIALLY_ACCEPTED: ["IN_PROGRESS", "CANCELED"], IN_PROGRESS: ["COMPLETED", "CANCELED"], COMPLETED: [], CANCELED: [] };
    if (!allowed[plan.status]?.includes(status)) return reply.code(409).send({ message: `${plan.status} statusundan ${status} statusuna keçmək olmaz.` });
    return app.prisma.treatmentPlan.update({ where: { id }, data: { status } });
  });
}
