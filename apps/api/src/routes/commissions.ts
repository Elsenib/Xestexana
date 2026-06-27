import type { FastifyInstance } from "fastify";
import { z } from "zod";

const commissionRoles = ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "MANAGEMENT"] as const;

const money = (value: { toNumber: () => number } | number | null | undefined) =>
  typeof value === "number" ? value : value?.toNumber() ?? 0;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const createRuleSchema = z.object({
  doctorUserId: z.string().min(1).nullable().optional(),
  serviceId: z.string().min(1).nullable().optional(),
  percent: z.coerce.number().min(0).max(100),
});

const ruleParams = z.object({ id: z.string().min(1) });

async function ensureDoctor(app: FastifyInstance, clinicId: string, doctorUserId: string) {
  return app.prisma.user.findFirst({
    where: {
      id: doctorUserId,
      clinicId,
      active: true,
      role: "DOCTOR",
      doctorProfile: { active: true },
    },
    include: { doctorProfile: true },
  });
}

export async function commissionRoutes(app: FastifyInstance) {
  app.get(
    "/commissions/doctors",
    { preHandler: [app.authenticate, app.authorize([...commissionRoles])] },
    async (request) => {
      const doctors = await app.prisma.user.findMany({
        where: {
          clinicId: request.user.clinicId,
          active: true,
          role: "DOCTOR",
          doctorProfile: { active: true },
        },
        orderBy: { email: "asc" },
        include: { doctorProfile: true },
      });

      return doctors.map((doctor) => ({
        userId: doctor.id,
        email: doctor.email,
        name: doctor.doctorProfile
          ? `${doctor.doctorProfile.title} ${doctor.doctorProfile.firstName} ${doctor.doctorProfile.lastName}`
          : doctor.email,
        branch: doctor.doctorProfile?.branch ?? null,
      }));
    },
  );

  app.get(
    "/commissions/summary",
    { preHandler: [app.authenticate, app.authorize([...commissionRoles])] },
    async (request) => {
      const [rules, entries] = await app.prisma.$transaction([
        app.prisma.commissionRule.findMany({
          where: { clinicId: request.user.clinicId },
          orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
          take: 80,
          include: {
            doctor: { select: { email: true, doctorProfile: true } },
            service: { select: { code: true, name: true } },
          },
        }),
        app.prisma.commissionEntry.findMany({
          where: { clinicId: request.user.clinicId },
          orderBy: { createdAt: "desc" },
          take: 120,
          include: {
            doctor: { select: { email: true, doctorProfile: true } },
            patient: { select: { firstName: true, lastName: true, phone: true } },
          },
        }),
      ]);

      const totalPotential = entries.reduce((sum, entry) => sum + money(entry.amount), 0);
      const totalEarned = entries.reduce((sum, entry) => sum + money(entry.earnedAmount), 0);

      return {
        totals: {
          pending: roundMoney(totalPotential - totalEarned),
          earned: roundMoney(totalEarned),
          entries: entries.length,
          activeRules: rules.filter((rule) => rule.active).length,
        },
        rules: rules.map((rule) => ({
          id: rule.id,
          doctorUserId: rule.doctorUserId,
          doctorName: rule.doctor?.doctorProfile
            ? `${rule.doctor.doctorProfile.title} ${rule.doctor.doctorProfile.firstName} ${rule.doctor.doctorProfile.lastName}`
            : rule.doctor?.email ?? "Ümumi qayda",
          serviceName: rule.service ? `${rule.service.code} · ${rule.service.name}` : "Bütün xidmətlər",
          percent: money(rule.percent),
          active: rule.active,
          updatedAt: rule.updatedAt.toISOString(),
        })),
        entries: entries.map((entry) => ({
          id: entry.id,
          doctorName: entry.doctor.doctorProfile
            ? `${entry.doctor.doctorProfile.title} ${entry.doctor.doctorProfile.firstName} ${entry.doctor.doctorProfile.lastName}`
            : entry.doctor.email,
          patientName: entry.patient ? `${entry.patient.firstName} ${entry.patient.lastName}` : null,
          patientPhone: entry.patient?.phone ?? null,
          baseAmount: money(entry.baseAmount),
          percent: money(entry.percent),
          amount: money(entry.amount),
          paidBaseAmount: money(entry.paidBaseAmount),
          earnedAmount: money(entry.earnedAmount),
          status: entry.status,
          sourceType: entry.sourceType,
          note: entry.note,
          createdAt: entry.createdAt.toISOString(),
        })),
      };
    },
  );

  app.post(
    "/commissions/rules",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN"])] },
    async (request, reply) => {
      const body = createRuleSchema.parse(request.body);

      if (body.doctorUserId) {
        const doctor = await ensureDoctor(app, request.user.clinicId, body.doctorUserId);
        if (!doctor) return reply.code(400).send({ message: "Aktiv həkim tapılmadı." });
      }

      if (body.serviceId) {
        const service = await app.prisma.service.findFirst({
          where: { id: body.serviceId, clinicId: request.user.clinicId, active: true },
          select: { id: true },
        });
        if (!service) return reply.code(400).send({ message: "Aktiv xidmət tapılmadı." });
      }

      const rule = await app.prisma.commissionRule.create({
        data: {
          clinicId: request.user.clinicId,
          doctorUserId: body.doctorUserId ?? null,
          serviceId: body.serviceId ?? null,
          percent: body.percent,
        },
      });

      return reply.code(201).send({ id: rule.id });
    },
  );

  app.patch(
    "/commissions/rules/:id/active",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN"])] },
    async (request, reply) => {
      const { id } = ruleParams.parse(request.params);
      const body = z.object({ active: z.boolean() }).parse(request.body);
      const rule = await app.prisma.commissionRule.findFirst({
        where: { id, clinicId: request.user.clinicId },
        select: { id: true },
      });
      if (!rule) return reply.code(404).send({ message: "Faiz qaydası tapılmadı." });

      await app.prisma.commissionRule.update({ where: { id }, data: { active: body.active } });
      return { id, active: body.active };
    },
  );

}
