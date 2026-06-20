import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const createDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  title: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  branch: z.string().min(1),
  roomNumber: z.string().optional(),
  active: z.boolean().default(true),
});

const listQuerySchema = z.object({
  branch: z.string().optional(),
  active: z.coerce.boolean().optional(),
  take: z.coerce.number().int().min(1).max(200).default(50),
});

export async function doctorRoutes(app: FastifyInstance) {
  app.get(
    "/doctors/me/dashboard",
    {
      preHandler: [app.authenticate, app.authorize(["DOCTOR"])],
    },
    async (request, reply) => {
      const userId = request.user.sub;
      if (!userId) {
        return reply.code(401).send({
          message: "Giriş tələb olunur.",
        });
      }

      const doctor = await app.prisma.doctorProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              email: true,
            },
          },
          appointments: {
            include: {
              patient: {
                include: {
                  medicalRecords: {
                    orderBy: {
                      createdAt: "desc",
                    },
                    take: 1,
                  },
                },
              },
            },
            orderBy: {
              startsAt: "asc",
            },
            take: 50,
          },
        },
      });

      if (!doctor) {
        return reply.code(404).send({
          message: "Həkim profili tapılmadı.",
        });
      }

      const patientMap = new Map<
        string,
        {
          id: string;
          fullName: string;
          identityNumber: string;
          phone: string;
          gender: string;
          birthDate: string;
          latestRecord: {
            diagnosis: string;
            treatmentPlan: string;
            prescribedBy: string;
            createdAt: string;
          } | null;
        }
      >();

      for (const appointment of doctor.appointments) {
        const latestRecord = appointment.patient.medicalRecords[0];
        if (!patientMap.has(appointment.patient.id)) {
          patientMap.set(appointment.patient.id, {
            id: appointment.patient.id,
            fullName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
            identityNumber: appointment.patient.identityNumber,
            phone: appointment.patient.phone,
            gender: appointment.patient.gender,
            birthDate: appointment.patient.birthDate.toISOString(),
            latestRecord: latestRecord
              ? {
                  diagnosis: latestRecord.diagnosis,
                  treatmentPlan: latestRecord.treatmentPlan,
                  prescribedBy: latestRecord.prescribedBy,
                  createdAt: latestRecord.createdAt.toISOString(),
                }
              : null,
          });
        }
      }

      return {
        doctor: {
          id: doctor.id,
          email: doctor.user.email,
          fullName: `${doctor.title} ${doctor.firstName} ${doctor.lastName}`,
          branch: doctor.branch,
          roomNumber: doctor.roomNumber,
          active: doctor.active,
        },
        appointments: doctor.appointments.map(
          (appointment: {
            id: string;
            patient: any;
            startsAt: Date;
            endsAt: Date;
            status: string;
            channel: string;
            notes: string | null;
          }) => ({
            id: appointment.id,
            patientId: appointment.patient.id,
            patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
            identityNumber: appointment.patient.identityNumber,
            phone: appointment.patient.phone,
            startsAt: appointment.startsAt.toISOString(),
            endsAt: appointment.endsAt.toISOString(),
            status: appointment.status,
            channel: appointment.channel,
            notes: appointment.notes,
          }),
        ),
        patients: Array.from(patientMap.values()),
      };
    },
  );

  app.get(
    "/doctors",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN", "CALL_CENTER", "NURSE", "DOCTOR", "PATIENT"])],
    },
    async (request) => {
      const query = listQuerySchema.parse(request.query);
      const clinicId = request.user.clinicId; // ✅ əlavə edildi

      const rows = await app.prisma.doctorProfile.findMany({
        where: {
          clinicId, // ✅ yalnız öz klinikasının həkimləri
          ...(query.branch ? { branch: query.branch } : {}),
          ...(query.active === undefined ? {} : { active: query.active }),
        },
        include: {
          user: { select: { email: true } },
        },
        orderBy: [{ branch: "asc" }, { lastName: "asc" }],
        take: query.take,
      });

      return rows.map(
        (row: {
          id: string;
          user: { email: string };
          title: string;
          firstName: string;
          lastName: string;
          branch: string;
          roomNumber: string | null;
          active: boolean;
          createdAt: Date;
        }) => ({
          id: row.id,
          email: row.user.email,
          fullName: `${row.title} ${row.firstName} ${row.lastName}`,
          title: row.title,
          firstName: row.firstName,
          lastName: row.lastName,
          branch: row.branch,
          roomNumber: row.roomNumber ?? "",
          active: row.active,
          createdAt: row.createdAt,
        }),
      );
    },
  );

  app.post(
    "/doctors",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN"])],
    },
    async (request, reply) => {
      const body = createDoctorSchema.parse(request.body);
      const passwordHash = await bcrypt.hash(body.password, 10);

      const doctor = await app.prisma.$transaction(async (tx: any) => {
        const user = await tx.user.create({
          data: {
            email: body.email,
            passwordHash,
            role: "DOCTOR",
            clinicId: request.user.clinicId,
          },
        });

        return tx.doctorProfile.create({
          data: {
            userId: user.id,
            clinicId: request.user.clinicId,
            title: body.title,
            firstName: body.firstName,
            lastName: body.lastName,
            branch: body.branch,
            roomNumber: body.roomNumber,
            active: body.active,
          },
        });
      });

      return reply.code(201).send({
        id: doctor.id,
      });
    },
  );

  app.patch(
    "/doctors/:id/deactivate",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const doctor = await app.prisma.doctorProfile.findFirst({
        where: { id, clinicId: request.user.clinicId },
      });
      if (!doctor) return reply.code(404).send({ message: "Hekim tapilmadi." });
      await app.prisma.$transaction([
        app.prisma.doctorProfile.update({
          where: { id },
          data: { active: false },
        }),
        app.prisma.user.update({
          where: { id: doctor.userId },
          data: { active: false },
        }),
      ]);
      return { message: "Hekim deaktiv edildi." };
    },
  );

  app.delete(
    "/doctors/:id",
    { preHandler: [app.authenticate, app.authorize(["ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const doctor = await app.prisma.doctorProfile.findFirst({
        where: { id, clinicId: request.user.clinicId },
      });
      if (!doctor) return reply.code(404).send({ message: "Hekim tapilmadi." });

      const activeAppointments = await app.prisma.appointment.count({
        where: {
          doctorId: id,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      });

      if (activeAppointments > 0) {
        return reply.code(400).send({
          message: "Bu hekimi silmek mümkün deyil, çünki aktiv randevuları var.",
        });
      }

      await app.prisma.user.delete({ where: { id: doctor.userId } });

      return { message: "Hekim uğurla silindi." };
    },
  );
}
