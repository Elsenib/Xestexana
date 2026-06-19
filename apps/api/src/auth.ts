import type { FastifyReply, FastifyRequest } from "fastify";

import type { UserRole } from "@hospital/shared";

export interface JwtUserPayload {
  sub?: string;
  role: UserRole;
  email: string;
  clinicId: string;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify<JwtUserPayload>();

    if (!request.user.sub) {
      return reply.code(401).send({
        message: "Etibarsız giriş məlumatı."
      });
    }

    const user = await request.server.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        active: true,
        role: true,
        email: true,
        clinicId: true,
        clinic: { select: { active: true } }
      }
    });

    if (
      !user ||
      !user.active ||
      !user.clinic.active ||
      user.role !== request.user.role ||
      user.email !== request.user.email ||
      user.clinicId !== request.user.clinicId
    ) {
      return reply.code(401).send({
        message: "Sessiya etibarsızdır və ya hesab deaktiv edilib."
      });
    }
  } catch {
    return reply.code(401).send({
      message: "Giriş tələb olunur."
    });
  }
}

export function authorize(allowedRoles: UserRole[]) {
  return async function checkRole(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({
        message: "Giriş tələb olunur."
      });
    }

    const role = (request.user as JwtUserPayload).role;
    if (!allowedRoles.includes(role)) {
      return reply.code(403).send({
        message: "Bu əməliyyat üçün icazəniz yoxdur."
      });
    }
  };
}
