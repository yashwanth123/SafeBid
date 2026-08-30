-- CreateEnum
CREATE TYPE "JobRequestStatus" AS ENUM ('OPEN', 'CLAIMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "job_requests" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "suggestedCents" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "JobRequestStatus" NOT NULL DEFAULT 'OPEN',
    "claimedById" TEXT,
    "bookingId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_requests_bookingId_key" ON "job_requests"("bookingId");

-- CreateIndex
CREATE INDEX "job_requests_status_createdAt_idx" ON "job_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "job_requests_category_idx" ON "job_requests"("category");

-- CreateIndex
CREATE INDEX "job_requests_latitude_longitude_idx" ON "job_requests"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
