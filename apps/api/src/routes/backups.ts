import type { FastifyInstance } from "fastify";
import { z } from "zod";

const backupRoles = ["SUPER_ADMIN", "ADMIN", "MANAGEMENT"] as const;

function isoOrNull(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function backupRoutes(app: FastifyInstance) {
  app.get(
    "/backups",
    { preHandler: [app.authenticate, app.authorize([...backupRoles])] },
    async (request) => {
      const jobs = await app.prisma.backupJob.findMany({
        where: { clinicId: request.user.clinicId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { createdBy: { select: { email: true, role: true } } },
      });

      return jobs.map((job) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        storageKey: job.storageKey,
        summary: job.summary,
        error: job.error,
        startedAt: isoOrNull(job.startedAt),
        completedAt: isoOrNull(job.completedAt),
        createdAt: job.createdAt.toISOString(),
        createdBy: job.createdBy.email,
      }));
    },
  );

  app.get(
    "/backups/summary",
    { preHandler: [app.authenticate, app.authorize([...backupRoles])] },
    async (request) => {
      return buildBackupSummary(app, request.user.clinicId);
    },
  );

  app.post(
    "/backups",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN", "ADMIN"])] },
    async (request, reply) => {
      const body = z.object({ type: z.enum(["MANUAL", "PRE_UPDATE"]).default("MANUAL") }).parse(request.body ?? {});
      const userId = request.user.sub;
      if (!userId) return reply.code(401).send({ message: "Giriş tələb olunur." });

      const startedAt = new Date();
      const created = await app.prisma.backupJob.create({
        data: {
          clinicId: request.user.clinicId,
          createdByUserId: userId,
          type: body.type,
          status: "RUNNING",
          startedAt,
        },
      });

      try {
        const summary = await buildBackupSummary(app, request.user.clinicId);
        const completedAt = new Date();
        const storageKey = `skeleton/${request.user.clinicId}/${created.id}.json`;
        const job = await app.prisma.backupJob.update({
          where: { id: created.id },
          data: {
            status: "COMPLETED",
            summary,
            storageKey,
            completedAt,
          },
        });

        return reply.code(201).send({
          id: job.id,
          status: job.status,
          storageKey,
          summary,
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Backup yaradıla bilmədi.";
        await app.prisma.backupJob.update({
          where: { id: created.id },
          data: { status: "FAILED", error: message, completedAt: new Date() },
        });
        return reply.code(500).send({ message });
      }
    },
  );
}

async function buildBackupSummary(app: FastifyInstance, clinicId: string) {
  const [
    users,
    patients,
    appointments,
    clinicalEncounters,
    treatmentPlans,
    patientFiles,
    leads,
    warranties,
    accountEntries,
    stockMovements,
  ] = await app.prisma.$transaction([
    app.prisma.user.count({ where: { clinicId } }),
    app.prisma.patientProfile.count({ where: { clinicId } }),
    app.prisma.appointment.count({ where: { clinicId } }),
    app.prisma.clinicalEncounter.count({ where: { clinicId } }),
    app.prisma.treatmentPlan.count({ where: { clinicId } }),
    app.prisma.patientFile.count({ where: { clinicId } }),
    app.prisma.lead.count({ where: { clinicId } }),
    app.prisma.patientWarranty.count({ where: { clinicId } }),
    app.prisma.patientAccountEntry.count({ where: { clinicId } }),
    app.prisma.stockMovement.count({ where: { clinicId } }),
  ]);

  return {
    mode: "SKELETON",
    note: "Bu mərhələ real dump faylı deyil; backup axınının DB/API/UI skeletidir.",
    counts: {
      users,
      patients,
      appointments,
      clinicalEncounters,
      treatmentPlans,
      patientFiles,
      leads,
      warranties,
      accountEntries,
      stockMovements,
    },
  };
}
