-- StaffRole: Division หลักที่เป็นค่าเริ่มต้นของฟิลเตอร์ (defaultFilters)
ALTER TABLE `app_staff_roles`
ADD COLUMN `default_department_id` INTEGER NULL;

CREATE INDEX `idx_default_department_id` ON `app_staff_roles` (`default_department_id`);

ALTER TABLE `app_staff_roles`
ADD CONSTRAINT `app_staff_roles_default_department_id_fkey`
FOREIGN KEY (`default_department_id`) REFERENCES `department` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE;
