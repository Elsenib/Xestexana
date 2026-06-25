import type { FastifyInstance } from "fastify";
import { z } from "zod";

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
