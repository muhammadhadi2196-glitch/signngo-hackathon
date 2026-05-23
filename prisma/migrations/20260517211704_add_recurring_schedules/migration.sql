-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RecurringType" AS ENUM ('INVOICE', 'QUOTE');

-- CreateTable
CREATE TABLE "recurring_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "RecurringType" NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "lastRunDate" TIMESTAMP(3),
    "status" "RecurringStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoSend" BOOLEAN NOT NULL DEFAULT true,
    "occurrencesRun" INTEGER NOT NULL DEFAULT 0,
    "maxOccurrences" INTEGER,
    "templateData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_generated" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "quoteId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "recurring_generated_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_schedules_userId_status_idx" ON "recurring_schedules"("userId", "status");

-- CreateIndex
CREATE INDEX "recurring_schedules_nextRunDate_status_idx" ON "recurring_schedules"("nextRunDate", "status");

-- CreateIndex
CREATE INDEX "recurring_generated_scheduleId_idx" ON "recurring_generated"("scheduleId");

-- AddForeignKey
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_generated" ADD CONSTRAINT "recurring_generated_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "recurring_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
