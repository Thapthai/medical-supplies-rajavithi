const BRAND_SEPARATOR = ' + ';

/** ดึงยี่ห้อจากชื่ออุปกรณ์ — ข้อความก่อน " + " */
export function extractItemBrand(itemname: string | null | undefined): string {
  const name = String(itemname ?? '').trim();
  if (!name) return '-';
  const plusIdx = name.indexOf(BRAND_SEPARATOR);
  if (plusIdx >= 0) {
    const brand = name.slice(0, plusIdx).trim();
    return brand || name;
  }
  return name;
}

/** ส่วนหลัง " + " (เช่น "07.0 D") */
export function extractItemVariant(itemname: string | null | undefined): string | null {
  const name = String(itemname ?? '').trim();
  if (!name) return null;
  const plusIdx = name.indexOf(BRAND_SEPARATOR);
  if (plusIdx < 0) return null;
  const variant = name.slice(plusIdx + BRAND_SEPARATOR.length).trim();
  return variant || null;
}
