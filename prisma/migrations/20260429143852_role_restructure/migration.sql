/*
  Warnings:

  - You are about to alter the column `role` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(7))` to `Enum(EnumId(0))`.

*/
-- AlterTable
ALTER TABLE `users` MODIFY `tenantId` VARCHAR(191) NULL,
    MODIFY `role` ENUM('SUPERADMIN', 'VENDOR', 'MANAGER') NOT NULL DEFAULT 'MANAGER';

-- CreateIndex
CREATE INDEX `users_email_idx` ON `users`(`email`);
