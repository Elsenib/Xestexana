CREATE TABLE "WarrantyTemplate" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "conditions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientWarranty" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "treatmentPlanId" TEXT,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientWarranty_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WarrantyTemplate_clinicId_active_idx" ON "WarrantyTemplate"("clinicId", "active");
CREATE INDEX "PatientWarranty_clinicId_patientId_status_idx" ON "PatientWarranty"("clinicId", "patientId", "status");
CREATE INDEX "PatientWarranty_clinicId_expiresAt_idx" ON "PatientWarranty"("clinicId", "expiresAt");

ALTER TABLE "WarrantyTemplate" ADD CONSTRAINT "WarrantyTemplate_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientWarranty" ADD CONSTRAINT "PatientWarranty_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientWarranty" ADD CONSTRAINT "PatientWarranty_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientWarranty" ADD CONSTRAINT "PatientWarranty_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientWarranty" ADD CONSTRAINT "PatientWarranty_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WarrantyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientWarranty" ADD CONSTRAINT "PatientWarranty_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
