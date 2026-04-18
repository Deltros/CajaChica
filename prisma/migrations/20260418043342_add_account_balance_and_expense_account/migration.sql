-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "currentBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "accountId" TEXT;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
