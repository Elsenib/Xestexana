import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { AppointmentSummary } from "@hospital/shared";

type AppointmentWithRelations = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  channel: string;
  notes: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    identityNumber: string;
  };
  doctor: {
    id: string;
    title: string;
    firstName: string;
    lastName: string;
    branch: string;
    roomNumber: string | null;
  };
};

const appointmentStatuses = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_TREATMENT",
  "COMPLETED",
  "CANCELED",
  "NO_SHOW"
] as const;

const staffRoles = ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "NURSE", "DOCTOR"] as const;
const editorRoles = ["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "NURSE"] as const;

const listQuerySchema = z.object({
  branch: z.string().optional(),
  doctorId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
});

const createBodySchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  channel: z.enum(["web", "mobile", "call-center"]),
  notes: z.string().max(500).optional()
});

const statusBodySchema = z.object({
  status: z.enum(appointmentStatuses),
  note: z.string().max(500).optional()
});

const rescheduleBodySchema = z.object({
  doctorId: z.string().min(1).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  notes: z.string().max(500).optional()
});

function mapAppointment(appointment: AppointmentWithRelations) {
  return {
    id: appointment.id,
    patientId: appointment.patient.id,
    patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    patientPhone: appointment.patient.phone,
    identityNumber: appointment.patient.identityNumber,
    doctorId: appointment.doctor.id,
    doctorName: `${appointment.doctor.title} ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
    branch: appointment.doctor.branch,
    roomNumber: appointment.doctor.roomNumber ?? "",
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    status: appointment.status,
    channel: appointment.channel,
    notes: appointment.notes
  };
}

export async function appointmentRoutes(app: FastifyInstance) {
  app.get(
    "/appointments",
    {
      preHandler: [app.authenticate, app.authorize([...staffRoles])]
    },
    async (request) => {
      const query = listQuerySchema.parse(request.query);
      const clinicId = request.user.clinicId;
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);

      const appointments = await app.prisma.appointment.findMany({
        where: {
          clinicId,
          startsAt: {
            gte: startDate,
            lte: endDate
          },
          doctor: {
            ...(request.user.role === "DOCTOR" ? { userId: request.user.sub } : {}),
            ...(query.doctorId ? { id: query.doctorId } : {}),
            ...(query.branch ? { branch: query.branch } : {})
          }
        },
        include: {
          patient: true,
          doctor: true
        },
        orderBy: {
          startsAt: "asc"
        },
        take: 500
      });

      return appointments.map(mapAppointment);
    }
  );

  app.get(
    "/appointments/availability",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const query = listQuerySchema.parse(request.query);
      const clinicId = request.user.clinicId;
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);

      const appointments = await app.prisma.appointment.findMany({
        where: {
          clinicId,
          startsAt: {
            gte: startDate,
            lte: endDate
          },
          ...(query.doctorId ? { doctorId: query.doctorId } : {}),
          ...(query.branch ? { doctor: { branch: query.branch } } : {})
        },
        include: {
          patient: true,
          doctor: true
        },
        orderBy: {
          startsAt: "asc"
        },
        take: 200
      });

      return appointments.map((appointment): AppointmentSummary => {
        const mapped = mapAppointment(appointment);
        return {
          id: mapped.id,
          doctorName: mapped.doctorName,
          branch: mapped.branch,
          startsAt: mapped.startsAt,
          endsAt: mapped.endsAt,
          status: mapped.status as AppointmentSummary["status"],
          channel: mapped.channel as AppointmentSummary["channel"]
        };
      });
    }
  );

  app.post(
    "/appointments",
    {
      preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN", "ADMIN", "CALL_CENTER", "PATIENT"])]
    },
    async (request, reply) => {
      const body = createBodySchema.parse(request.body);
      const startsAt = new Date(body.startsAt);
      const endsAt = new Date(body.endsAt);
      let patientId = body.patientId;

      if (request.user.role === "PATIENT") {
        const patient = await app.prisma.patientProfile.findUnique({
          where: { userId: request.user.sub },
          select: { id: true }
        });

        if (!patient) {
          return reply.code(403).send({
            message: "Pasiyent profili tapılmadı."
          });
        }

        patientId = patient.id;
      }

      if (startsAt <= new Date()) {
        return reply.code(400).send({
          message: "Randevu keçmiş və ya cari zaman üçün yaradıla bilməz."
        });
      }

      if (endsAt <= startsAt) {
        return reply.code(400).send({
          message: "Bitmə saatı başlanğıc saatından sonra olmalıdır."
        });
      }

      const clinicId = request.user.clinicId;
      const [patient, doctor] = await Promise.all([
        app.prisma.patientProfile.findFirst({
          where: { id: patientId, clinicId },
          select: { id: true }
        }),
        app.prisma.doctorProfile.findFirst({
          where: { id: body.doctorId, clinicId, active: true },
          select: { id: true }
        })
      ]);

      if (!patient || !doctor) {
        return reply.code(400).send({
          message: "Pasiyent və ya həkim bu klinikaya aid deyil."
        });
      }

      try {
        const appointment = await app.prisma.$transaction(
          async (tx) => {
            const conflict = await tx.appointment.findFirst({
              where: {
                clinicId,
                doctorId: body.doctorId,
                status: {
                  in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_TREATMENT"]
                },
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt }
              }
            });

            if (conflict) {
              return null;
            }

            return tx.appointment.create({
              data: {
                patientId,
                doctorId: body.doctorId,
                clinicId,
                startsAt,
                endsAt,
                channel: body.channel,
                notes: body.notes,
                status: "CONFIRMED"
              }
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
          }
        );

        if (!appointment) {
          return reply.code(409).send({
            message: "Bu saat aralığında həkimin dolu randevusu var."
          });
        }

        return reply.code(201).send({
          id: appointment.id,
          status: appointment.status
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
          return reply.code(409).send({
            message: "Randevu eyni anda dəyişdirildi. Zəhmət olmasa yenidən yoxlayın."
          });
        }

        throw error;
      }
    }
  );

  app.patch(
    "/appointments/:id/status",
    {
      preHandler: [app.authenticate, app.authorize([...staffRoles])]
    },
    async (request, reply) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = statusBodySchema.parse(request.body);
      const clinicId = request.user.clinicId;

      const appointment = await app.prisma.appointment.findFirst({
        where: {
          id: params.id,
          clinicId,
          ...(request.user.role === "DOCTOR" ? { doctor: { userId: request.user.sub } } : {})
        },
        include: {
          patient: true,
          doctor: true
        }
      });

      if (!appointment) {
        return reply.code(404).send({ message: "Randevu tapılmadı." });
      }

      const allowedNext: Record<string, string[]> = {
        PENDING: ["CONFIRMED", "CANCELED", "NO_SHOW"],
        CONFIRMED: ["CHECKED_IN", "CANCELED", "NO_SHOW"],
        CHECKED_IN: ["IN_TREATMENT", "CANCELED", "NO_SHOW"],
        IN_TREATMENT: ["COMPLETED", "CANCELED"],
        COMPLETED: [],
        CANCELED: [],
        NO_SHOW: []
      };

      if (body.status !== appointment.status && !allowedNext[appointment.status]?.includes(body.status)) {
        return reply.code(400).send({
          message: `Randevu statusu ${appointment.status} vəziyyətindən ${body.status} vəziyyətinə dəyişdirilə bilməz.`
        });
      }

      if (request.user.role === "DOCTOR" && !["IN_TREATMENT", "COMPLETED"].includes(body.status)) {
        return reply.code(403).send({
          message: "Həkim yalnız müalicəyə başlama və tamamlama statuslarını dəyişə bilər."
        });
      }

      const updated = await app.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: body.status,
          notes: body.note ? [appointment.notes, body.note].filter(Boolean).join("\n") : appointment.notes
        },
        include: {
          patient: true,
          doctor: true
        }
      });

      return mapAppointment(updated);
    }
  );

  app.patch(
    "/appointments/:id/reschedule",
    {
      preHandler: [app.authenticate, app.authorize([...editorRoles])]
    },
    async (request, reply) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = rescheduleBodySchema.parse(request.body);
      const clinicId = request.user.clinicId;
      const startsAt = new Date(body.startsAt);
      const endsAt = new Date(body.endsAt);

      if (startsAt <= new Date() || endsAt <= startsAt) {
        return reply.code(400).send({
          message: "Yeni randevu saatı düzgün deyil."
        });
      }

      const existing = await app.prisma.appointment.findFirst({
        where: { id: params.id, clinicId }
      });

      if (!existing) {
        return reply.code(404).send({ message: "Randevu tapılmadı." });
      }

      if (["COMPLETED", "CANCELED", "NO_SHOW"].includes(existing.status)) {
        return reply.code(400).send({
          message: "Bağlanmış randevunun vaxtını dəyişmək olmaz."
        });
      }

      const doctorId = body.doctorId ?? existing.doctorId;
      const doctor = await app.prisma.doctorProfile.findFirst({
        where: { id: doctorId, clinicId, active: true },
        select: { id: true }
      });

      if (!doctor) {
        return reply.code(400).send({ message: "Həkim tapılmadı və ya aktiv deyil." });
      }

      const conflict = await app.prisma.appointment.findFirst({
        where: {
          id: { not: existing.id },
          clinicId,
          doctorId,
          status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_TREATMENT"] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt }
        }
      });

      if (conflict) {
        return reply.code(409).send({
          message: "Bu saat aralığında həkimin başqa aktiv randevusu var."
        });
      }

      const updated = await app.prisma.appointment.update({
        where: { id: existing.id },
        data: {
          doctorId,
          startsAt,
          endsAt,
          notes: body.notes ?? existing.notes,
          status: existing.status === "PENDING" ? "CONFIRMED" : existing.status
        },
        include: {
          patient: true,
          doctor: true
        }
      });

      return mapAppointment(updated);
    }
  );
}
