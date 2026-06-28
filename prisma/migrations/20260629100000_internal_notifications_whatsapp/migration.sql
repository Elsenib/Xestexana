ALTER TABLE "PatientProfile" ADD COLUMN "phoneNormalized" TEXT;

UPDATE "PatientProfile"
SET "phoneNormalized" = CASE
  WHEN LENGTH(REGEXP_REPLACE("phone", '[^0-9]', '', 'g')) = 10
       AND LEFT(REGEXP_REPLACE("phone", '[^0-9]', '', 'g'), 1) = '0'
    THEN '994' || SUBSTRING(REGEXP_REPLACE("phone", '[^0-9]', '', 'g') FROM 2)
  WHEN LENGTH(REGEXP_REPLACE("phone", '[^0-9]', '', 'g')) = 9
    THEN '994' || REGEXP_REPLACE("phone", '[^0-9]', '', 'g')
  WHEN LEFT(REGEXP_REPLACE("phone", '[^0-9]', '', 'g'), 2) = '00'
    THEN SUBSTRING(REGEXP_REPLACE("phone", '[^0-9]', '', 'g') FROM 3)
  ELSE REGEXP_REPLACE("phone", '[^0-9]', '', 'g')
END;

CREATE INDEX "PatientProfile_clinicId_phoneNormalized_idx"
ON "PatientProfile"("clinicId", "phoneNormalized");

CREATE TABLE "UserNotification" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppConversation" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "assignedUserId" TEXT,
  "phone" TEXT NOT NULL,
  "lastMessageAt" TIMESTAMP(3),
  "lastInboundAt" TIMESTAMP(3),
  "lastOutboundAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppMessage" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "sentByUserId" TEXT,
  "providerMessageId" TEXT,
  "direction" TEXT NOT NULL,
  "messageType" TEXT NOT NULL DEFAULT 'TEXT',
  "body" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserNotification_recipientUserId_readAt_createdAt_idx"
ON "UserNotification"("recipientUserId", "readAt", "createdAt");
CREATE INDEX "UserNotification_clinicId_type_createdAt_idx"
ON "UserNotification"("clinicId", "type", "createdAt");

CREATE UNIQUE INDEX "WhatsAppConversation_patientId_key"
ON "WhatsAppConversation"("patientId");
CREATE INDEX "WhatsAppConversation_clinicId_lastMessageAt_idx"
ON "WhatsAppConversation"("clinicId", "lastMessageAt");
CREATE INDEX "WhatsAppConversation_clinicId_assignedUserId_lastInboundAt_idx"
ON "WhatsAppConversation"("clinicId", "assignedUserId", "lastInboundAt");
CREATE INDEX "WhatsAppConversation_clinicId_phone_idx"
ON "WhatsAppConversation"("clinicId", "phone");

CREATE UNIQUE INDEX "WhatsAppMessage_providerMessageId_key"
ON "WhatsAppMessage"("providerMessageId");
CREATE INDEX "WhatsAppMessage_clinicId_conversationId_occurredAt_idx"
ON "WhatsAppMessage"("clinicId", "conversationId", "occurredAt");
CREATE INDEX "WhatsAppMessage_clinicId_direction_occurredAt_idx"
ON "WhatsAppMessage"("clinicId", "direction", "occurredAt");

ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_recipientUserId_fkey"
FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WhatsAppConversation"
ADD CONSTRAINT "WhatsAppConversation_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppConversation"
ADD CONSTRAINT "WhatsAppConversation_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppConversation"
ADD CONSTRAINT "WhatsAppConversation_assignedUserId_fkey"
FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WhatsAppMessage"
ADD CONSTRAINT "WhatsAppMessage_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppMessage"
ADD CONSTRAINT "WhatsAppMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppMessage"
ADD CONSTRAINT "WhatsAppMessage_sentByUserId_fkey"
FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
