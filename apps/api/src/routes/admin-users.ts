import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const listQuerySchema = z.object({
  role: z.enum(["ADMIN", "DOCTOR", "NURSE", "CALL_CENTER", "CASHIER", "INVENTORY_MANAGER", "ACCOUNTANT", "MANAGEMENT"]).optional(),
  take: z.coerce.number().int().min(1).max(200).default(50)
});

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "CALL_CENTER", "NURSE", "CASHIER", "INVENTORY_MANAGER", "ACCOUNTANT", "MANAGEMENT"]).default("CALL_CENTER")
});

const statusSchema = z.object({ active: z.boolean() });

export async function adminUserRoutes(app: FastifyInstance) {
  app.get(
    "/admin-users",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (request) => {
      const query = listQuerySchema.parse(request.query);
      const clinicId = request.user.clinicId; // ✅ əlavə edildi

      const users = await app.prisma.user.findMany({
        where: {
          clinicId, // ✅ yalnız öz klinikasının istifadəçiləri
          ...(query.role ? { role: query.role } : {})
        },
        select: { id: true, email: true, role: true, active: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: query.take
      });
      return users;
    }
  );

  app.post(
    "/admin-users",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (request, reply) => {
      const body = createAdminSchema.parse(request.body);
      const passwordHash = await bcrypt.hash(body.password, 10);
      const user = await app.prisma.user.create({
        data: { email: body.email, passwordHash, role: body.role, clinicId: request.user.clinicId },
        select: { id: true, email: true, role: true, active: true, createdAt: true }
      });
      return reply.code(201).send(user);
    }
  );

  app.patch(
    "/admin-users/:id/deactivate",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (id === request.user.sub) {
        return reply.code(400).send({ message: "Oz hesabinizi deaktiv ede bilmezsiniz." });
      }

      const user = await app.prisma.user.findUnique({ where: { id } });
      if (!user) return reply.code(404).send({ message: "Istifadeci tapilmadi." });

      if (!["ADMIN", "CALL_CENTER", "NURSE"].includes(user.role)) {
        return reply.code(400).send({
          message: "Klinik istifadəçisini onun xüsusi bölməsindən deaktiv edin."
        });
      }

      // ✅ Yalnız öz klinikasının istifadəçisini deaktiv edə bilər
      if (user.clinicId !== request.user.clinicId) {
        return reply.code(403).send({ message: "Bu əməliyyat üçün icazəniz yoxdur." });
      }

      await app.prisma.user.update({ where: { id }, data: { active: false } });
      return { message: "Istifadeci deaktiv edildi." };
    }
  );

  app.patch(
    "/admin-users/:id/status",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { active } = statusSchema.parse(request.body);
      if (id === request.user.sub && !active) {
        return reply.code(400).send({ message: "Öz hesabınızı deaktiv edə bilməzsiniz." });
      }
      const user = await app.prisma.user.findFirst({
        where: { id, clinicId: request.user.clinicId, role: { notIn: ["SUPER_ADMIN", "PATIENT"] } },
      });
      if (!user) return reply.code(404).send({ message: "İstifadəçi tapılmadı." });
      return app.prisma.user.update({
        where: { id },
        data: { active },
        select: { id: true, email: true, role: true, active: true, createdAt: true },
      });
    }
  );

  app.delete(
    "/admin-users/:id",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (id === request.user.sub) {
        return reply.code(400).send({ message: "Oz hesabinizi sile bilmezsiniz." });
      }

      const user = await app.prisma.user.findUnique({ where: { id } });
      if (!user) return reply.code(404).send({ message: "Istifadeci tapilmadi." });

      if (["SUPER_ADMIN", "PATIENT"].includes(user.role)) {
        return reply.code(400).send({
          message: "Klinik istifadəçisini onun xüsusi bölməsindən silin."
        });
      }

      // ✅ Yalnız öz klinikasının istifadəçisini silə bilər
      if (user.clinicId !== request.user.clinicId) {
        return reply.code(403).send({ message: "Bu əməliyyat üçün icazəniz yoxdur." });
      }

      // Tibbi sistemdə istifadəçi əlaqələri fiziki silinmir; hesab arxivlənir.
      await app.prisma.user.update({ where: { id }, data: { active: false } });
      return reply.code(204).send();
    }
  );
}
