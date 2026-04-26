import bcrypt from "bcryptjs";
import { z } from "zod";
const listQuerySchema = z.object({
    role: z.enum(["ADMIN", "DOCTOR", "NURSE", "PATIENT", "CALL_CENTER"]).optional(),
    take: z.coerce.number().int().min(1).max(200).default(50)
});
const createAdminSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["ADMIN", "CALL_CENTER", "NURSE"]).default("ADMIN")
});
export async function adminUserRoutes(app) {
    app.get("/admin-users", { preHandler: [app.authenticate, app.authorize(["ADMIN"])] }, async (request) => {
        const query = listQuerySchema.parse(request.query);
        const users = await app.prisma.user.findMany({
            where: query.role ? { role: query.role } : undefined,
            select: { id: true, email: true, role: true, active: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: query.take
        });
        return users;
    });
    app.post("/admin-users", { preHandler: [app.authenticate, app.authorize(["ADMIN"])] }, async (request, reply) => {
        const body = createAdminSchema.parse(request.body);
        const passwordHash = await bcrypt.hash(body.password, 10);
        const user = await app.prisma.user.create({
            data: { email: body.email, passwordHash, role: body.role, clinicId: request.user.clinicId },
            select: { id: true, email: true, role: true, active: true, createdAt: true }
        });
        return reply.code(201).send(user);
    });
    app.patch("/admin-users/:id/deactivate", { preHandler: [app.authenticate, app.authorize(["ADMIN"])] }, async (request, reply) => {
        const { id } = request.params;
        if (id === request.user.sub) {
            return reply.code(400).send({ message: "Oz hesabinizi deaktiv ede bilmezsiniz." });
        }
        const user = await app.prisma.user.findUnique({ where: { id } });
        if (!user)
            return reply.code(404).send({ message: "Istifadeci tapilmadi." });
        await app.prisma.user.update({ where: { id }, data: { active: false } });
        return { message: "Istifadeci deaktiv edildi." };
    });
    app.delete("/admin-users/:id", { preHandler: [app.authenticate, app.authorize(["ADMIN"])] }, async (request, reply) => {
        const { id } = request.params;
        if (id === request.user.sub) {
            return reply.code(400).send({ message: "Oz hesabinizi sile bilmezsiniz." });
        }
        await app.prisma.user.delete({ where: { id } });
        return reply.code(204).send();
    });
}
