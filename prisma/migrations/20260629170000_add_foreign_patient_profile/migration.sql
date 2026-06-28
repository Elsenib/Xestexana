ALTER TABLE "PatientProfile"
ADD COLUMN "patientType" TEXT NOT NULL DEFAULT 'LOCAL',
ADD COLUMN "citizenshipCountryCode" TEXT NOT NULL DEFAULT 'AZ',
ADD COLUMN "identityDocumentType" TEXT NOT NULL DEFAULT 'NATIONAL_ID',
ADD COLUMN "identityDocumentExpiry" TIMESTAMP(3),
ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'AZ',
ADD COLUMN "interpreterRequired" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX "PatientProfile_clinicId_identityNumber_key";

CREATE UNIQUE INDEX "PatientProfile_clinicId_citizenshipCountryCode_identityDocumentType_identityNumber_key"
ON "PatientProfile"("clinicId", "citizenshipCountryCode", "identityDocumentType", "identityNumber");

CREATE INDEX "PatientProfile_clinicId_patientType_citizenshipCountryCode_idx"
ON "PatientProfile"("clinicId", "patientType", "citizenshipCountryCode");
