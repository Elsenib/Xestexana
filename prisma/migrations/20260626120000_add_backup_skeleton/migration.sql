CREATE TABLE "BackupJob" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "summary" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupJob_clinicId_status_createdAt_idx" ON "BackupJob"("clinicId", "status", "createdAt");
CREATE INDEX "BackupJob_clinicId_createdAt_idx" ON "BackupJob"("clinicId", "createdAt");

ALTER TABLE "BackupJob" ADD CONSTRAINT "BackupJob_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BackupJob" ADD CONSTRAINT "BackupJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
