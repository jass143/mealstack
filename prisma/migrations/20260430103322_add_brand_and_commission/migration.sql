-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `brandId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('SUPERADMIN', 'BRAND_OWNER', 'VENDOR', 'MANAGER') NOT NULL DEFAULT 'MANAGER';

-- CreateTable
CREATE TABLE `brands` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `commissionPercent` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `brands_ownerUserId_key`(`ownerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_ledger` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `paidRef` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `commission_ledger_orderId_key`(`orderId`),
    INDEX `commission_ledger_brandId_status_idx`(`brandId`, `status`),
    INDEX `commission_ledger_brandId_createdAt_idx`(`brandId`, `createdAt`),
    INDEX `commission_ledger_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `tenants_brandId_idx` ON `tenants`(`brandId`);

-- AddForeignKey
ALTER TABLE `brands` ADD CONSTRAINT `brands_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_ledger` ADD CONSTRAINT `commission_ledger_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_ledger` ADD CONSTRAINT `commission_ledger_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_ledger` ADD CONSTRAINT `commission_ledger_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
