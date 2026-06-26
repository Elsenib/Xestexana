import type { FastifyInstance } from "fastify";
import { z } from "zod";

const taskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const listQuerySchema = z.object({
  assigneeUserId: z.string().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  active: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
  take: z.coerce.number().int().min(1).max(200).default(100)
});

const createTaskSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(2000).optional(),
  assigneeUserId: z.string().min(1),
  dueDate: z.string().datetime(),
  priority: taskPrioritySchema.default("MEDIUM")
});

const updateStatusSchema = z.object({
  status: taskStatusSchema
});

const setActiveSchema = z.object({
  active: z.boolean()
});

const taskReaders = ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "DOCTOR", "NURSE", "CASHIER", "INVENTORY_MANAGER", "ACCOUNTANT"] as const;
const taskManagers = ["SUPER_ADMIN", "ADMIN"] as const;
const assignableRoles = ["ADMIN", "CALL_CENTER", "DOCTOR", "NURSE", "CASHIER", "INVENTORY_MANAGER", "ACCOUNTANT"] as const;

export async function taskRoutes(app: FastifyInstance) {
  app.get(
    "/tasks/assignees",
    {
      preHandler: [app.authenticate, app.authorize([...taskManagers])]
    },
    async (request) => {
      const rows = await app.prisma.user.findMany({
        where: {
          clinicId: request.user.clinicId,
          active: true,
          role: { in: [...assignableRoles] }
        },
        select: { id: true, email: true, role: true, active: true },
        orderBy: [{ role: "asc" }, { email: "asc" }]
      });
      return rows;
    }
  );

  app.get(
    "/tasks",
    {
      preHandler: [app.authenticate, app.authorize([...taskReaders])]
    },
    async (request) => {
      const query = listQuerySchema.parse(request.query);
      const clinicId = request.user.clinicId;
      const userId = request.user.sub;
      const canSeeAll = ["SUPER_ADMIN", "ADMIN"].includes(request.user.role);
      const now = new Date();

      const rows = await app.prisma.task.findMany({
        where: {
          clinicId,
          ...(query.assigneeUserId ? { assigneeUserId: query.assigneeUserId } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(query.priority ? { priority: query.priority } : {}),
          ...(query.active === undefined ? {} : { active: query.active }),
          ...(query.overdue ? { dueDate: { lt: now }, status: { in: ["PENDING", "IN_PROGRESS"] } } : {}),
          ...(canSeeAll ? {} : { assigneeUserId: userId })
        },
        include: {
          assignee: {
            select: {
              id: true,
              email: true,
              role: true,
              active: true
            }
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: query.take
      });

      return rows.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate.toISOString(),
        status: task.status,
        priority: task.priority,
        active: task.active,
        completedAt: task.completedAt?.toISOString() ?? null,
        cancelledAt: task.cancelledAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
        assignee: task.assignee,
        createdBy: task.createdBy,
        isOverdue:
          task.active &&
          ["PENDING", "IN_PROGRESS"].includes(task.status) &&
          task.dueDate.getTime() < now.getTime()
      }));
    }
  );

  app.post(
    "/tasks",
    {
      preHandler: [app.authenticate, app.authorize([...taskManagers])]
    },
    async (request, reply) => {
      const body = createTaskSchema.parse(request.body);
      const clinicId = request.user.clinicId;
      const creatorId = request.user.sub;

      if (!creatorId) {
        return reply.code(401).send({ message: "Giriş tələb olunur." });
      }

      const dueDate = new Date(body.dueDate);
      if (dueDate <= new Date()) {
        return reply.code(400).send({ message: "Son tarix gələcək tarix olmalıdır." });
      }

      const assignee = await app.prisma.user.findFirst({
        where: {
          id: body.assigneeUserId,
          clinicId,
          active: true,
          role: { in: [...assignableRoles] }
        },
        select: { id: true }
      });

      if (!assignee) {
        return reply.code(400).send({ message: "Məsul işçi tapılmadı və ya aktiv deyil." });
      }

      const task = await app.prisma.task.create({
        data: {
          clinicId,
          title: body.title,
          description: body.description,
          assigneeUserId: body.assigneeUserId,
          createdByUserId: creatorId,
          dueDate,
          priority: body.priority,
          status: "PENDING",
          active: true
        }
      });

      return reply.code(201).send({ id: task.id });
    }
  );

  app.patch(
    "/tasks/:id/status",
    {
      preHandler: [app.authenticate, app.authorize([...taskReaders])]
    },
    async (request, reply) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = updateStatusSchema.parse(request.body);
      const clinicId = request.user.clinicId;
      const userId = request.user.sub;
      const canManage = ["SUPER_ADMIN", "ADMIN"].includes(request.user.role);

      const task = await app.prisma.task.findFirst({
        where: { id: params.id, clinicId }
      });

      if (!task) {
        return reply.code(404).send({ message: "Tapşırıq tapılmadı." });
      }

      if (!canManage && task.assigneeUserId !== userId) {
        return reply.code(403).send({ message: "Bu əməliyyat üçün icazəniz yoxdur." });
      }

      const now = new Date();
      const updated = await app.prisma.task.update({
        where: { id: task.id },
        data: {
          status: body.status,
          completedAt: body.status === "COMPLETED" ? now : null,
          cancelledAt: body.status === "CANCELLED" ? now : null
        },
        select: {
          id: true,
          status: true,
          completedAt: true,
          cancelledAt: true
        }
      });

      return {
        id: updated.id,
        status: updated.status,
        completedAt: updated.completedAt?.toISOString() ?? null,
        cancelledAt: updated.cancelledAt?.toISOString() ?? null
      };
    }
  );

  app.patch(
    "/tasks/:id/active",
    {
      preHandler: [app.authenticate, app.authorize([...taskManagers])]
    },
    async (request, reply) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = setActiveSchema.parse(request.body);
      const clinicId = request.user.clinicId;

      const task = await app.prisma.task.findFirst({
        where: { id: params.id, clinicId },
        select: { id: true }
      });

      if (!task) {
        return reply.code(404).send({ message: "Tapşırıq tapılmadı." });
      }

      const updated = await app.prisma.task.update({
        where: { id: task.id },
        data: { active: body.active },
        select: { id: true, active: true }
      });

      return updated;
    }
  );
}
