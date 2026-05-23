-- CreateEnum
CREATE TYPE "FieldAssignee" AS ENUM ('SENDER', 'RECIPIENT');

-- AlterTable
ALTER TABLE "document_fields" ADD COLUMN     "assignedTo" "FieldAssignee" NOT NULL DEFAULT 'RECIPIENT',
ADD COLUMN     "prefilledImagePath" TEXT,
ADD COLUMN     "prefilledValue" TEXT;
