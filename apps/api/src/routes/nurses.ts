import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const createNurseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  active: z.boolean().default(true)
});

const listQuerySchema = z.object({
  active: z.coerce.boolean().optional(),
  take: z.coerce.number().int().min(1).max(200).default(50)
});

export async function nurseRoutes(app: FastifyInstance) {
  app.get(
    "/nurses",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN", "CALL_CENTER", "NURSE", "DOCTOR"])]
    },
    async (request) => {
      const query = listQuerySchema.parse(request.query);
      const clinicId = request.user.clinicId; // ✅ əlavə edildi

      const rows = await app.prisma.user.findMany({
        where: {
          role: "NURSE",
          clinicId, // ✅ yalnız öz klinikasının tibb bacıları
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

      // ✅ Yalnız öz klinikasının tibb bacısını deaktiv edə bilər
      const nurse = await app.prisma.user.findUnique({
        where: { id }
      });
      if (
        !nurse ||
        nurse.role !== "NURSE" ||
        nurse.clinicId !== request.user.clinicId
      ) {
        return reply.code(404).send({ message: "Tibb bacısı tapılmadı." });
      }

      const updated = await app.prisma.user.update({
        where: { id },
        data: { active: false },
        select: {
          id: true,
          email: true,
          role: true,
          active: true
        }
      });

      return reply.send(updated);
    }
  );

  app.delete(
    "/nurses/:id",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN"])]
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // ✅ Yalnız öz klinikasının tibb bacısını silə bilər
      const nurse = await app.prisma.user.findUnique({
        where: { id }
      });
      if (
        !nurse ||
        nurse.role !== "NURSE" ||
        nurse.clinicId !== request.user.clinicId
      ) {
        return reply.code(404).send({ message: "Tibb bacısı tapılmadı." });
      }

      await app.prisma.user.delete({ where: { id } });

      return { message: "Tibb bacısı uğurla silindi." };
    }
  );
}
