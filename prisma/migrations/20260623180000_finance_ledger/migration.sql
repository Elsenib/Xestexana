CREATE TABLE "CashSession" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "openedByUserId" TEXT NOT NULL,
  "closedByUserId" TEXT,
  "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "expectedBalance" DECIMAL(14,2),
  "countedBalance" DECIMAL(14,2),
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "openNote" TEXT,
  "closeNote" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientAccountEntry" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "entryType" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "paymentMethod" TEXT,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "serviceId" TEXT,
  "description" TEXT NOT NULL,
  "receiptNumber" TEXT,
  "cashSessionId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientAccountEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CashSession_clinicId_status_openedAt_idx" ON "CashSession"("clinicId", "status", "openedAt");
CREATE INDEX "PatientAccountEntry_clinicId_patientId_createdAt_idx" ON "PatientAccountEntry"("clinicId", "patientId", "createdAt");
CREATE INDEX "PatientAccountEntry_clinicId_cashSessionId_createdAt_idx" ON "PatientAccountEntry"("clinicId", "cashSessionId", "createdAt");
CREATE INDEX "PatientAccountEntry_clinicId_entryType_createdAt_idx" ON "PatientAccountEntry"("clinicId", "entryType", "createdAt");

ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientAccountEntry" ADD CONSTRAINT "PatientAccountEntry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAccountEntry" ADD CONSTRAINT "PatientAccountEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAccountEntry" ADD CONSTRAINT "PatientAccountEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAccountEntry" ADD CONSTRAINT "PatientAccountEntry_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAccountEntry" ADD CONSTRAINT "PatientAccountEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
