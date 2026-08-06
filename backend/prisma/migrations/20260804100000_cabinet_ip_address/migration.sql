-- Add IP address for cabinets; stock_id is derived from last octet (octet - 49).
ALTER TABLE `app_cabinets`
ADD COLUMN `ip_address` VARCHAR(45) NULL AFTER `stock_id`;

CREATE UNIQUE INDEX `app_cabinets_ip_address_key` ON `app_cabinets`(`ip_address`);
