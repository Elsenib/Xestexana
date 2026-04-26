import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { AppointmentSummary } from "@hospital/shared";

type AppointmentWithDoctor = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  channel: string;
  doctor: {
    title: string;
    firstName: string;
    lastName: string;
    branch: string;
  };
};

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

export async function appointmentRoutes(app: FastifyInstance) {
  app.get(
    "/appointments/availability",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
    const query = listQuerySchema.parse(request.query);

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const appointments: AppointmentWithDoctor[] = await app.prisma.appointment.findMany({
      where: {
        startsAt: {
          gte: startDate,
          lte: endDate
        },
        ...(query.doctorId ? { doctorId: query.doctorId } : {}),
        ...(query.branch ? { doctor: { branch: query.branch } } : {})
      },
      include: {
        doctor: true
      },
      orderBy: {
        startsAt: "asc"
      },
      take: 200
    });

      return appointments.map((appointment): AppointmentSummary => ({
        id: appointment.id,
        doctorName: `${appointment.doctor.title} ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        branch: appointment.doctor.branch,
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        status: appointment.status as AppointmentSummary["status"],
        channel: appointment.channel as AppointmentSummary["channel"]
      }));
    }
  );

  app.post(
    "/appointments",
    {
      preHandler: [app.authenticate, app.authorize(["ADMIN", "CALL_CENTER", "PATIENT"])]
    },
    async (request, reply) => {
    const body = createBodySchema.parse(request.body);
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);

    let patientId = body.patientId;

    if (request.user.role === "PATIENT") {
      const userId = request.user.sub;
      const patient = userId
        ? await app.prisma.patientProfile.findUnique({
            where: { userId },
            select: { id: true }
          })
        : null;

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

    const conflict = await app.prisma.appointment.findFirst({
      where: {
        doctorId: body.doctorId,
        status: {
          in: ["PENDING", "CONFIRMED"]
        },
        OR: [
          {
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt }
          }
        ]
      }
    });

    if (conflict) {
      return reply.code(409).send({
        message: "Bu saat aralığında həkimin dolu randevusu var."
      });
    }

    const appointment = await app.prisma.appointment.create({
      data: {
        patientId,
        doctorId: body.doctorId,
        clinicId: request.user.clinicId,
        startsAt,
        endsAt,
        channel: body.channel,
        notes: body.notes,
        status: "CONFIRMED"
      }
    });

      return reply.code(201).send({
        id: appointment.id,
        status: appointment.status
      });
    }
  );
}