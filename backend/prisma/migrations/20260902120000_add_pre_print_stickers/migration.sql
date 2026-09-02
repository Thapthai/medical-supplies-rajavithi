-- เอกสารเตรียมพิมพ์สติ๊กเกอร์

CREATE TABLE `app_pre_print_stickers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `doc_no` VARCHAR(32) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PREPARED',
    `remark` TEXT NULL,
    `total_lines` INTEGER NOT NULL DEFAULT 0,
    `total_sheets` INTEGER NOT NULL DEFAULT 0,
    `created_by_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `app_pre_print_stickers_doc_no_key`(`doc_no`),
    INDEX `app_pre_print_stickers_created_at_idx`(`created_at` DESC),
    INDEX `app_pre_print_stickers_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `app_pre_print_sticker_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pre_print_sticker_id` INTEGER NOT NULL,
    `line_order` INTEGER NOT NULL DEFAULT 0,
    `itemcode` VARCHAR(25) NOT NULL,
    `item_name` VARCHAR(255) NULL,
    `expire_date` DATE NULL,
    `copies` INTEGER NOT NULL DEFAULT 1,
    `is_main` BOOLEAN NOT NULL DEFAULT false,
    `lot_no` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `app_pre_print_sticker_details_pre_print_sticker_id_idx`(`pre_print_sticker_id`),
    INDEX `app_pre_print_sticker_details_itemcode_idx`(`itemcode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `app_pre_print_stickers`
ADD CONSTRAINT `app_pre_print_stickers_created_by_user_id_fkey`
FOREIGN KEY (`created_by_user_id`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `app_pre_print_sticker_details`
ADD CONSTRAINT `app_pre_print_sticker_details_pre_print_sticker_id_fkey`
FOREIGN KEY (`pre_print_sticker_id`) REFERENCES `app_pre_print_stickers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `app_pre_print_sticker_details`
ADD CONSTRAINT `app_pre_print_sticker_details_itemcode_fkey`
FOREIGN KEY (`itemcode`) REFERENCES `item`(`itemcode`) ON DELETE RESTRICT ON UPDATE CASCADE;
