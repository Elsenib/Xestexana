import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { UserRole } from "@hospital/shared";

import { env } from "../env.js";

const registerPatientSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  identityNumber: z.string().min(5),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(5),
  gender: z.enum(["FEMALE", "MALE", "OTHER"]),
  birthDate: z.string().datetime(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional()
});

const bootstrapSchema = z.object({
  setupKey: z.string().min(8),
  email: z.string().email(),
  password: z.string().min(8)
});

const resetAdminPasswordSchema = z.object({
  setupKey: z.string().min(8),
  email: z.string().email(),
  newPassword: z.string().min(8)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register-patient", async (request, reply) => {
    const body = registerPatientSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(body.password, 10);

    const patient = await app.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email,
          passwordHash,
          role: "PATIENT"
        }
      });

      return tx.patientProfile.create({
        data: {
          userId: user.id,
          identityNumber: body.identityNumber,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          gender: body.gender,
          birthDate: new Date(body.birthDate),
          bloodType: body.bloodType,
          allergies: body.allergies,
          chronicConditions: body.chronicConditions
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        }
      });
    });

    const token = await reply.jwtSign(
      {
        sub: patient.user.id,
        role: patient.user.role as UserRole,
        email: patient.user.email
      },
      {
        expiresIn: "12h"
      }
    );

    return reply.code(201).send({
      token,
      user: patient.user,
      patient: {
        id: patient.id,
        fullName: `${patient.firstName} ${patient.lastName}`
      }
    });
  });

  app.post("/auth/bootstrap-admin", async (request, reply) => {
    const body = bootstrapSchema.parse(request.body);

    if (body.setupKey !== env.ADMIN_SETUP_KEY) {
      return reply.code(403).send({
        message: "Qurulum acari yanlisdir."
      });
    }

    const existingAdmin = await app.prisma.user.findFirst({
      where: { role: "ADMIN" }
    });

    if (existingAdmin) {
      return reply.code(409).send({
        message: "Admin istifadeci artiq movcuddur."
      });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const admin = await app.prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        role: "ADMIN"
      }
    });

    return reply.code(201).send({
      id: admin.id,
      email: admin.email,
      role: admin.role
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await app.prisma.user.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
        active: true
      }
    });

    if (!user) {
      return reply.code(401).send({
        message: "E-poct veya sifre yanlisdir."
      });
    }

    const isValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!isValid) {
      return reply.code(401).send({
        message: "E-poct veya sifre yanlisdir."
      });
    }

    if (!user.active) {
      return reply.code(401).send({
        message: "Hesab deaktiv edilmisdir."
      });
    }

    const token = await reply.jwtSign(
      {
        sub: user.id,
        role: user.role as UserRole,
        email: user.email
      },
      {
        expiresIn: "12h"
      }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  });

  app.post("/auth/reset-admin-password", async (request, reply) => {
    const body = resetAdminPasswordSchema.parse(request.body);

    if (body.setupKey !== env.ADMIN_SETUP_KEY) {
      return reply.code(403).send({ message: "Qurulum acari yanlisdir." });
    }

    const admin = await app.prisma.user.findFirst({
      where: { email: body.email, role: "ADMIN" }
    });

    if (!admin) {
      return reply.code(404).send({ message: "Bu e-poctla admin tapilmadi." });
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10);
    await app.prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash }
    });

    return { message: "Admin sifresi ugurla sifirlandi." };
  });

  app.post(
    "/auth/change-password",
    {
      preHandler: [app.authenticate]
    },
    async (request, reply) => {
      const body = changePasswordSchema.parse(request.body);
      const userId = request.user.sub;

      if (!userId) {
        return reply.code(401).send({ message: "Giriş tələb olunur." });
      }

      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true }
      });

      if (!user) {
        return reply.code(404).send({ message: "İstifadəçi tapılmadı." });
      }

      const isValid = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!isValid) {
        return reply.code(400).send({ message: "Cari şifrə yanlışdır." });
      }

      const newPasswordHash = await bcrypt.hash(body.newPassword, 10);
      await app.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

      return { message: "Şifrə uğurla dəyişdirildi." };
    }
  );

  app.get(
    "/auth/me",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const userId = request.user.sub;

      if (!userId) {
        return {
          message: "Token daxilinde istifadeci identifikatoru tapilmadi."
        };
      }

      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          active: true,
          createdAt: true
        }
      });

      return user;
    }
  );
}