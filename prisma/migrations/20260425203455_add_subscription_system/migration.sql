-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clinic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "logo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "subscriptionPlan" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "subscriptionStart" DATETIME,
    "subscriptionEnd" DATETIME,
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxPatients" INTEGER NOT NULL DEFAULT 100
);
INSERT INTO "new_Clinic" ("active", "address", "createdAt", "id", "logo", "name", "phone", "updatedAt") SELECT "active", "address", "createdAt", "id", "logo", "name", "phone", "updatedAt" FROM "Clinic";
DROP TABLE "Clinic";
ALTER TABLE "new_Clinic" RENAME TO "Clinic";
CREATE INDEX "Clinic_active_idx" ON "Clinic"("active");
CREATE INDEX "Clinic_subscriptionStatus_idx" ON "Clinic"("subscriptionStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
