CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'OTHER',
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "interest" TEXT,
  "note" TEXT,
  "assignedToUserId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "convertedPatientId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CRMActivity" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "leadId" TEXT,
  "patientId" TEXT,
  "type" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'PHONE',
  "summary" TEXT NOT NULL,
  "nextActionAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CRMActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_clinicId_status_createdAt_idx" ON "Lead"("clinicId", "status", "createdAt");
CREATE INDEX "Lead_clinicId_phone_idx" ON "Lead"("clinicId", "phone");
CREATE INDEX "Lead_clinicId_assignedToUserId_status_idx" ON "Lead"("clinicId", "assignedToUserId", "status");
CREATE INDEX "CRMActivity_clinicId_leadId_createdAt_idx" ON "CRMActivity"("clinicId", "leadId", "createdAt");
CREATE INDEX "CRMActivity_clinicId_patientId_createdAt_idx" ON "CRMActivity"("clinicId", "patientId", "createdAt");
CREATE INDEX "CRMActivity_clinicId_type_createdAt_idx" ON "CRMActivity"("clinicId", "type", "createdAt");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
