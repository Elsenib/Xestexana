import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  closeFinancePeriod,
  computeCashSessionExpected,
  computeDepositBalance,
  computePatientBalance,
  createEncounterCharges,
  financeReportSummary,
  getClosedThroughDate,
  getOpenCashSession,
  listDebtors,
  PAYMENT_METHODS,
  recordCharge,
  recordDeposit,
  recordPayment,
  recordRefund,
  todayFinanceSummary,
} from "../services/finance-service.js";
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  actorFromRequest,
  auditRequestMeta,
  recordAudit,
} from "../services/audit-service.js";

const financeRoles = ["SUPER_ADMIN", "ADMIN", "CASHIER", "ACCOUNTANT"] as const;
const cashierRoles = ["SUPER_ADMIN", "ADMIN", "CASHIER"] as const;
const receiptReaderRoles = [...financeRoles, "DOCTOR", "NURSE", "CALL_CENTER", "MANAGEMENT"] as const;

const chargeLineSchema = z
  .object({
    serviceId: z.string().min(1).optional(),
    amount: z.coerce.number().positive().max(999999999).optional(),
    quantity: z.coerce.number().positive().max(1000).default(1),
    description: z.string().trim().min(2).max(500),
  })
  .refine((row) => Boolean(row.serviceId || row.amount), {
    message: "Xidmət və ya məbləğ tələb olunur.",
  });

const chargeSchema = z.object({
  patientId: z.string().min(1),
  amount: z.coerce.number().positive().max(999999999).optional(),
  serviceId: z.string().min(1).optional(),
  quantity: z.coerce.number().positive().max(1000).default(1),
  description: z.string().trim().min(2).max(500),
  referenceType: z.string().trim().max(80).nullable().optional(),
  referenceId: z.string().trim().max(80).nullable().optional(),
});

const paymentSchema = z.object({
  patientId: z.string().min(1),
  amount: z.coerce.number().positive().max(999999999),
  paymentMethod: z.enum(PAYMENT_METHODS),
  description: z.string().trim().min(2).max(500).default("Klinika ödənişi"),
});

const openSessionSchema = z.object({
  openingBalance: z.coerce.number().min(0).max(999999999).default(0),
  openNote: z.string().trim().max(500).nullable().optional(),
});

const closeSessionSchema = z.object({
  countedBalance: z.coerce.number().min(0).max(999999999),
  closeNote: z.string().trim().max(500).nullable().optional(),
});

const patientParams = z.object({ patientId: z.string().min(1) });
const sessionParams = z.object({ id: z.string().min(1) });
const encounterParams = z.object({ id: z.string().min(1) });

export async function financeRoutes(app: FastifyInstance) {
  app.get(
    "/finance/summary",
    { preHandler: [app.authenticate, app.authorize([...financeRoles])] },
    async (request) => app.prisma.$transaction((tx) => todayFinanceSummary(tx, request.user.clinicId)),
  );

  app.get(
    "/finance/debtors",
    { preHandler: [app.authenticate, app.authorize([...financeRoles])] },
    async (request) => {
      const query = z.object({ take: z.coerce.number().int().min(1).max(100).default(30) }).parse(request.query);
      return app.prisma.$transaction((tx) => listDebtors(tx, request.user.clinicId, query.take));
    },
  );

  app.get(
    "/finance/cash-sessions/current",
    { preHandler: [app.authenticate, app.authorize([...cashierRoles])] },
    async (request, reply) => {
      const session = await app.prisma.$transaction((tx) => getOpenCashSession(tx, request.user.clinicId));
      if (!session) return reply.code(404).send({ message: "Açıq kassa növbəsi yoxdur." });
      const expected = await app.prisma.$transaction((tx) =>
        computeCashSessionExpected(tx, request.user.clinicId, session.id, session.openingBalance),
      );
      return {
        ...session,
        openingBalance: session.openingBalance.toNumber(),
        expectedBalance: expected,
      };
    },
  );

  app.post(
    "/finance/cash-sessions/open",
    { preHandler: [app.authenticate, app.authorize([...cashierRoles])] },
    async (request, reply) => {
      const body = openSessionSchema.parse(request.body ?? {});
      const userId = request.user.sub!;
      const existing = await getOpenCashSession(app.prisma, request.user.clinicId);
      if (existing) {
        return reply.code(409).send({ message: "Artıq açıq kassa növbəsi var. Əvvəlcə bağlayın." });
      }
      const session = await app.prisma.cashSession.create({
        data: {
          clinicId: request.user.clinicId,
          openedByUserId: userId,
          openingBalance: body.openingBalance,
          openNote: body.openNote ?? null,
        },
      });
      await recordAudit(app.prisma, {
        ...actorFromRequest(request),
        ...auditRequestMeta(request),
        category: AUDIT_CATEGORIES.FINANCE,
        action: AUDIT_ACTIONS.CASH_SESSION_OPENED,
        entityType: "CashSession",
        entityId: session.id,
        summary: `Kassa açıldı · ${body.openingBalance.toFixed(2)} ₼`,
        details: { openingBalance: body.openingBalance, openNote: body.openNote ?? null },
      });
      return reply.code(201).send({ ...session, openingBalance: session.openingBalance.toNumber() });
    },
  );

  app.post(
    "/finance/cash-sessions/:id/close",
    { preHandler: [app.authenticate, app.authorize([...cashierRoles])] },
    async (request, reply) => {
      const { id } = sessionParams.parse(request.params);
      const body = closeSessionSchema.parse(request.body);
      const userId = request.user.sub!;

      const result = await app.prisma.$transaction(async (tx) => {
        const session = await tx.cashSession.findFirst({
          where: { id, clinicId: request.user.clinicId, status: "OPEN" },
        });
        if (!session) return { error: "NOT_FOUND" as const };
        const expected = await computeCashSessionExpected(
          tx,
          request.user.clinicId,
          session.id,
          session.openingBalance,
        );
        return tx.cashSession.update({
          where: { id },
          data: {
            status: "CLOSED",
            closedByUserId: userId,
            expectedBalance: expected,
            countedBalance: body.countedBalance,
            closeNote: body.closeNote ?? null,
            closedAt: new Date(),
          },
        });
      });

      if ("error" in result) {
        return reply.code(404).send({ message: "Açıq kassa növbəsi tapılmadı." });
      }

      const variance = round(
        (result.countedBalance?.toNumber() ?? 0) - (result.expectedBalance?.toNumber() ?? 0),
      );

      await recordAudit(app.prisma, {
        ...actorFromRequest(request),
        ...auditRequestMeta(request),
        category: AUDIT_CATEGORIES.FINANCE,
        action: AUDIT_ACTIONS.CASH_SESSION_CLOSED,
        entityType: "CashSession",
        entityId: result.id,
        summary: `Kassa bağlandı · fərq ${variance.toFixed(2)} ₼`,
        details: {
          expectedBalance: result.expectedBalance?.toNumber() ?? null,
          countedBalance: result.countedBalance?.toNumber() ?? null,
          variance,
        },
      });

      return {
        ...result,
        openingBalance: result.openingBalance.toNumber(),
        expectedBalance: result.expectedBalance?.toNumber() ?? null,
        countedBalance: result.countedBalance?.toNumber() ?? null,
        variance,
      };
    },
  );

  app.get(
    "/finance/patients/:patientId/account",
    { preHandler: [app.authenticate, app.authorize([...financeRoles, "DOCTOR", "NURSE", "CALL_CENTER"])] },
    async (request, reply) => {
      const { patientId } = patientParams.parse(request.params);
      const patient = await app.prisma.patientProfile.findFirst({
        where: { id: patientId, clinicId: request.user.clinicId },
        select: { id: true, firstName: true, lastName: true, phone: true },
      });
      if (!patient) return reply.code(404).send({ message: "Pasiyent tapılmadı." });

      const [balance, entries] = await app.prisma.$transaction(async (tx) => {
        const bal = await computePatientBalance(tx, request.user.clinicId, patientId);
        const rows = await tx.patientAccountEntry.findMany({
          where: { clinicId: request.user.clinicId, patientId },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            service: { select: { name: true, code: true } },
            createdBy: { select: { email: true } },
          },
        });
        return [bal, rows] as const;
      });

      return {
        patient: {
          ...patient,
          fullName: `${patient.firstName} ${patient.lastName}`,
        },
        balance,
        entries: entries.map((row) => ({
          id: row.id,
          entryType: row.entryType,
          direction: row.direction,
          amount: row.amount.toNumber(),
          paymentMethod: row.paymentMethod,
          description: row.description,
          receiptNumber: row.receiptNumber,
          service: row.service,
          createdAt: row.createdAt.toISOString(),
          createdBy: row.createdBy.email,
        })),
      };
    },
  );

  app.post(
    "/finance/charges",
    { preHandler: [app.authenticate, app.authorize([...cashierRoles, "DOCTOR"])] },
    async (request, reply) => {
      const body = chargeSchema.parse(request.body);
      const userId = request.user.sub!;

      try {
        const result = await app.prisma.$transaction(async (tx) => {
          if (body.serviceId) {
            const service = await tx.service.findFirst({
              where: { id: body.serviceId, clinicId: request.user.clinicId, active: true },
            });
            if (!service) return { error: "SERVICE_NOT_FOUND" as const };
            const amount = round(service.price.toNumber() * body.quantity);
            const entry = await recordCharge(tx, {
              clinicId: request.user.clinicId,
              patientId: body.patientId,
              createdByUserId: userId,
              amount,
              serviceId: body.serviceId,
              description: body.description,
              referenceType: body.referenceType ?? null,
              referenceId: body.referenceId ?? null,
            });
            return { entry, balance: await computePatientBalance(tx, request.user.clinicId, body.patientId) };
          }

          if (!body.amount) return { error: "INVALID_AMOUNT" as const };
          const entry = await recordCharge(tx, {
            clinicId: request.user.clinicId,
            patientId: body.patientId,
            createdByUserId: userId,
            amount: body.amount,
            description: body.description,
            referenceType: body.referenceType ?? null,
            referenceId: body.referenceId ?? null,
          });
          return { entry, balance: await computePatientBalance(tx, request.user.clinicId, body.patientId) };
        });

        if ("error" in result) {
          if (result.error === "SERVICE_NOT_FOUND") {
            return reply.code(400).send({ message: "Xidmət tapılmadı." });
          }
          if (result.error === "INVALID_AMOUNT") {
            return reply.code(400).send({ message: "Məbləğ tələb olunur." });
          }
          return reply.code(400).send({ message: "Sorğu rədd edildi." });
        }

        await recordAudit(app.prisma, {
          ...actorFromRequest(request),
          ...auditRequestMeta(request),
          category: AUDIT_CATEGORIES.FINANCE,
          action: AUDIT_ACTIONS.CHARGE_RECORDED,
          entityType: "PatientAccountEntry",
          entityId: result.entry.id,
          summary: `Borc yazıldı · ${result.entry.amount.toNumber().toFixed(2)} ₼`,
          details: {
            patientId: body.patientId,
            amount: result.entry.amount.toNumber(),
            description: body.description,
            balance: result.balance,
          },
        });

        return reply.code(201).send({
          entryId: result.entry.id,
          balance: result.balance,
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "PATIENT_NOT_FOUND") {
            return reply.code(404).send({ message: "Pasiyent tapılmadı." });
          }
        }
        throw error;
      }
    },
  );

  app.post(
    "/finance/clinical-encounters/:id/charges",
    { preHandler: [app.authenticate, app.authorize([...cashierRoles, "DOCTOR"])] },
    async (request, reply) => {
      const { id } = encounterParams.parse(request.params);
      const body = z.object({ lines: z.array(chargeLineSchema).min(1).max(20) }).parse(request.body);
      const userId = request.user.sub!;

      try {
        const created = await app.prisma.$transaction((tx) =>
          createEncounterCharges(tx, {
            clinicId: request.user.clinicId,
            encounterId: id,
            createdByUserId: userId,
            lines: body.lines,
          }),
        );
        return reply.code(201).send({ count: created.length });
      } catch (error) {
        if (error instanceof Error) {
          const map: Record<string, string> = {
            ENCOUNTER_NOT_FOUND: "Klinik qəbul tapılmadı.",
            ENCOUNTER_NOT_COMPLETED: "Yalnız tamamlanmış qəbul üçün borc yazıla bilər.",
            SERVICE_NOT_FOUND: "Xidmət tapılmadı.",
          };
          if (map[error.message]) return reply.code(400).send({ message: map[error.message] });
        }
        throw error;
      }
    },
  );

  app.post(
    "/finance/payments",
    { preHandler: [app.authenticate, app.authorize([...cashierRoles])] },
    async (request, reply) => {
      const body = paymentSchema.parse(request.body);
      const userId = request.user.sub!;

      try {
        const result = await app.prisma.$transaction(async (tx) => {
          let cashSessionId: string | null = null;
          if (body.paymentMethod === "CASH") {
            const session = await getOpenCashSession(tx, request.user.clinicId);
            if (!session) return { error: "NO_SESSION" as const };
            cashSessionId = session.id;
          }

          const entry = await recordPayment(tx, {
            clinicId: request.user.clinicId,
            patientId: body.patientId,
            createdByUserId: userId,
            amount: body.amount,
            paymentMethod: body.paymentMethod,
            description: body.description,
            cashSessionId,
          });

          return {
            entry,
            balance: await computePatientBalance(tx, request.user.clinicId, body.patientId),
          };
        });

        if ("error" in result) {
          return reply.code(409).send({
            message: "Nağd ödəniş üçün əvvəlcə kassa növbəsini açmalısınız.",
          });
        }

        await recordAudit(app.prisma, {
          ...actorFromRequest(request),
          ...auditRequestMeta(request),
          category: AUDIT_CATEGORIES.FINANCE,
          action: AUDIT_ACTIONS.PAYMENT_RECORDED,
          entityType: "PatientAccountEntry",
          entityId: result.entry.id,
          summary: `Ödəniş qəbul edildi · ${result.entry.amount.toNumber().toFixed(2)} ₼`,
          details: {
            patientId: body.patientId,
            amount: result.entry.amount.toNumber(),
            paymentMethod: body.paymentMethod,
            receiptNumber: result.entry.receiptNumber,
            balance: result.balance,
          },
        });

        return reply.code(201).send({
          entryId: result.entry.id,
          receiptNumber: result.entry.receiptNumber,
          balance: result.balance,
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "PATIENT_NOT_FOUND") {
            return reply.code(404).send({ message: "Pasiyent tapılmadı." });
          }
          if (error.message === "PAYMENT_EXCEEDS_BALANCE") {
            return reply.code(409).send({ message: "Ödəniş açıq borcdan çox ola bilməz. Artıq məbləği depozit kimi qəbul edin." });
          }
        }
        throw error;
      }
    },
  );

  app.post(
    "/finance/deposits",
    { preHandler: [app.authenticate, app.authorize([...cashierRoles])] },
    async (request, reply) => {
      const body = z
        .object({
          patientId: z.string().min(1),
          amount: z.coerce.number().positive().max(999999999),
          paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]),
          description: z.string().trim().min(2).max(500).default("Depozit ödənişi"),
        })
        .parse(request.body);
      const userId = request.user.sub!;

      try {
        const result = await app.prisma.$transaction(async (tx) => {
          let cashSessionId: string | null = null;
          if (body.paymentMethod === "CASH") {
            const session = await getOpenCashSession(tx, request.user.clinicId);
            if (!session) return { error: "NO_SESSION" as const };
            cashSessionId = session.id;
          }
          const entry = await recordDeposit(tx, {
            clinicId: request.user.clinicId,
            patientId: body.patientId,
            createdByUserId: userId,
            amount: body.amount,
            paymentMethod: body.paymentMethod,
            description: body.description,
            cashSessionId,
          });
          return {
            entry,
            depositBalance: await computeDepositBalance(tx, request.user.clinicId, body.patientId),
          };
        });

        if ("error" in result) {
          return reply.code(409).send({ message: "Nağd depozit üçün kassa açılmalıdır." });
        }

        await recordAudit(app.prisma, {
          ...actorFromRequest(request),
          ...auditRequestMeta(request),
          category: AUDIT_CATEGORIES.FINANCE,
          action: AUDIT_ACTIONS.DEPOSIT_RECORDED,
          entityType: "PatientAccountEntry",
          entityId: result.entry.id,
          summary: `Depozit · ${body.amount.toFixed(2)} ₼`,
          details: { patientId: body.patientId, amount: body.amount },
        });

        return reply.code(201).send({
          receiptNumber: result.entry.receiptNumber,
          depositBalance: result.depositBalance,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "PATIENT_NOT_FOUND") {
          return reply.code(404).send({ message: "Pasiyent tapılmadı." });
        }
        if (error instanceof Error && error.message === "PERIOD_CLOSED") {
          return reply.code(409).send({ message: "Maliyyə periodu bağlıdır." });
        }
        throw error;
      }
    },
  );

  app.post(
    "/finance/refunds",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"])] },
    async (request, reply) => {
      const body = z
        .object({
          patientId: z.string().min(1),
          amount: z.coerce.number().positive().max(999999999),
          description: z.string().trim().min(2).max(500),
          referencePaymentId: z.string().min(1).optional(),
        })
        .parse(request.body);
      const userId = request.user.sub!;

      try {
        const result = await app.prisma.$transaction(async (tx) => {
          const entry = await recordRefund(tx, {
            clinicId: request.user.clinicId,
            patientId: body.patientId,
            createdByUserId: userId,
            amount: body.amount,
            description: body.description,
            referencePaymentId: body.referencePaymentId ?? null,
          });
          return {
            entry,
            balance: await computePatientBalance(tx, request.user.clinicId, body.patientId),
          };
        });

        await recordAudit(app.prisma, {
          ...actorFromRequest(request),
          ...auditRequestMeta(request),
          category: AUDIT_CATEGORIES.FINANCE,
          action: AUDIT_ACTIONS.REFUND_RECORDED,
          entityType: "PatientAccountEntry",
          entityId: result.entry.id,
          summary: `Refund · ${body.amount.toFixed(2)} ₼`,
          details: { patientId: body.patientId, amount: body.amount },
        });

        return reply.code(201).send({
          receiptNumber: result.entry.receiptNumber,
          balance: result.balance,
        });
      } catch (error) {
        if (error instanceof Error) {
          const map: Record<string, string> = {
            PATIENT_NOT_FOUND: "Pasiyent tapılmadı.",
            PAYMENT_NOT_FOUND: "Ödəniş tapılmadı.",
            PERIOD_CLOSED: "Maliyyə periodu bağlıdır.",
          };
          if (map[error.message]) return reply.code(400).send({ message: map[error.message] });
        }
        throw error;
      }
    },
  );

  app.get(
    "/finance/reports/summary",
    { preHandler: [app.authenticate, app.authorize([...financeRoles, "MANAGEMENT"])] },
    async (request, reply) => {
      const query = z
        .object({ startDate: z.string().datetime(), endDate: z.string().datetime() })
        .parse(request.query);
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      if (endDate <= startDate) {
        return reply.code(400).send({ message: "Tarix aralığı düzgün deyil." });
      }
      return app.prisma.$transaction((tx) =>
        financeReportSummary(tx, request.user.clinicId, startDate, endDate),
      );
    },
  );

  app.get(
    "/finance/periods/latest",
    { preHandler: [app.authenticate, app.authorize([...financeRoles])] },
    async (request) => {
      const closedThrough = await getClosedThroughDate(app.prisma, request.user.clinicId);
      const last = await app.prisma.financePeriod.findFirst({
        where: { clinicId: request.user.clinicId },
        orderBy: { closedThrough: "desc" },
        include: { closedBy: { select: { email: true } } },
      });
      return {
        closedThrough: closedThrough?.toISOString().slice(0, 10) ?? null,
        lastPeriod: last
          ? {
              id: last.id,
              closedThrough: last.closedThrough.toISOString().slice(0, 10),
              closedAt: last.closedAt.toISOString(),
              closedBy: last.closedBy.email,
              note: last.note,
              summary: last.summary,
            }
          : null,
      };
    },
  );

  app.post(
    "/finance/periods/close",
    { preHandler: [app.authenticate, app.authorize(["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"])] },
    async (request, reply) => {
      const body = z
        .object({
          closedThrough: z.string().date(),
          note: z.string().trim().max(500).nullable().optional(),
        })
        .parse(request.body);
      const userId = request.user.sub!;

      try {
        const period = await app.prisma.$transaction((tx) =>
          closeFinancePeriod(tx, {
            clinicId: request.user.clinicId,
            closedByUserId: userId,
            closedThrough: new Date(body.closedThrough),
            note: body.note ?? null,
          }),
        );

        await recordAudit(app.prisma, {
          ...actorFromRequest(request),
          ...auditRequestMeta(request),
          category: AUDIT_CATEGORIES.FINANCE,
          action: AUDIT_ACTIONS.PERIOD_CLOSED,
          entityType: "FinancePeriod",
          entityId: period.id,
          summary: `Period bağlandı · ${body.closedThrough}`,
          details: { closedThrough: body.closedThrough, summary: period.summary },
        });

        return reply.send({
          id: period.id,
          closedThrough: period.closedThrough.toISOString().slice(0, 10),
          summary: period.summary,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "PERIOD_ALREADY_CLOSED") {
          return reply.code(409).send({ message: "Bu tarix artıq bağlanıb və ya daha köhnədir." });
        }
        throw error;
      }
    },
  );

  app.get(
    "/finance/receipts/:entryId",
    { preHandler: [app.authenticate, app.authorize([...receiptReaderRoles])] },
    async (request, reply) => {
      const { entryId } = z.object({ entryId: z.string().min(1) }).parse(request.params);
      const entry = await app.prisma.patientAccountEntry.findFirst({
        where: { id: entryId, clinicId: request.user.clinicId },
        include: {
          patient: { select: { firstName: true, lastName: true, phone: true } },
          createdBy: { select: { email: true } },
        },
      });
      if (!entry || !entry.receiptNumber) {
        return reply.code(404).send({ message: "Qəbz tapılmadı." });
      }

      const html = `<!DOCTYPE html><html lang="az"><head><meta charset="utf-8"/><title>Qəbz ${entry.receiptNumber}</title>
<style>body{font-family:system-ui,sans-serif;max-width:420px;margin:24px auto;padding:16px}
h1{font-size:18px}table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #eee}
@media print{button{display:none}}</style></head><body>
<h1>LovelyDent · Ödəniş qəbzi</h1>
<p><strong>${entry.receiptNumber}</strong></p>
<table>
<tr><td>Pasiyent</td><td>${entry.patient.firstName} ${entry.patient.lastName}</td></tr>
<tr><td>Telefon</td><td>${entry.patient.phone}</td></tr>
<tr><td>Tarix</td><td>${entry.createdAt.toLocaleString("az-AZ")}</td></tr>
<tr><td>Tip</td><td>${entry.entryType}</td></tr>
<tr><td>Məbləğ</td><td><strong>${entry.amount.toNumber().toFixed(2)} AZN</strong></td></tr>
<tr><td>Metod</td><td>${entry.paymentMethod ?? "—"}</td></tr>
<tr><td>Qeyd</td><td>${entry.description}</td></tr>
<tr><td>Kassir</td><td>${entry.createdBy.email}</td></tr>
</table>
<button onclick="window.print()">Çap et</button>
</body></html>`;

      return reply.header("Content-Type", "text/html; charset=utf-8").send(html);
    },
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
