import { Prisma, type PrismaClient } from "@prisma/client";

export const ENTRY_TYPES = {
  SERVICE_CHARGE: "SERVICE_CHARGE",
  PAYMENT: "PAYMENT",
  DEPOSIT: "DEPOSIT",
  REFUND: "REFUND",
  DISCOUNT: "DISCOUNT",
} as const;

export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

export function signedEntryAmount(entry: { direction: string; amount: Prisma.Decimal }) {
  const value = entry.amount.toNumber();
  return entry.direction === "DEBIT" ? value : -value;
}

export async function computePatientBalance(
  tx: Tx,
  clinicId: string,
  patientId: string,
) {
  const rows = await tx.patientAccountEntry.findMany({
    where: { clinicId, patientId },
    select: { direction: true, amount: true },
  });
  return roundMoney(rows.reduce((sum, row) => sum + signedEntryAmount(row), 0));
}

export async function getOpenCashSession(tx: Tx, clinicId: string) {
  return tx.cashSession.findFirst({
    where: { clinicId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
    include: { openedBy: { select: { email: true } } },
  });
}

export async function computeCashSessionExpected(
  tx: Tx,
  clinicId: string,
  sessionId: string,
  openingBalance: Prisma.Decimal,
) {
  const movements = await tx.patientAccountEntry.findMany({
    where: {
      clinicId,
      cashSessionId: sessionId,
      entryType: { in: [ENTRY_TYPES.PAYMENT, ENTRY_TYPES.DEPOSIT, ENTRY_TYPES.REFUND] },
      paymentMethod: "CASH",
    },
    select: { entryType: true, amount: true },
  });
  const cashNet = movements.reduce(
    (sum, row) => sum + (row.entryType === ENTRY_TYPES.REFUND ? -1 : 1) * row.amount.toNumber(),
    0,
  );
  const payouts = await tx.commissionPayout.aggregate({
    where: { clinicId, cashSessionId: sessionId, paymentMethod: "CASH" },
    _sum: { amount: true },
  });
  return roundMoney(openingBalance.toNumber() + cashNet - (payouts._sum.amount?.toNumber() ?? 0));
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function nextReceiptNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LD-${stamp}-${suffix}`;
}

export type ChargeLineInput = {
  serviceId?: string;
  amount?: number;
  quantity?: number;
  description: string;
};

export async function recordCharge(
  tx: Tx,
  input: {
    clinicId: string;
    patientId: string;
    createdByUserId: string;
    description: string;
    amount: number;
    serviceId?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
  },
) {
  await assertFinanceWritable(tx, input.clinicId);
  if (input.amount <= 0) throw new Error("INVALID_AMOUNT");

  const patient = await tx.patientProfile.findFirst({
    where: { id: input.patientId, clinicId: input.clinicId },
    select: { id: true },
  });
  if (!patient) throw new Error("PATIENT_NOT_FOUND");

  if (input.serviceId) {
    const service = await tx.service.findFirst({
      where: { id: input.serviceId, clinicId: input.clinicId, active: true },
    });
    if (!service) throw new Error("SERVICE_NOT_FOUND");
  }

  return tx.patientAccountEntry.create({
    data: {
      clinicId: input.clinicId,
      patientId: input.patientId,
      entryType: ENTRY_TYPES.SERVICE_CHARGE,
      direction: "DEBIT",
      amount: input.amount,
      serviceId: input.serviceId ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      description: input.description,
      createdByUserId: input.createdByUserId,
    },
  });
}

async function resolveCommissionPercent(
  tx: Tx,
  clinicId: string,
  doctorUserId: string,
  serviceId: string | null,
) {
  const rules = await tx.commissionRule.findMany({
    where: {
      clinicId,
      active: true,
      AND: [
        { OR: [{ doctorUserId }, { doctorUserId: null }] },
        serviceId ? { OR: [{ serviceId }, { serviceId: null }] } : { serviceId: null },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  const ranked = rules
    .map((rule) => ({
      rule,
      score: (rule.doctorUserId === doctorUserId ? 2 : 0) + (serviceId && rule.serviceId === serviceId ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.rule.percent.toNumber() ?? null;
}

async function syncChargeCommission(tx: Tx, clinicId: string, chargeEntryId: string) {
  const commission = await tx.commissionEntry.findFirst({
    where: { clinicId, sourceType: "SERVICE_CHARGE", sourceId: chargeEntryId },
  });
  if (!commission) return null;

  const allocations = await tx.patientAccountAllocation.findMany({
    where: { clinicId, debitEntryId: chargeEntryId },
    include: { reversals: { select: { amount: true } } },
  });
  const paidBaseAmount = Math.min(
    commission.baseAmount.toNumber(),
    roundMoney(
      allocations.reduce(
        (sum, allocation) =>
          sum + allocation.amount.toNumber() - allocation.reversals.reduce((reversed, row) => reversed + row.amount.toNumber(), 0),
        0,
      ),
    ),
  );
  const earnedAmount = roundMoney((paidBaseAmount * commission.percent.toNumber()) / 100);
  const fullyEarned = paidBaseAmount >= commission.baseAmount.toNumber() - 0.009;

  return tx.commissionEntry.update({
    where: { id: commission.id },
    data: {
      paidBaseAmount,
      earnedAmount,
      status: fullyEarned ? "EARNED" : paidBaseAmount > 0 ? "PARTIAL" : "PENDING",
      earnedAt: fullyEarned ? commission.earnedAt ?? new Date() : null,
    },
  });
}

export async function createChargeCommission(
  tx: Tx,
  input: {
    clinicId: string;
    doctorUserId: string;
    patientId: string;
    serviceId: string | null;
    chargeEntryId: string;
    baseAmount: number;
    note?: string | null;
  },
) {
  const existing = await tx.commissionEntry.findFirst({
    where: { clinicId: input.clinicId, sourceType: "SERVICE_CHARGE", sourceId: input.chargeEntryId },
  });
  if (existing) return existing;

  const percent = await resolveCommissionPercent(
    tx,
    input.clinicId,
    input.doctorUserId,
    input.serviceId,
  );
  if (percent === null || percent <= 0) return null;

  await tx.commissionEntry.create({
    data: {
      clinicId: input.clinicId,
      doctorUserId: input.doctorUserId,
      patientId: input.patientId,
      sourceType: "SERVICE_CHARGE",
      sourceId: input.chargeEntryId,
      baseAmount: input.baseAmount,
      percent,
      amount: roundMoney((input.baseAmount * percent) / 100),
      note: input.note ?? null,
    },
  });

  return syncChargeCommission(tx, input.clinicId, input.chargeEntryId);
}

async function allocateAmount(
  tx: Tx,
  input: { clinicId: string; debitEntryId: string; creditEntryId: string; amount: number },
) {
  if (input.amount <= 0) return;
  const allocation = await tx.patientAccountAllocation.create({
    data: {
      clinicId: input.clinicId,
      debitEntryId: input.debitEntryId,
      creditEntryId: input.creditEntryId,
      amount: roundMoney(input.amount),
    },
  });
  const commission = await tx.commissionEntry.findFirst({
    where: { clinicId: input.clinicId, sourceType: "SERVICE_CHARGE", sourceId: input.debitEntryId },
  });
  if (commission) {
    await tx.commissionTransaction.create({
      data: {
        clinicId: input.clinicId,
        commissionEntryId: commission.id,
        doctorUserId: commission.doctorUserId,
        type: "EARNING",
        sourceType: "PatientAccountAllocation",
        sourceId: allocation.id,
        baseAmount: allocation.amount,
        amount: roundMoney((allocation.amount.toNumber() * commission.percent.toNumber()) / 100),
      },
    });
  }
  await syncChargeCommission(tx, input.clinicId, input.debitEntryId);
}

export async function allocateCreditToCharges(
  tx: Tx,
  input: { clinicId: string; patientId: string; creditEntryId: string },
) {
  const credit = await tx.patientAccountEntry.findFirst({
    where: {
      id: input.creditEntryId,
      clinicId: input.clinicId,
      patientId: input.patientId,
      direction: "CREDIT",
    },
    include: { creditAllocations: { select: { amount: true } } },
  });
  if (!credit) throw new Error("CREDIT_ENTRY_NOT_FOUND");

  let remaining = roundMoney(
    credit.amount.toNumber() - credit.creditAllocations.reduce((sum, row) => sum + row.amount.toNumber(), 0),
  );
  if (remaining <= 0) return;

  const charges = await tx.patientAccountEntry.findMany({
    where: {
      clinicId: input.clinicId,
      patientId: input.patientId,
      entryType: ENTRY_TYPES.SERVICE_CHARGE,
      direction: "DEBIT",
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      debitAllocations: {
        include: { reversals: { select: { amount: true } } },
      },
    },
  });

  for (const charge of charges) {
    if (remaining <= 0) break;
    const allocated = charge.debitAllocations.reduce(
      (sum, row) => sum + row.amount.toNumber() - row.reversals.reduce((reversed, reversal) => reversed + reversal.amount.toNumber(), 0),
      0,
    );
    const outstanding = roundMoney(charge.amount.toNumber() - allocated);
    if (outstanding <= 0) continue;
    const amount = Math.min(remaining, outstanding);
    await allocateAmount(tx, {
      clinicId: input.clinicId,
      debitEntryId: charge.id,
      creditEntryId: credit.id,
      amount,
    });
    remaining = roundMoney(remaining - amount);
  }
}

export async function allocateExistingCreditsToCharge(
  tx: Tx,
  input: { clinicId: string; patientId: string; chargeEntryId: string },
) {
  const charge = await tx.patientAccountEntry.findFirst({
    where: {
      id: input.chargeEntryId,
      clinicId: input.clinicId,
      patientId: input.patientId,
      entryType: ENTRY_TYPES.SERVICE_CHARGE,
      direction: "DEBIT",
    },
    include: { debitAllocations: { select: { amount: true } } },
  });
  if (!charge) throw new Error("CHARGE_ENTRY_NOT_FOUND");

  let outstanding = roundMoney(
    charge.amount.toNumber() - charge.debitAllocations.reduce((sum, row) => sum + row.amount.toNumber(), 0),
  );
  if (outstanding <= 0) return;

  const credits = await tx.patientAccountEntry.findMany({
    where: {
      clinicId: input.clinicId,
      patientId: input.patientId,
      direction: "CREDIT",
      entryType: { in: [ENTRY_TYPES.PAYMENT, ENTRY_TYPES.DEPOSIT] },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { creditAllocations: { select: { amount: true } } },
  });

  for (const credit of credits) {
    if (outstanding <= 0) break;
    const alreadyUsed = credit.creditAllocations.reduce((sum, row) => sum + row.amount.toNumber(), 0);
    const available = roundMoney(credit.amount.toNumber() - alreadyUsed);
    if (available <= 0) continue;
    const amount = Math.min(outstanding, available);
    await allocateAmount(tx, {
      clinicId: input.clinicId,
      debitEntryId: charge.id,
      creditEntryId: credit.id,
      amount,
    });
    outstanding = roundMoney(outstanding - amount);
  }
}

export async function recordPayment(
  tx: Tx,
  input: {
    clinicId: string;
    patientId: string;
    createdByUserId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    description: string;
    cashSessionId?: string | null;
  },
) {
  await assertFinanceWritable(tx, input.clinicId);
  if (input.amount <= 0) throw new Error("INVALID_AMOUNT");

  const patient = await tx.patientProfile.findFirst({
    where: { id: input.patientId, clinicId: input.clinicId },
    select: { id: true },
  });
  if (!patient) throw new Error("PATIENT_NOT_FOUND");

  const balance = await computePatientBalance(tx, input.clinicId, input.patientId);
  if (balance <= 0 || input.amount > balance + 0.009) {
    throw new Error("PAYMENT_EXCEEDS_BALANCE");
  }

  if (input.paymentMethod === "CASH") {
    if (!input.cashSessionId) throw new Error("CASH_SESSION_REQUIRED");
    const session = await tx.cashSession.findFirst({
      where: { id: input.cashSessionId, clinicId: input.clinicId, status: "OPEN" },
    });
    if (!session) throw new Error("CASH_SESSION_CLOSED");
  }

  const entry = await tx.patientAccountEntry.create({
    data: {
      clinicId: input.clinicId,
      patientId: input.patientId,
      entryType: ENTRY_TYPES.PAYMENT,
      direction: "CREDIT",
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      description: input.description,
      receiptNumber: nextReceiptNumber(),
      cashSessionId: input.paymentMethod === "CASH" ? input.cashSessionId : null,
      createdByUserId: input.createdByUserId,
    },
  });
  await allocateCreditToCharges(tx, {
    clinicId: input.clinicId,
    patientId: input.patientId,
    creditEntryId: entry.id,
  });
  return entry;
}

export async function createChargesFromLines(
  tx: Tx,
  input: {
    clinicId: string;
    patientId: string;
    createdByUserId: string;
    referenceType: string;
    referenceId: string;
    lines: ChargeLineInput[];
    doctorUserId?: string | null;
  },
) {
  const created = [];
  for (const line of input.lines) {
    let amount = line.amount ?? 0;
    let serviceId: string | null = line.serviceId ?? null;

    if (line.serviceId) {
      const service = await tx.service.findFirst({
        where: { id: line.serviceId, clinicId: input.clinicId, active: true },
      });
      if (!service) throw new Error("SERVICE_NOT_FOUND");
      const qty = line.quantity ?? 1;
      amount = roundMoney(service.price.toNumber() * qty);
      serviceId = service.id;
    }

    if (amount <= 0) continue;

    const entry = await recordCharge(tx, {
      clinicId: input.clinicId,
      patientId: input.patientId,
      createdByUserId: input.createdByUserId,
      amount,
      serviceId,
      description: line.description,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    });
    created.push(entry);
    if (input.doctorUserId) {
      await createChargeCommission(tx, {
        clinicId: input.clinicId,
        doctorUserId: input.doctorUserId,
        patientId: input.patientId,
        serviceId,
        chargeEntryId: entry.id,
        baseAmount: amount,
        note: line.description,
      });
    }
    await allocateExistingCreditsToCharge(tx, {
      clinicId: input.clinicId,
      patientId: input.patientId,
      chargeEntryId: entry.id,
    });
  }
  return created;
}

export async function createEncounterCharges(
  tx: Tx,
  input: {
    clinicId: string;
    encounterId: string;
    createdByUserId: string;
    lines: ChargeLineInput[];
  },
) {
  const encounter = await tx.clinicalEncounter.findFirst({
    where: { id: input.encounterId, clinicId: input.clinicId },
    select: { id: true, patientId: true, doctorUserId: true, status: true },
  });
  if (!encounter) throw new Error("ENCOUNTER_NOT_FOUND");
  if (encounter.status !== "COMPLETED") throw new Error("ENCOUNTER_NOT_COMPLETED");

  return createChargesFromLines(tx, {
    clinicId: input.clinicId,
    patientId: encounter.patientId,
    createdByUserId: input.createdByUserId,
    referenceType: "ClinicalEncounter",
    referenceId: encounter.id,
    lines: input.lines,
    doctorUserId: encounter.doctorUserId,
  });
}

export async function applyEncounterCompletionWithCharges(
  tx: Tx,
  input: {
    clinicId: string;
    encounterId: string;
    createdByUserId: string;
    charges?: ChargeLineInput[];
  },
) {
  const encounter = await tx.clinicalEncounter.findFirst({
    where: { id: input.encounterId, clinicId: input.clinicId },
  });
  if (!encounter) return { error: "ENTITY_NOT_FOUND" as const };
  if (encounter.status !== "DRAFT") return { error: "UNSUPPORTED" as const };
  if (!encounter.diagnosis?.trim()) return { error: "UNSUPPORTED" as const };

  await tx.clinicalEncounter.update({
    where: { id: input.encounterId },
    data: { status: "COMPLETED", signedAt: new Date(), completedAt: new Date() },
  });

  if (input.charges?.length) {
    await createChargesFromLines(tx, {
      clinicId: input.clinicId,
      patientId: encounter.patientId,
      createdByUserId: input.createdByUserId,
      referenceType: "ClinicalEncounter",
      referenceId: encounter.id,
      lines: input.charges,
      doctorUserId: encounter.doctorUserId,
    });
  }

  return { ok: true as const };
}

export async function listDebtors(tx: Tx, clinicId: string, take = 50) {
  const patients = await tx.patientProfile.findMany({
    where: { clinicId },
    select: { id: true, firstName: true, lastName: true, phone: true },
    take: 200,
  });

  const balances = await Promise.all(
    patients.map(async (patient) => ({
      patient,
      balance: await computePatientBalance(tx, clinicId, patient.id),
    })),
  );

  return balances
    .filter((row) => row.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, take)
    .map((row) => ({
      patientId: row.patient.id,
      patientName: `${row.patient.firstName} ${row.patient.lastName}`,
      phone: row.patient.phone,
      balance: row.balance,
    }));
}

export async function getClosedThroughDate(tx: Tx, clinicId: string) {
  const last = await tx.financePeriod.findFirst({
    where: { clinicId },
    orderBy: { closedThrough: "desc" },
    select: { closedThrough: true },
  });
  return last?.closedThrough ?? null;
}

export async function assertFinanceWritable(tx: Tx, clinicId: string) {
  const closedThrough = await getClosedThroughDate(tx, clinicId);
  if (!closedThrough) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const closed = new Date(closedThrough);
  closed.setHours(0, 0, 0, 0);
  if (today.getTime() <= closed.getTime()) {
    throw new Error("PERIOD_CLOSED");
  }
}

export async function computeDepositBalance(tx: Tx, clinicId: string, patientId: string) {
  const rows = await tx.patientAccountEntry.findMany({
    where: {
      clinicId,
      patientId,
      entryType: ENTRY_TYPES.DEPOSIT,
      direction: "CREDIT",
    },
    include: { creditAllocations: { select: { amount: true } } },
  });
  return roundMoney(
    rows.reduce(
      (sum, row) =>
        sum + row.amount.toNumber() - row.creditAllocations.reduce((used, item) => used + item.amount.toNumber(), 0),
      0,
    ),
  );
}

export async function recordDeposit(
  tx: Tx,
  input: {
    clinicId: string;
    patientId: string;
    createdByUserId: string;
    amount: number;
    paymentMethod: "CASH" | "CARD" | "TRANSFER";
    description: string;
    cashSessionId?: string | null;
  },
) {
  await assertFinanceWritable(tx, input.clinicId);
  if (input.amount <= 0) throw new Error("INVALID_AMOUNT");

  const patient = await tx.patientProfile.findFirst({
    where: { id: input.patientId, clinicId: input.clinicId },
    select: { id: true },
  });
  if (!patient) throw new Error("PATIENT_NOT_FOUND");

  if (input.paymentMethod === "CASH") {
    if (!input.cashSessionId) throw new Error("CASH_SESSION_REQUIRED");
    const session = await tx.cashSession.findFirst({
      where: { id: input.cashSessionId, clinicId: input.clinicId, status: "OPEN" },
    });
    if (!session) throw new Error("CASH_SESSION_CLOSED");
  }

  const entry = await tx.patientAccountEntry.create({
    data: {
      clinicId: input.clinicId,
      patientId: input.patientId,
      entryType: ENTRY_TYPES.DEPOSIT,
      direction: "CREDIT",
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      description: input.description,
      receiptNumber: nextReceiptNumber(),
      cashSessionId: input.paymentMethod === "CASH" ? input.cashSessionId : null,
      createdByUserId: input.createdByUserId,
    },
  });
  await allocateCreditToCharges(tx, {
    clinicId: input.clinicId,
    patientId: input.patientId,
    creditEntryId: entry.id,
  });
  return entry;
}

export async function recordRefund(
  tx: Tx,
  input: {
    clinicId: string;
    patientId: string;
    createdByUserId: string;
    amount: number;
    description: string;
    referencePaymentId: string;
    cashSessionId?: string | null;
  },
) {
  await assertFinanceWritable(tx, input.clinicId);
  if (input.amount <= 0) throw new Error("INVALID_AMOUNT");

  const patient = await tx.patientProfile.findFirst({
    where: { id: input.patientId, clinicId: input.clinicId },
    select: { id: true },
  });
  if (!patient) throw new Error("PATIENT_NOT_FOUND");

  const payment = await tx.patientAccountEntry.findFirst({
    where: {
      id: input.referencePaymentId,
      clinicId: input.clinicId,
      patientId: input.patientId,
      entryType: ENTRY_TYPES.PAYMENT,
      direction: "CREDIT",
    },
    include: {
      creditAllocations: {
        orderBy: { createdAt: "desc" },
        include: { reversals: { select: { amount: true } } },
      },
    },
  });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");

  const previousRefunds = await tx.patientAccountEntry.aggregate({
    where: {
      clinicId: input.clinicId,
      patientId: input.patientId,
      entryType: ENTRY_TYPES.REFUND,
      referenceType: "PatientAccountEntry",
      referenceId: payment.id,
    },
    _sum: { amount: true },
  });
  const refundable = roundMoney(payment.amount.toNumber() - (previousRefunds._sum.amount?.toNumber() ?? 0));
  if (input.amount > refundable + 0.009) throw new Error("REFUND_EXCEEDS_PAYMENT");

  if (payment.paymentMethod === "CASH") {
    if (!input.cashSessionId) throw new Error("CASH_SESSION_REQUIRED");
    const session = await tx.cashSession.findFirst({
      where: { id: input.cashSessionId, clinicId: input.clinicId, status: "OPEN" },
    });
    if (!session) throw new Error("CASH_SESSION_CLOSED");
  }

  const entry = await tx.patientAccountEntry.create({
    data: {
      clinicId: input.clinicId,
      patientId: input.patientId,
      entryType: ENTRY_TYPES.REFUND,
      direction: "DEBIT",
      amount: input.amount,
      description: input.description,
      paymentMethod: payment.paymentMethod,
      referenceType: "PatientAccountEntry",
      referenceId: payment.id,
      receiptNumber: nextReceiptNumber(),
      cashSessionId: payment.paymentMethod === "CASH" ? input.cashSessionId : null,
      createdByUserId: input.createdByUserId,
    },
  });

  let remaining = roundMoney(input.amount);
  for (const allocation of payment.creditAllocations) {
    if (remaining <= 0) break;
    const alreadyReversed = allocation.reversals.reduce((sum, row) => sum + row.amount.toNumber(), 0);
    const reversible = roundMoney(allocation.amount.toNumber() - alreadyReversed);
    if (reversible <= 0) continue;
    const amount = Math.min(remaining, reversible);
    const reversal = await tx.patientAccountAllocationReversal.create({
      data: {
        clinicId: input.clinicId,
        allocationId: allocation.id,
        refundEntryId: entry.id,
        amount,
      },
    });

    const commission = await tx.commissionEntry.findFirst({
      where: { clinicId: input.clinicId, sourceType: "SERVICE_CHARGE", sourceId: allocation.debitEntryId },
    });
    if (commission) {
      await tx.commissionTransaction.create({
        data: {
          clinicId: input.clinicId,
          commissionEntryId: commission.id,
          doctorUserId: commission.doctorUserId,
          type: "REVERSAL",
          sourceType: "PatientAccountAllocationReversal",
          sourceId: reversal.id,
          baseAmount: -amount,
          amount: -roundMoney((amount * commission.percent.toNumber()) / 100),
        },
      });
    }
    await syncChargeCommission(tx, input.clinicId, allocation.debitEntryId);
    remaining = roundMoney(remaining - amount);
  }

  if (remaining > 0.009) throw new Error("REFUND_ALLOCATION_MISSING");
  return entry;
}

export async function financeReportSummary(
  tx: Tx,
  clinicId: string,
  startDate: Date,
  endDate: Date,
) {
  const entries = await tx.patientAccountEntry.findMany({
    where: { clinicId, createdAt: { gte: startDate, lte: endDate } },
    select: { entryType: true, direction: true, amount: true, paymentMethod: true },
  });

  let charges = 0;
  let payments = 0;
  let deposits = 0;
  let refunds = 0;
  let cashPayments = 0;

  for (const entry of entries) {
    const amount = entry.amount.toNumber();
    if (entry.entryType === ENTRY_TYPES.SERVICE_CHARGE && entry.direction === "DEBIT") charges += amount;
    if (entry.entryType === ENTRY_TYPES.PAYMENT && entry.direction === "CREDIT") {
      payments += amount;
      if (entry.paymentMethod === "CASH") cashPayments += amount;
    }
    if (entry.entryType === ENTRY_TYPES.DEPOSIT && entry.direction === "CREDIT") deposits += amount;
    if (entry.entryType === ENTRY_TYPES.REFUND && entry.direction === "DEBIT") refunds += amount;
  }

  const debtors = await listDebtors(tx, clinicId, 500);

  return {
    charges: roundMoney(charges),
    payments: roundMoney(payments),
    deposits: roundMoney(deposits),
    refunds: roundMoney(refunds),
    cashPayments: roundMoney(cashPayments),
    openDebtors: debtors.length,
    totalOutstanding: roundMoney(debtors.reduce((sum, row) => sum + row.balance, 0)),
    entryCount: entries.length,
  };
}

export async function closeFinancePeriod(
  tx: Tx,
  input: {
    clinicId: string;
    closedByUserId: string;
    closedThrough: Date;
    note?: string | null;
  },
) {
  const closedThrough = new Date(input.closedThrough);
  closedThrough.setHours(0, 0, 0, 0);

  const last = await getClosedThroughDate(tx, input.clinicId);
  if (last) {
    const lastDate = new Date(last);
    lastDate.setHours(0, 0, 0, 0);
    if (closedThrough.getTime() <= lastDate.getTime()) {
      throw new Error("PERIOD_ALREADY_CLOSED");
    }
  }

  const start = new Date(closedThrough);
  start.setHours(0, 0, 0, 0);
  const end = new Date(closedThrough);
  end.setHours(23, 59, 59, 999);
  const summary = await financeReportSummary(tx, input.clinicId, start, end);

  return tx.financePeriod.create({
    data: {
      clinicId: input.clinicId,
      closedThrough,
      closedByUserId: input.closedByUserId,
      note: input.note ?? null,
      summary,
    },
  });
}

export async function todayFinanceSummary(tx: Tx, clinicId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const entries = await tx.patientAccountEntry.findMany({
    where: { clinicId, createdAt: { gte: start } },
    select: { entryType: true, direction: true, amount: true, paymentMethod: true },
  });

  let charges = 0;
  let payments = 0;
  let cashPayments = 0;

  for (const entry of entries) {
    const amount = entry.amount.toNumber();
    if (entry.entryType === ENTRY_TYPES.SERVICE_CHARGE && entry.direction === "DEBIT") {
      charges += amount;
    }
    if (entry.entryType === ENTRY_TYPES.PAYMENT && entry.direction === "CREDIT") {
      payments += amount;
      if (entry.paymentMethod === "CASH") cashPayments += amount;
    }
  }

  const openSession = await getOpenCashSession(tx, clinicId);
  let sessionExpected: number | null = null;
  if (openSession) {
    sessionExpected = await computeCashSessionExpected(
      tx,
      clinicId,
      openSession.id,
      openSession.openingBalance,
    );
  }

  const debtors = await listDebtors(tx, clinicId, 100);

  return {
    todayCharges: roundMoney(charges),
    todayPayments: roundMoney(payments),
    todayCashPayments: roundMoney(cashPayments),
    openDebtors: debtors.length,
    totalOutstanding: roundMoney(debtors.reduce((sum, row) => sum + row.balance, 0)),
    openSession: openSession
      ? {
          id: openSession.id,
          openingBalance: openSession.openingBalance.toNumber(),
          expectedBalance: sessionExpected,
          openedAt: openSession.openedAt.toISOString(),
          openedBy: openSession.openedBy.email,
        }
      : null,
  };
}
