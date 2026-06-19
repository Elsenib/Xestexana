ALTER TABLE "MedicalRecord"
ADD COLUMN "reportType" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN "testResults" JSONB,
ADD COLUMN "attachments" JSONB;
