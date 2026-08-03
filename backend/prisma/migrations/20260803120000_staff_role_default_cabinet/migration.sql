-- AlterTable
ALTER TABLE `app_staff_roles`
ADD COLUMN `default_cabinet_id` INTEGER NULL;

CREATE INDEX `idx_default_cabinet_id` ON `app_staff_roles` (`default_cabinet_id`);

ALTER TABLE `app_staff_roles`
ADD CONSTRAINT `app_staff_roles_default_cabinet_id_fkey`
FOREIGN KEY (`default_cabinet_id`) REFERENCES `app_cabinets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
