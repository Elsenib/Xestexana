CREATE TABLE "PatientAccountAllocationReversal" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "allocationId" TEXT NOT NULL,
  "refundEntryId" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientAccountAllocationReversal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionTransaction" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "commissionEntryId" TEXT NOT NULL,
  "doctorUserId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "baseAmount" DECIMAL(14,2) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommissionTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionPeriod" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CLOSED',
  "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "note" TEXT,
  "closedByUserId" TEXT NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommissionPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionSettlement" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "doctorUserId" TEXT NOT NULL,
  "earnedAmount" DECIMAL(14,2) NOT NULL,
  "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'UNPAID',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionPayout" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "reference" TEXT,
  "note" TEXT,
  "paidByUserId" TEXT NOT NULL,
  "cashSessionId" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientAccountAllocationReversal_allocationId_refundEntryId_key"
ON "PatientAccountAllocationReversal"("allocationId", "refundEntryId");
CREATE INDEX "PatientAccountAllocationReversal_clinicId_refundEntryId_idx"
ON "PatientAccountAllocationReversal"("clinicId", "refundEntryId");
CREATE INDEX "PatientAccountAllocationReversal_clinicId_allocationId_idx"
ON "PatientAccountAllocationReversal"("clinicId", "allocationId");

CREATE UNIQUE INDEX "CommissionTransaction_clinicId_type_sourceId_key"
ON "CommissionTransaction"("clinicId", "type", "sourceId");
CREATE INDEX "CommissionTransaction_clinicId_doctorUserId_createdAt_idx"
ON "CommissionTransaction"("clinicId", "doctorUserId", "createdAt");
CREATE INDEX "CommissionTransaction_commissionEntryId_createdAt_idx"
ON "CommissionTransaction"("commissionEntryId", "createdAt");

CREATE UNIQUE INDEX "CommissionPeriod_clinicId_startDate_endDate_key"
ON "CommissionPeriod"("clinicId", "startDate", "endDate");
CREATE INDEX "CommissionPeriod_clinicId_endDate_idx"
ON "CommissionPeriod"("clinicId", "endDate");

CREATE UNIQUE INDEX "CommissionSettlement_periodId_doctorUserId_key"
ON "CommissionSettlement"("periodId", "doctorUserId");
CREATE INDEX "CommissionSettlement_clinicId_doctorUserId_status_idx"
ON "CommissionSettlement"("clinicId", "doctorUserId", "status");

CREATE INDEX "CommissionPayout_clinicId_paidAt_idx"
ON "CommissionPayout"("clinicId", "paidAt");
CREATE INDEX "CommissionPayout_settlementId_paidAt_idx"
ON "CommissionPayout"("settlementId", "paidAt");
CREATE INDEX "CommissionPayout_cashSessionId_paidAt_idx"
ON "CommissionPayout"("cashSessionId", "paidAt");

ALTER TABLE "PatientAccountAllocationReversal"
ADD CONSTRAINT "PatientAccountAllocationReversal_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAccountAllocationReversal"
ADD CONSTRAINT "PatientAccountAllocationReversal_allocationId_fkey"
FOREIGN KEY ("allocationId") REFERENCES "PatientAccountAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAccountAllocationReversal"
ADD CONSTRAINT "PatientAccountAllocationReversal_refundEntryId_fkey"
FOREIGN KEY ("refundEntryId") REFERENCES "PatientAccountEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommissionTransaction"
ADD CONSTRAINT "CommissionTransaction_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionTransaction"
ADD CONSTRAINT "CommissionTransaction_commissionEntryId_fkey"
FOREIGN KEY ("commissionEntryId") REFERENCES "CommissionEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionTransaction"
ADD CONSTRAINT "CommissionTransaction_doctorUserId_fkey"
FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommissionPeriod"
ADD CONSTRAINT "CommissionPeriod_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionPeriod"
ADD CONSTRAINT "CommissionPeriod_closedByUserId_fkey"
FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommissionSettlement"
ADD CONSTRAINT "CommissionSettlement_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionSettlement"
ADD CONSTRAINT "CommissionSettlement_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "CommissionPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionSettlement"
ADD CONSTRAINT "CommissionSettlement_doctorUserId_fkey"
FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommissionPayout"
ADD CONSTRAINT "CommissionPayout_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionPayout"
ADD CONSTRAINT "CommissionPayout_settlementId_fkey"
FOREIGN KEY ("settlementId") REFERENCES "CommissionSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionPayout"
ADD CONSTRAINT "CommissionPayout_paidByUserId_fkey"
FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionPayout"
ADD CONSTRAINT "CommissionPayout_cashSessionId_fkey"
FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "CommissionTransaction" (
  "id", "clinicId", "commissionEntryId", "doctorUserId", "type",
  "sourceType", "sourceId", "baseAmount", "amount", "createdAt"
)
SELECT
  'backfill-' || allocation."id",
  allocation."clinicId",
  commission."id",
  commission."doctorUserId",
  'EARNING',
  'PatientAccountAllocation',
  allocation."id",
  allocation."amount",
  ROUND(allocation."amount" * commission."percent" / 100, 2),
  allocation."createdAt"
FROM "PatientAccountAllocation" allocation
JOIN "CommissionEntry" commission
  ON commission."clinicId" = allocation."clinicId"
 AND commission."sourceType" = 'SERVICE_CHARGE'
 AND commission."sourceId" = allocation."debitEntryId";
