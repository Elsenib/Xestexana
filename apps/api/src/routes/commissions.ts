import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { closeCommissionPeriod, recordCommissionPayout } from "../services/commission-service.js";
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  actorFromRequest,
  auditRequestMeta,
  recordAudit,
} from "../services/audit-service.js";

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
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const closePeriodSchema = z.object({
  startDate: dateField,
  endDate: dateField,
  note: z.string().trim().max(500).nullable().optional(),
});
const payoutSchema = z.object({
  amount: z.coerce.number().positive().max(999999999),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]),
  reference: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

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

  app.get(
    "/commissions/periods",
    { preHandler: [app.authenticate, app.authorize([...commissionRoles])] },
    async (request) => {
      const periods = await app.prisma.commissionPeriod.findMany({
        where: { clinicId: request.user.clinicId },
        orderBy: { endDate: "desc" },
        take: 36,
        include: {
          closedBy: { select: { email: true } },
          settlements: {
            orderBy: { earnedAmount: "desc" },
            include: {
              doctor: { select: { email: true, doctorProfile: true } },
              payouts: { orderBy: { paidAt: "desc" } },
            },
          },
        },
      });
      return periods.map((period) => ({
        id: period.id,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        totalAmount: money(period.totalAmount),
        status: period.status,
        note: period.note,
        closedAt: period.closedAt.toISOString(),
        closedBy: period.closedBy.email,
        settlements: period.settlements.map((settlement) => ({
          id: settlement.id,
          doctorName: settlement.doctor.doctorProfile
            ? `${settlement.doctor.doctorProfile.title} ${settlement.doctor.doctorProfile.firstName} ${settlement.doctor.doctorProfile.lastName}`
            : settlement.doctor.email,
          earnedAmount: money(settlement.earnedAmount),
          paidAmount: money(settlement.paidAmount),
          status: settlement.status,
          payouts: settlement.payouts.map((payout) => ({
            id: payout.id,
            amount: money(payout.amount),
            paymentMethod: payout.paymentMethod,
            reference: payout.reference,
            note: payout.note,
            paidAt: payout.paidAt.toISOString(),
          })),
        })),
      }));
    },
  );

  app.post(
    "/commissions/periods/close",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN"])] },
    async (request, reply) => {
      const body = closePeriodSchema.parse(request.body);
      try {
        const period = await app.prisma.$transaction((tx) =>
          closeCommissionPeriod(tx, {
            clinicId: request.user.clinicId,
            startDate: new Date(`${body.startDate}T00:00:00.000Z`),
            endDate: new Date(`${body.endDate}T00:00:00.000Z`),
            closedByUserId: request.user.sub!,
            note: body.note ?? null,
          }),
        );
        await recordAudit(app.prisma, {
          ...actorFromRequest(request),
          ...auditRequestMeta(request),
          category: AUDIT_CATEGORIES.FINANCE,
          action: AUDIT_ACTIONS.COMMISSION_PERIOD_CLOSED,
          entityType: "CommissionPeriod",
          entityId: period.id,
          summary: `Komissiya periodu bağlandı · ${period.totalAmount.toNumber().toFixed(2)} ₼`,
          details: { startDate: body.startDate, endDate: body.endDate, settlements: period.settlements.length },
        });
        return reply.code(201).send({ id: period.id, totalAmount: period.totalAmount.toNumber() });
      } catch (error) {
        if (error instanceof Error) {
          const messages: Record<string, string> = {
            INVALID_PERIOD: "Periodun tarix aralığı düzgün deyil.",
            FUTURE_PERIOD: "Gələcək period bağlana bilməz.",
            PERIOD_OVERLAP: "Bu tarix aralığı əvvəl bağlanmış komissiya periodu ilə kəsişir.",
          };
          if (messages[error.message]) return reply.code(409).send({ message: messages[error.message] });
        }
        throw error;
      }
    },
  );

  app.post(
    "/commissions/settlements/:id/payout",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN"])] },
    async (request, reply) => {
      const { id } = ruleParams.parse(request.params);
      const body = payoutSchema.parse(request.body);
      try {
        const payout = await app.prisma.$transaction((tx) =>
          recordCommissionPayout(tx, {
            clinicId: request.user.clinicId,
            settlementId: id,
            amount: body.amount,
            paymentMethod: body.paymentMethod,
            reference: body.reference ?? null,
            note: body.note ?? null,
            paidByUserId: request.user.sub!,
          }),
        );
        await recordAudit(app.prisma, {
          ...actorFromRequest(request),
          ...auditRequestMeta(request),
          category: AUDIT_CATEGORIES.FINANCE,
          action: AUDIT_ACTIONS.COMMISSION_PAYOUT_RECORDED,
          entityType: "CommissionPayout",
          entityId: payout.id,
          summary: `Həkim komissiyası ödənildi · ${payout.amount.toNumber().toFixed(2)} ₼`,
          details: { settlementId: id, paymentMethod: body.paymentMethod },
        });
        return reply.code(201).send({ id: payout.id });
      } catch (error) {
        if (error instanceof Error) {
          const messages: Record<string, string> = {
            SETTLEMENT_NOT_FOUND: "Həkim hesablaşması tapılmadı.",
            PAYOUT_EXCEEDS_BALANCE: "Ödəniş məbləği qalan komissiyadan çoxdur.",
            CASH_SESSION_REQUIRED: "Nağd komissiya ödənişi üçün kassa növbəsi açılmalıdır.",
          };
          if (messages[error.message]) return reply.code(409).send({ message: messages[error.message] });
        }
        throw error;
      }
    },
  );

}
