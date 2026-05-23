-- CreateTable
CREATE TABLE "salespeople" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salespeople_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salespeople_userId_idx" ON "salespeople"("userId");

-- AddForeignKey
ALTER TABLE "salespeople" ADD CONSTRAINT "salespeople_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
