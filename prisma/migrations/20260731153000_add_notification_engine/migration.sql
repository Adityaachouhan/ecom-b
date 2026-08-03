-- AlterTable
ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "lowStockThreshold" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "bodyTemplate" TEXT NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refId" TEXT,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationTemplate_eventType_channel_key" ON "NotificationTemplate"("eventType", "channel");