-- Drop the commission ledger table (with all its FKs) and the commissionPercent
-- column on brands. Commission is no longer a platform feature — brand owners
-- handle franchisee billing off-platform.

-- DropForeignKey
ALTER TABLE `commission_ledger` DROP FOREIGN KEY `commission_ledger_brandId_fkey`;
ALTER TABLE `commission_ledger` DROP FOREIGN KEY `commission_ledger_tenantId_fkey`;
ALTER TABLE `commission_ledger` DROP FOREIGN KEY `commission_ledger_orderId_fkey`;

-- DropTable
DROP TABLE `commission_ledger`;

-- AlterTable
ALTER TABLE `brands` DROP COLUMN `commissionPercent`;
