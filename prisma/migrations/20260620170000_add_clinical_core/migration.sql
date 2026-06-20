CREATE TABLE "PatientAnamnesisVersion" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "allergies" JSONB NOT NULL DEFAULT '[]', "chronicConditions" JSONB NOT NULL DEFAULT '[]',
  "infectiousDiseases" JSONB NOT NULL DEFAULT '[]', "regularMedications" JSONB NOT NULL DEFAULT '[]',
  "pregnancyOrRisk" TEXT, "pastSurgeries" TEXT, "medicalNotes" TEXT, "criticalAlert" TEXT,
  "confirmedByPatient" BOOLEAN NOT NULL DEFAULT false, "confirmedAt" TIMESTAMP(3),
  "recordedByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientAnamnesisVersion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClinicalEncounter" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT NOT NULL, "appointmentId" TEXT,
  "doctorUserId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "complaint" TEXT,
  "examination" TEXT, "diagnosis" TEXT, "clinicalNotes" TEXT, "recommendations" TEXT,
  "prescription" TEXT, "nextVisitAt" TIMESTAMP(3), "signedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalEncounter_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OdontogramSnapshot" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT NOT NULL, "clinicalEncounterId" TEXT,
  "numberingSystem" TEXT NOT NULL DEFAULT 'FDI', "dentition" TEXT NOT NULL DEFAULT 'PERMANENT',
  "entries" JSONB NOT NULL, "note" TEXT, "authoredByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OdontogramSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClinicalEncounterRevision" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "encounterId" TEXT NOT NULL, "revision" INTEGER NOT NULL,
  "reason" TEXT NOT NULL, "previousContent" JSONB NOT NULL, "replacementContent" JSONB NOT NULL,
  "authoredByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalEncounterRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PatientAnamnesisVersion_patientId_version_key" ON "PatientAnamnesisVersion"("patientId", "version");
CREATE INDEX "PatientAnamnesisVersion_clinicId_patientId_createdAt_idx" ON "PatientAnamnesisVersion"("clinicId", "patientId", "createdAt");
CREATE INDEX "ClinicalEncounter_clinicId_patientId_createdAt_idx" ON "ClinicalEncounter"("clinicId", "patientId", "createdAt");
CREATE INDEX "ClinicalEncounter_clinicId_doctorUserId_status_idx" ON "ClinicalEncounter"("clinicId", "doctorUserId", "status");
CREATE INDEX "ClinicalEncounter_appointmentId_idx" ON "ClinicalEncounter"("appointmentId");
CREATE INDEX "OdontogramSnapshot_clinicId_patientId_createdAt_idx" ON "OdontogramSnapshot"("clinicId", "patientId", "createdAt");
CREATE INDEX "OdontogramSnapshot_clinicalEncounterId_idx" ON "OdontogramSnapshot"("clinicalEncounterId");
CREATE UNIQUE INDEX "ClinicalEncounterRevision_encounterId_revision_key" ON "ClinicalEncounterRevision"("encounterId", "revision");
CREATE INDEX "ClinicalEncounterRevision_clinicId_encounterId_createdAt_idx" ON "ClinicalEncounterRevision"("clinicId", "encounterId", "createdAt");
ALTER TABLE "PatientAnamnesisVersion" ADD CONSTRAINT "PatientAnamnesisVersion_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAnamnesisVersion" ADD CONSTRAINT "PatientAnamnesisVersion_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAnamnesisVersion" ADD CONSTRAINT "PatientAnamnesisVersion_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalEncounter" ADD CONSTRAINT "ClinicalEncounter_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalEncounter" ADD CONSTRAINT "ClinicalEncounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalEncounter" ADD CONSTRAINT "ClinicalEncounter_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalEncounter" ADD CONSTRAINT "ClinicalEncounter_doctorUserId_fkey" FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OdontogramSnapshot" ADD CONSTRAINT "OdontogramSnapshot_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OdontogramSnapshot" ADD CONSTRAINT "OdontogramSnapshot_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OdontogramSnapshot" ADD CONSTRAINT "OdontogramSnapshot_clinicalEncounterId_fkey" FOREIGN KEY ("clinicalEncounterId") REFERENCES "ClinicalEncounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OdontogramSnapshot" ADD CONSTRAINT "OdontogramSnapshot_authoredByUserId_fkey" FOREIGN KEY ("authoredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalEncounterRevision" ADD CONSTRAINT "ClinicalEncounterRevision_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalEncounterRevision" ADD CONSTRAINT "ClinicalEncounterRevision_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "ClinicalEncounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalEncounterRevision" ADD CONSTRAINT "ClinicalEncounterRevision_authoredByUserId_fkey" FOREIGN KEY ("authoredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
