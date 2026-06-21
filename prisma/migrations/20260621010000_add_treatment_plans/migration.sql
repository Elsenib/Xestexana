CREATE TABLE "Service" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "code" TEXT NOT NULL,
  "name" TEXT NOT NULL, "category" TEXT NOT NULL, "price" DECIMAL(14,2) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TreatmentPlan" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT NOT NULL,
  "doctorUserId" TEXT NOT NULL, "title" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "currentVersion" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TreatmentPlanVersion" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "treatmentPlanId" TEXT NOT NULL,
  "version" INTEGER NOT NULL, "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "note" TEXT, "createdByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TreatmentPlanVersion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TreatmentPlanItem" (
  "id" TEXT NOT NULL, "treatmentPlanVersionId" TEXT NOT NULL, "serviceId" TEXT NOT NULL,
  "tooth" TEXT, "quantity" DECIMAL(14,3) NOT NULL DEFAULT 1, "unitPrice" DECIMAL(14,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNED', CONSTRAINT "TreatmentPlanItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Service_clinicId_code_key" ON "Service"("clinicId", "code");
CREATE INDEX "Service_clinicId_active_category_idx" ON "Service"("clinicId", "active", "category");
CREATE INDEX "TreatmentPlan_clinicId_patientId_createdAt_idx" ON "TreatmentPlan"("clinicId", "patientId", "createdAt");
CREATE INDEX "TreatmentPlan_clinicId_status_updatedAt_idx" ON "TreatmentPlan"("clinicId", "status", "updatedAt");
CREATE UNIQUE INDEX "TreatmentPlanVersion_treatmentPlanId_version_key" ON "TreatmentPlanVersion"("treatmentPlanId", "version");
CREATE INDEX "TreatmentPlanVersion_clinicId_treatmentPlanId_createdAt_idx" ON "TreatmentPlanVersion"("clinicId", "treatmentPlanId", "createdAt");
CREATE INDEX "TreatmentPlanItem_treatmentPlanVersionId_idx" ON "TreatmentPlanItem"("treatmentPlanVersionId");
CREATE INDEX "TreatmentPlanItem_serviceId_idx" ON "TreatmentPlanItem"("serviceId");
ALTER TABLE "Service" ADD CONSTRAINT "Service_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_doctorUserId_fkey" FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlanVersion" ADD CONSTRAINT "TreatmentPlanVersion_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlanVersion" ADD CONSTRAINT "TreatmentPlanVersion_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlanVersion" ADD CONSTRAINT "TreatmentPlanVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlanItem" ADD CONSTRAINT "TreatmentPlanItem_treatmentPlanVersionId_fkey" FOREIGN KEY ("treatmentPlanVersionId") REFERENCES "TreatmentPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlanItem" ADD CONSTRAINT "TreatmentPlanItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
