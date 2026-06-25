CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorUserId" TEXT,
    "serviceId" TEXT,
    "percent" DECIMAL(5,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionEntry" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorUserId" TEXT NOT NULL,
    "patientId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "baseAmount" DECIMAL(14,2) NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommissionRule_clinicId_active_idx" ON "CommissionRule"("clinicId", "active");
CREATE INDEX "CommissionRule_clinicId_doctorUserId_idx" ON "CommissionRule"("clinicId", "doctorUserId");
CREATE INDEX "CommissionRule_clinicId_serviceId_idx" ON "CommissionRule"("clinicId", "serviceId");

CREATE INDEX "CommissionEntry_clinicId_doctorUserId_status_idx" ON "CommissionEntry"("clinicId", "doctorUserId", "status");
CREATE INDEX "CommissionEntry_clinicId_createdAt_idx" ON "CommissionEntry"("clinicId", "createdAt");
CREATE INDEX "CommissionEntry_clinicId_sourceType_sourceId_idx" ON "CommissionEntry"("clinicId", "sourceType", "sourceId");

ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_doctorUserId_fkey" FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_doctorUserId_fkey" FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
