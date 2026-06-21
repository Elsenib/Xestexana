CREATE TABLE "ApprovalRequest" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "requestedByUserId" TEXT NOT NULL,
  "reviewerRole" TEXT NOT NULL, "actionType" TEXT NOT NULL, "entityType" TEXT NOT NULL,
  "entityId" TEXT, "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT, "reviewedByUserId" TEXT, "reviewedAt" TIMESTAMP(3), "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ApprovalRequest_clinicId_reviewerRole_status_createdAt_idx" ON "ApprovalRequest"("clinicId", "reviewerRole", "status", "createdAt");
CREATE INDEX "ApprovalRequest_clinicId_requestedByUserId_status_idx" ON "ApprovalRequest"("clinicId", "requestedByUserId", "status");
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
