/*
  Warnings:

  - Added the required column `clinicId` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `DoctorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `MedicalRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `PatientProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `ScheduleSlot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "logo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("channel", "createdAt", "doctorId", "endsAt", "id", "notes", "patientId", "startsAt", "status", "updatedAt") SELECT "channel", "createdAt", "doctorId", "endsAt", "id", "notes", "patientId", "startsAt", "status", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE INDEX "Appointment_clinicId_doctorId_startsAt_idx" ON "Appointment"("clinicId", "doctorId", "startsAt");
CREATE INDEX "Appointment_clinicId_patientId_startsAt_idx" ON "Appointment"("clinicId", "patientId", "startsAt");
CREATE INDEX "Appointment_clinicId_status_startsAt_idx" ON "Appointment"("clinicId", "status", "startsAt");
CREATE TABLE "new_DoctorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "roomNumber" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DoctorProfile_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DoctorProfile" ("active", "branch", "createdAt", "firstName", "id", "lastName", "roomNumber", "title", "updatedAt", "userId") SELECT "active", "branch", "createdAt", "firstName", "id", "lastName", "roomNumber", "title", "updatedAt", "userId" FROM "DoctorProfile";
DROP TABLE "DoctorProfile";
ALTER TABLE "new_DoctorProfile" RENAME TO "DoctorProfile";
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");
CREATE INDEX "DoctorProfile_clinicId_branch_active_idx" ON "DoctorProfile"("clinicId", "branch", "active");
CREATE TABLE "new_MedicalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "treatmentPlan" TEXT NOT NULL,
    "prescribedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MedicalRecord_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MedicalRecord" ("createdAt", "diagnosis", "id", "patientId", "prescribedBy", "treatmentPlan", "updatedAt") SELECT "createdAt", "diagnosis", "id", "patientId", "prescribedBy", "treatmentPlan", "updatedAt" FROM "MedicalRecord";
DROP TABLE "MedicalRecord";
ALTER TABLE "new_MedicalRecord" RENAME TO "MedicalRecord";
CREATE INDEX "MedicalRecord_clinicId_patientId_createdAt_idx" ON "MedicalRecord"("clinicId", "patientId", "createdAt");
CREATE TABLE "new_PatientProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "identityNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "bloodType" TEXT,
    "allergies" TEXT,
    "chronicConditions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PatientProfile_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PatientProfile" ("allergies", "birthDate", "bloodType", "chronicConditions", "createdAt", "firstName", "gender", "id", "identityNumber", "lastName", "phone", "updatedAt", "userId") SELECT "allergies", "birthDate", "bloodType", "chronicConditions", "createdAt", "firstName", "gender", "id", "identityNumber", "lastName", "phone", "updatedAt", "userId" FROM "PatientProfile";
DROP TABLE "PatientProfile";
ALTER TABLE "new_PatientProfile" RENAME TO "PatientProfile";
CREATE UNIQUE INDEX "PatientProfile_userId_key" ON "PatientProfile"("userId");
CREATE INDEX "PatientProfile_clinicId_lastName_firstName_idx" ON "PatientProfile"("clinicId", "lastName", "firstName");
CREATE UNIQUE INDEX "PatientProfile_clinicId_identityNumber_key" ON "PatientProfile"("clinicId", "identityNumber");
CREATE TABLE "new_ScheduleSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "slotDuration" INTEGER NOT NULL DEFAULT 15,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduleSlot_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleSlot_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScheduleSlot" ("createdAt", "dayOfWeek", "doctorId", "endMinute", "id", "slotDuration", "startMinute", "updatedAt") SELECT "createdAt", "dayOfWeek", "doctorId", "endMinute", "id", "slotDuration", "startMinute", "updatedAt" FROM "ScheduleSlot";
DROP TABLE "ScheduleSlot";
ALTER TABLE "new_ScheduleSlot" RENAME TO "ScheduleSlot";
CREATE INDEX "ScheduleSlot_clinicId_doctorId_dayOfWeek_idx" ON "ScheduleSlot"("clinicId", "doctorId", "dayOfWeek");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "passwordHash", "role", "updatedAt") SELECT "createdAt", "email", "id", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_clinicId_role_idx" ON "User"("clinicId", "role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Clinic_active_idx" ON "Clinic"("active");
