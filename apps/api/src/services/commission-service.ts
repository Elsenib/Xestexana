import { Prisma, type PrismaClient } from "@prisma/client";
import { getOpenCashSession, roundMoney } from "./finance-service.js";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

export async function closeCommissionPeriod(
  tx: Tx,
  input: {
    clinicId: string;
    startDate: Date;
    endDate: Date;
    closedByUserId: string;
    note?: string | null;
  },
) {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  if (endDate < startDate) throw new Error("INVALID_PERIOD");
  if (endDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new Error("FUTURE_PERIOD");

  const overlap = await tx.commissionPeriod.findFirst({
    where: {
      clinicId: input.clinicId,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true },
  });
  if (overlap) throw new Error("PERIOD_OVERLAP");

  const transactions = await tx.commissionTransaction.findMany({
    where: {
      clinicId: input.clinicId,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: { doctorUserId: true, amount: true },
  });
  const byDoctor = new Map<string, number>();
  for (const row of transactions) {
    byDoctor.set(row.doctorUserId, roundMoney((byDoctor.get(row.doctorUserId) ?? 0) + row.amount.toNumber()));
  }
  const settlements = [...byDoctor.entries()]
    .map(([doctorUserId, earnedAmount]) => ({ doctorUserId, earnedAmount: roundMoney(earnedAmount) }))
    .filter((row) => Math.abs(row.earnedAmount) >= 0.01);
  const totalAmount = roundMoney(settlements.reduce((sum, row) => sum + row.earnedAmount, 0));

  return tx.commissionPeriod.create({
    data: {
      clinicId: input.clinicId,
      startDate,
      endDate,
      totalAmount,
      note: input.note ?? null,
      closedByUserId: input.closedByUserId,
      settlements: {
        create: settlements.map((row) => ({
          clinicId: input.clinicId,
          doctorUserId: row.doctorUserId,
          earnedAmount: row.earnedAmount,
          status: row.earnedAmount > 0 ? "UNPAID" : "CLOSED",
        })),
      },
    },
    include: { settlements: true },
  });
}

export async function recordCommissionPayout(
  tx: Tx,
  input: {
    clinicId: string;
    settlementId: string;
    amount: number;
    paymentMethod: "CASH" | "CARD" | "TRANSFER";
    reference?: string | null;
    note?: string | null;
    paidByUserId: string;
  },
) {
  if (input.amount <= 0) throw new Error("INVALID_AMOUNT");
  const settlement = await tx.commissionSettlement.findFirst({
    where: { id: input.settlementId, clinicId: input.clinicId },
  });
  if (!settlement) throw new Error("SETTLEMENT_NOT_FOUND");
  const available = roundMoney(settlement.earnedAmount.toNumber() - settlement.paidAmount.toNumber());
  if (available <= 0 || input.amount > available + 0.009) throw new Error("PAYOUT_EXCEEDS_BALANCE");

  let cashSessionId: string | null = null;
  if (input.paymentMethod === "CASH") {
    const session = await getOpenCashSession(tx, input.clinicId);
    if (!session) throw new Error("CASH_SESSION_REQUIRED");
    cashSessionId = session.id;
  }

  const payout = await tx.commissionPayout.create({
    data: {
      clinicId: input.clinicId,
      settlementId: settlement.id,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      reference: input.reference ?? null,
      note: input.note ?? null,
      paidByUserId: input.paidByUserId,
      cashSessionId,
    },
  });
  const paidAmount = roundMoney(settlement.paidAmount.toNumber() + input.amount);
  const fullyPaid = paidAmount >= settlement.earnedAmount.toNumber() - 0.009;
  await tx.commissionSettlement.update({
    where: { id: settlement.id },
    data: {
      paidAmount,
      status: fullyPaid ? "PAID" : "PARTIAL",
      paidAt: fullyPaid ? new Date() : null,
    },
  });
  return payout;
}

export function money(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : value.toNumber();
}
