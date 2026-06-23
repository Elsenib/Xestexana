import type { FastifyInstance } from "fastify";
import { z } from "zod";

export async function notificationRoutes(app: FastifyInstance) {
  app.get(
    "/notifications/jobs",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN", "ADMIN", "CALL_CENTER"])] },
    async (request) => {
      const query = z.object({ take: z.coerce.number().int().min(1).max(100).default(50) }).parse(request.query);
      const rows = await app.prisma.notificationJob.findMany({
        where: { clinicId: request.user.clinicId },
        orderBy: { scheduledAt: "desc" },
        take: query.take,
      });
      return rows.map((row) => ({
        id: row.id,
        type: row.type,
        channel: row.channel,
        recipient: row.recipient,
        status: row.status,
        scheduledAt: row.scheduledAt.toISOString(),
        sentAt: row.sentAt?.toISOString() ?? null,
        error: row.error,
        payload: row.payload,
      }));
    },
  );

  app.post(
    "/notifications/schedule-appointment-reminders",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN", "ADMIN", "CALL_CENTER"])] },
    async (request, reply) => {
      const clinicId = request.user.clinicId;
      const tomorrowStart = new Date();
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const appointments = await app.prisma.appointment.findMany({
        where: {
          clinicId,
          startsAt: { gte: tomorrowStart, lte: tomorrowEnd },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        include: {
          patient: { select: { phone: true, firstName: true, lastName: true } },
        },
      });

      let created = 0;
      for (const appointment of appointments) {
        const duplicate = await app.prisma.notificationJob.findFirst({
          where: {
            clinicId,
            type: "APPOINTMENT_REMINDER",
            recipient: appointment.patient.phone,
            status: { in: ["PENDING", "SENT"] },
          },
        });
        if (duplicate) continue;

        await app.prisma.notificationJob.create({
          data: {
            clinicId,
            type: "APPOINTMENT_REMINDER",
            channel: "SMS",
            recipient: appointment.patient.phone,
            scheduledAt: tomorrowStart,
            payload: {
              appointmentId: appointment.id,
              patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
              startsAt: appointment.startsAt.toISOString(),
            },
          },
        });
        created += 1;
      }

      return reply.send({ created, totalAppointments: appointments.length });
    },
  );

  app.post(
    "/notifications/process-pending",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN", "ADMIN"])] },
    async (request) => {
      const now = new Date();
      const pending = await app.prisma.notificationJob.findMany({
        where: {
          clinicId: request.user.clinicId,
          status: "PENDING",
          scheduledAt: { lte: now },
        },
        take: 50,
      });

      let sent = 0;
      for (const job of pending) {
        await app.prisma.notificationJob.update({
          where: { id: job.id },
          data: { status: "SENT", sentAt: now, error: null },
        });
        sent += 1;
      }

      return { processed: sent };
    },
  );
}
