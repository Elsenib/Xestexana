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
  } catch {
    reply.code(401).send({
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