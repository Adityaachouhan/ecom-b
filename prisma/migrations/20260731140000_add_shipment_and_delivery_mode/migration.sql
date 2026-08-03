-- AlterTable
ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "deliveryMode" TEXT NOT NULL DEFAULT 'own_fleet';
ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "shippingPriority" TEXT NOT NULL DEFAULT 'cost';

-- CreateTable
CREATE TABLE IF NOT EXISTS "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryMode" TEXT NOT NULL,
    "providerName" TEXT,
    "awbNumber" TEXT,
    "trackingUrl" TEXT,
    "rateCharged" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'created',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_orderId_key" ON "Shipment"("orderId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;