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
} = await import("../apps/api/dist/services/finance-service.js");

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

      await recordPayment(tx, {
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

      verified = true;
      throw rollback;
    }, { timeout: 20_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }

  assert.equal(verified, true);
});
