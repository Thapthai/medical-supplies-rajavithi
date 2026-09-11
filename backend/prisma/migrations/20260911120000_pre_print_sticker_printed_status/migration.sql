-- สถานะเอกสารเตรียมพิมพ์สติ๊กเกอร์: PREPARED = เตรียมพิมพ์, PRINTED = พิมพ์แล้ว
-- คอลัมน์ `status` มีอยู่แล้วจาก 20260902120000_add_pre_print_stickers
-- migration นี้ยืนยันค่าเริ่มต้น และ normalize ค่าที่ไม่อยู่ในชุดที่รองรับ

ALTER TABLE `app_pre_print_stickers`
  MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'PREPARED';

UPDATE `app_pre_print_stickers`
SET `status` = 'PREPARED'
WHERE `status` NOT IN ('PREPARED', 'PRINTED');
