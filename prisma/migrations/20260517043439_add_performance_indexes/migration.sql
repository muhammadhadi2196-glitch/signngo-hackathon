-- CreateIndex
CREATE INDEX "invoices_userId_status_idx" ON "invoices"("userId", "status");

-- CreateIndex
CREATE INDEX "quotes_userId_status_idx" ON "quotes"("userId", "status");
