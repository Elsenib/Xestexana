import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const createNurseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  department: z.string().min(1),
  active: z.boolean().default(true)
});

const listQuerySchema = z.object({
  department: z.string().optional(),
  active: z.coerce.boolean().optional(),
  take: z.coerce.number().int().min(1).max(200).default(50)
});

export async function nurseRoutes(app: FastifyInstance) {
  app.get(
    "/nurses",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const query = listQuerySchema.parse(request.query);

      const rows = await app.prisma.user.findMany({
        where: {
          role: "NURSE",
          ...(query.active === undefined ? {} : { active: query.active })
        },
        select: {
          id: true,
          email: true,
          role: true,
          active: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" },
        take: query.take
      });

      return rows;
    }
  );

  app.post(
    "/nurses",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN"])]
    },
    async (request, reply) => {
      const body = createNurseSchema.parse(request.body);
      const passwordHash = await bcrypt.hash(body.password, 10);

      const nurse = await app.prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          role: "NURSE",
          clinicId: request.user.clinicId,
          active: body.active
        },
        select: {
          id: true,
          email: true,
          role: true,
          active: true,
          createdAt: true
        }
      });

      return reply.code(201).send(nurse);
    }
  );

  app.patch(
    "/nurses/:id/deactivate",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN"])]
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const nurse = await app.prisma.user.update({
        where: { id },
        data: { active: false },
        select: {
          id: true,
          email: true,
          role: true,
          active: true
        }
      });

      return reply.send(nurse);
    }
  );

  app.delete(
    "/nurses/:id",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN"])]
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Check if nurse has any related records (though nurses might not have direct relations)
      // For now, just delete since nurses don't have appointments directly

      await app.prisma.user.delete({ where: { id } });

      return { message: "Hemşire uğurla silindi." };
    }
  );
}
