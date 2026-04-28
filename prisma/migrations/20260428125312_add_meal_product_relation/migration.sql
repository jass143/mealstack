/*
  Warnings:

  - You are about to drop the column `hasMeal` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `mealPriceCents` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `products` DROP COLUMN `hasMeal`,
    DROP COLUMN `mealPriceCents`,
    ADD COLUMN `mealProductId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `product_variants` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `priceCents` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `product_variants_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `type` ENUM('EXPENSE', 'WITHDRAWAL', 'TOP_UP') NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cash_transactions_tenantId_idx`(`tenantId`),
    INDEX `cash_transactions_tenantId_type_idx`(`tenantId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `upi_configs` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `platform` ENUM('PAYTM', 'GOOGLE_PAY', 'PHONE_PE') NOT NULL,
    `upiId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `upi_configs_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `upi_configs_tenantId_platform_key`(`tenantId`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `upi_payments` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `platform` ENUM('PAYTM', 'GOOGLE_PAY', 'PHONE_PE') NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `senderName` VARCHAR(191) NULL,
    `senderUpiId` VARCHAR(191) NULL,
    `amountCents` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SUCCESS',
    `orderId` VARCHAR(191) NULL,
    `merchantOrderId` VARCHAR(191) NULL,
    `rawPayload` TEXT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `upi_payments_tenantId_receivedAt_idx`(`tenantId`, `receivedAt`),
    INDEX `upi_payments_tenantId_platform_idx`(`tenantId`, `platform`),
    UNIQUE INDEX `upi_payments_tenantId_transactionId_key`(`tenantId`, `transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `products_mealProductId_idx` ON `products`(`mealProductId`);

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_mealProductId_fkey` FOREIGN KEY (`mealProductId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_transactions` ADD CONSTRAINT `cash_transactions_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_transactions` ADD CONSTRAINT `cash_transactions_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `upi_configs` ADD CONSTRAINT `upi_configs_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `upi_payments` ADD CONSTRAINT `upi_payments_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `upi_payments` ADD CONSTRAINT `upi_payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
