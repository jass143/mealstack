-- AlterTable
ALTER TABLE `products` ADD COLUMN `hasMeal` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `mealPriceCents` INTEGER NULL;
