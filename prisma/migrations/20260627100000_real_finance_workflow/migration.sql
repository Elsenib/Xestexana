ALTER TABLE "TreatmentPlanItem"
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "completedByUserId" TEXT,
ADD COLUMN "accountEntryId" TEXT;

ALTER TABLE "CommissionEntry"
ADD COLUMN "paidBaseAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "earnedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "earnedAt" TIMESTAMP(3);

UPDATE "CommissionEntry"
SET "paidBaseAmount" = "baseAmount",
    "earnedAmount" = "amount",
    "status" = 'EARNED',
    "earnedAt" = "createdAt"
WHERE "sourceType" = 'MANUAL';

CREATE TABLE "PatientAccountAllocation" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "debitEntryId" TEXT NOT NULL,
  "creditEntryId" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientAccountAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreatmentPlanItem_accountEntryId_key"
ON "TreatmentPlanItem"("accountEntryId");

CREATE INDEX "TreatmentPlanItem_completedByUserId_completedAt_idx"
ON "TreatmentPlanItem"("completedByUserId", "completedAt");

CREATE UNIQUE INDEX "CommissionEntry_clinicId_sourceType_sourceId_key"
ON "CommissionEntry"("clinicId", "sourceType", "sourceId");

CREATE UNIQUE INDEX "PatientAccountAllocation_debitEntryId_creditEntryId_key"
ON "PatientAccountAllocation"("debitEntryId", "creditEntryId");

CREATE INDEX "PatientAccountAllocation_clinicId_debitEntryId_idx"
ON "PatientAccountAllocation"("clinicId", "debitEntryId");

CREATE INDEX "PatientAccountAllocation_clinicId_creditEntryId_idx"
ON "PatientAccountAllocation"("clinicId", "creditEntryId");

ALTER TABLE "TreatmentPlanItem"
ADD CONSTRAINT "TreatmentPlanItem_completedByUserId_fkey"
FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TreatmentPlanItem"
ADD CONSTRAINT "TreatmentPlanItem_accountEntryId_fkey"
FOREIGN KEY ("accountEntryId") REFERENCES "PatientAccountEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientAccountAllocation"
ADD CONSTRAINT "PatientAccountAllocation_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientAccountAllocation"
ADD CONSTRAINT "PatientAccountAllocation_debitEntryId_fkey"
FOREIGN KEY ("debitEntryId") REFERENCES "PatientAccountEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientAccountAllocation"
ADD CONSTRAINT "PatientAccountAllocation_creditEntryId_fkey"
FOREIGN KEY ("creditEntryId") REFERENCES "PatientAccountEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
