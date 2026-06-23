import { Prisma, type PrismaClient } from "@prisma/client";

export const ENTRY_TYPES = {
  SERVICE_CHARGE: "SERVICE_CHARGE",
  PAYMENT: "PAYMENT",
  DEPOSIT: "DEPOSIT",
  REFUND: "REFUND",
  DISCOUNT: "DISCOUNT",
} as const;

export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER", "DEPOSIT"] as const;
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
  const payments = await tx.patientAccountEntry.findMany({
    where: {
      clinicId,
      cashSessionId: sessionId,
      entryType: { in: [ENTRY_TYPES.PAYMENT, ENTRY_TYPES.DEPOSIT] },
      paymentMethod: "CASH",
    },
    select: { amount: true },
  });
  const cashIn = payments.reduce((sum, row) => sum + row.amount.toNumber(), 0);
  return roundMoney(openingBalance.toNumber() + cashIn);
}

function roundMoney(value: number) {
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

  if (input.paymentMethod === "CASH") {
    if (!input.cashSessionId) throw new Error("CASH_SESSION_REQUIRED");
    const session = await tx.cashSession.findFirst({
      where: { id: input.cashSessionId, clinicId: input.clinicId, status: "OPEN" },
    });
    if (!session) throw new Error("CASH_SESSION_CLOSED");
  }

  if (input.paymentMethod === "DEPOSIT") {
    const depositBalance = await computeDepositBalance(tx, input.clinicId, input.patientId);
    if (depositBalance < input.amount) throw new Error("INSUFFICIENT_DEPOSIT");
  }

  return tx.patientAccountEntry.create({
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
    select: { id: true, patientId: true, status: true },
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
      OR: [
        { entryType: ENTRY_TYPES.DEPOSIT, direction: "CREDIT" },
        { entryType: ENTRY_TYPES.PAYMENT, paymentMethod: "DEPOSIT" },
      ],
    },
    select: { entryType: true, amount: true, paymentMethod: true },
  });
  let balance = 0;
  for (const row of rows) {
    if (row.entryType === ENTRY_TYPES.DEPOSIT) balance += row.amount.toNumber();
    if (row.entryType === ENTRY_TYPES.PAYMENT && row.paymentMethod === "DEPOSIT") {
      balance -= row.amount.toNumber();
    }
  }
  return roundMoney(balance);
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

  return tx.patientAccountEntry.create({
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
}

export async function recordRefund(
  tx: Tx,
  input: {
    clinicId: string;
    patientId: string;
    createdByUserId: string;
    amount: number;
    description: string;
    referencePaymentId?: string | null;
  },
) {
  await assertFinanceWritable(tx, input.clinicId);
  if (input.amount <= 0) throw new Error("INVALID_AMOUNT");

  const patient = await tx.patientProfile.findFirst({
    where: { id: input.patientId, clinicId: input.clinicId },
    select: { id: true },
  });
  if (!patient) throw new Error("PATIENT_NOT_FOUND");

  if (input.referencePaymentId) {
    const payment = await tx.patientAccountEntry.findFirst({
      where: {
        id: input.referencePaymentId,
        clinicId: input.clinicId,
        patientId: input.patientId,
        entryType: ENTRY_TYPES.PAYMENT,
      },
    });
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  }

  return tx.patientAccountEntry.create({
    data: {
      clinicId: input.clinicId,
      patientId: input.patientId,
      entryType: ENTRY_TYPES.REFUND,
      direction: "DEBIT",
      amount: input.amount,
      description: input.description,
      referenceType: input.referencePaymentId ? "PatientAccountEntry" : null,
      referenceId: input.referencePaymentId ?? null,
      receiptNumber: nextReceiptNumber(),
      createdByUserId: input.createdByUserId,
    },
  });
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
