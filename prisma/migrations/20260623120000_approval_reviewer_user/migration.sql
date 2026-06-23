ALTER TABLE "ApprovalRequest" ADD COLUMN "reviewerUserId" TEXT;

CREATE INDEX "ApprovalRequest_clinicId_reviewerUserId_status_idx" ON "ApprovalRequest"("clinicId", "reviewerUserId", "status");

ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
