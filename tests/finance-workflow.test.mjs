import assert from "node:assert/strict";
import { after, test } from "node:test";
import dotenv from "dotenv";

dotenv.config({ path: "apps/api/.env" });

const { PrismaClient } = await import("@prisma/client");
const {
  allocateExistingCreditsToCharge,
  computePatientBalance,
  createChargeCommission,
  recordCharge,
  recordPayment,
  recordRefund,
} = await import("../apps/api/dist/services/finance-service.js");
const { closeCommissionPeriod, recordCommissionPayout } = await import("../apps/api/dist/services/commission-service.js");

const prisma = new PrismaClient();
const rollback = new Error("ROLLBACK_FINANCE_WORKFLOW_TEST");

after(async () => {
  await prisma.$disconnect();
});

test("service charge, partial payment and doctor commission stay in sync", async () => {
  let verified = false;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({ data: { name: `Finance test ${suffix}` } });
      const doctor = await tx.user.create({
        data: {
          clinicId: clinic.id,
          email: `doctor-${suffix}@test.local`,
          passwordHash: "test-only",
          role: "DOCTOR",
        },
      });
      const patientUser = await tx.user.create({
        data: {
          clinicId: clinic.id,
          email: `patient-${suffix}@test.local`,
          passwordHash: "test-only",
          role: "PATIENT",
        },
      });
      const patient = await tx.patientProfile.create({
        data: {
          clinicId: clinic.id,
          userId: patientUser.id,
          identityNumber: `TEST-${suffix}`,
          firstName: "Test",
          lastName: "Patient",
          phone: "+994000000000",
          gender: "OTHER",
          birthDate: new Date("1990-01-01T00:00:00.000Z"),
        },
      });
      const service = await tx.service.create({
        data: {
          clinicId: clinic.id,
          code: `TEST-${suffix}`,
          name: "Workflow test service",
          category: "TEST",
          price: 100,
        },
      });
      await tx.commissionRule.create({
        data: { clinicId: clinic.id, doctorUserId: doctor.id, serviceId: service.id, percent: 10 },
      });

      const charge = await recordCharge(tx, {
        clinicId: clinic.id,
        patientId: patient.id,
        createdByUserId: doctor.id,
        description: service.name,
        amount: 100,
        serviceId: service.id,
        referenceType: "TestProcedure",
        referenceId: suffix,
      });
      await createChargeCommission(tx, {
        clinicId: clinic.id,
        doctorUserId: doctor.id,
        patientId: patient.id,
        serviceId: service.id,
        chargeEntryId: charge.id,
        baseAmount: 100,
      });
      await allocateExistingCreditsToCharge(tx, {
        clinicId: clinic.id,
        patientId: patient.id,
        chargeEntryId: charge.id,
      });

      await recordPayment(tx, {
        clinicId: clinic.id,
        patientId: patient.id,
        createdByUserId: doctor.id,
        amount: 40,
        paymentMethod: "CARD",
        description: "Partial test payment",
      });
      const partial = await tx.commissionEntry.findFirstOrThrow({
        where: { clinicId: clinic.id, sourceId: charge.id },
      });
      assert.equal(partial.status, "PARTIAL");
      assert.equal(partial.paidBaseAmount.toNumber(), 40);
      assert.equal(partial.earnedAmount.toNumber(), 4);
      assert.equal(await computePatientBalance(tx, clinic.id, patient.id), 60);

      const finalPayment = await recordPayment(tx, {
        clinicId: clinic.id,
        patientId: patient.id,
        createdByUserId: doctor.id,
        amount: 60,
        paymentMethod: "CARD",
        description: "Final test payment",
      });
      const earned = await tx.commissionEntry.findFirstOrThrow({
        where: { clinicId: clinic.id, sourceId: charge.id },
      });
      assert.equal(earned.status, "EARNED");
      assert.equal(earned.paidBaseAmount.toNumber(), 100);
      assert.equal(earned.earnedAmount.toNumber(), 10);
      assert.equal(await computePatientBalance(tx, clinic.id, patient.id), 0);
      assert.equal(await tx.patientAccountAllocation.count({ where: { clinicId: clinic.id } }), 2);

      await recordRefund(tx, {
        clinicId: clinic.id,
        patientId: patient.id,
        createdByUserId: doctor.id,
        amount: 20,
        description: "Test refund",
        referencePaymentId: finalPayment.id,
      });
      const reversed = await tx.commissionEntry.findFirstOrThrow({
        where: { clinicId: clinic.id, sourceId: charge.id },
      });
      assert.equal(reversed.status, "PARTIAL");
      assert.equal(reversed.paidBaseAmount.toNumber(), 80);
      assert.equal(reversed.earnedAmount.toNumber(), 8);
      assert.equal(await computePatientBalance(tx, clinic.id, patient.id), 20);
      assert.equal(await tx.patientAccountAllocationReversal.count({ where: { clinicId: clinic.id } }), 1);
      assert.equal(await tx.commissionTransaction.count({ where: { clinicId: clinic.id, type: "REVERSAL" } }), 1);

      await recordPayment(tx, {
        clinicId: clinic.id,
        patientId: patient.id,
        createdByUserId: doctor.id,
        amount: 20,
        paymentMethod: "CARD",
        description: "Replacement payment after refund",
      });
      const restored = await tx.commissionEntry.findFirstOrThrow({
        where: { clinicId: clinic.id, sourceId: charge.id },
      });
      assert.equal(restored.status, "EARNED");
      assert.equal(restored.earnedAmount.toNumber(), 10);
      assert.equal(await computePatientBalance(tx, clinic.id, patient.id), 0);

      const now = new Date();
      const period = await closeCommissionPeriod(tx, {
        clinicId: clinic.id,
        startDate: now,
        endDate: now,
        closedByUserId: doctor.id,
        note: "Integration test period",
      });
      assert.equal(period.totalAmount.toNumber(), 10);
      assert.equal(period.settlements.length, 1);
      assert.equal(period.settlements[0].earnedAmount.toNumber(), 10);

      await recordCommissionPayout(tx, {
        clinicId: clinic.id,
        settlementId: period.settlements[0].id,
        amount: 10,
        paymentMethod: "TRANSFER",
        paidByUserId: doctor.id,
      });
      const settlement = await tx.commissionSettlement.findUniqueOrThrow({
        where: { id: period.settlements[0].id },
      });
      assert.equal(settlement.status, "PAID");
      assert.equal(settlement.paidAmount.toNumber(), 10);
      assert.equal(await tx.commissionPayout.count({ where: { clinicId: clinic.id } }), 1);

      verified = true;
      throw rollback;
    }, { timeout: 60_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }

  assert.equal(verified, true);
});
