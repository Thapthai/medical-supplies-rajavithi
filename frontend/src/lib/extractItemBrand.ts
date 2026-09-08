const BRAND_SEPARATOR = ' + ';
const DEFAULT_ITEM_BRANDS = ['Primus', 'Sensar', 'TECNIS'] as const;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** แปลง CSV จาก env เช่น "Primus,Sensar,TECNIS" */
export function parseItemBrandsEnv(raw?: string | null): string[] {
  if (!raw || !String(raw).trim()) return [...DEFAULT_ITEM_BRANDS];
  const list = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : [...DEFAULT_ITEM_BRANDS];
}

/**
 * ยี่ห้อจาก NEXT_PUBLIC_ITEM_BRANDS ใน .env (คั่นด้วย comma)
 * ต้องเป็น NEXT_PUBLIC_* เพื่อให้ client อ่านได้
 */
export function getKnownItemBrands(): string[] {
  return parseItemBrandsEnv(process.env.NEXT_PUBLIC_ITEM_BRANDS);
}

/** @deprecated ใช้ getKnownItemBrands() */
export const KNOWN_ITEM_BRANDS = DEFAULT_ITEM_BRANDS;

function matchKnownBrand(name: string, knownBrands: string[]): string | null {
  const ordered = [...knownBrands].sort((a, b) => b.length - a.length);
  for (const brand of ordered) {
    const re = new RegExp(`(?:^|[^A-Za-z0-9])${escapeRegExp(brand)}(?=[^A-Za-z0-9]|$)`, 'i');
    if (re.test(name)) return brand;
  }
  return null;
}

/**
 * ส่วนหน้าของชื่อก่อน " - " หรือ " + " (อันที่มาก่อน)
 * เช่น "AR40e | Sensar + 34.0 D" → "AR40e | Sensar"
 *     "AR40M | Sensar - 3.0 D" → "AR40M | Sensar"
 *     "A1UL22 | Primus - HD + 18.0 D" → "A1UL22 | Primus"
 */
export function extractItemModelPrefix(itemname: string | null | undefined): string {
  const name = String(itemname ?? '').trim();
  if (!name) return '';
  const minusIdx = name.indexOf(' - ');
  const plusIdx = name.indexOf(' + ');
  let cut = -1;
  if (minusIdx >= 0 && plusIdx >= 0) cut = Math.min(minusIdx, plusIdx);
  else if (minusIdx >= 0) cut = minusIdx;
  else if (plusIdx >= 0) cut = plusIdx;
  if (cut >= 0) return name.slice(0, cut).trim() || name;
  return name;
}

/**
 * ดึงยี่ห้อจากชื่ออุปกรณ์ ตาม NEXT_PUBLIC_ITEM_BRANDS
 * เช่น "AR40e | Sensar + 14.5 D" → "Sensar"
 */
export function extractItemBrand(itemname: string | null | undefined): string {
  const name = String(itemname ?? '').trim();
  if (!name) return '-';

  const known = matchKnownBrand(name, getKnownItemBrands());
  if (known) return known;

  const plusIdx = name.indexOf(BRAND_SEPARATOR);
  if (plusIdx >= 0) {
    const brand = name.slice(0, plusIdx).trim();
    return brand || name;
  }
  return name;
}

/** ส่วนหลัง " + " (เช่น "14.5 D") */
export function extractItemVariant(itemname: string | null | undefined): string | null {
  const name = String(itemname ?? '').trim();
  if (!name) return null;
  const plusIdx = name.indexOf(BRAND_SEPARATOR);
  if (plusIdx < 0) return null;
  const variant = name.slice(plusIdx + BRAND_SEPARATOR.length).trim();
  return variant || null;
}

export function isKnownItemBrand(brand: string | null | undefined): boolean {
  const b = String(brand ?? '');
  return getKnownItemBrands().some((k) => k.toLowerCase() === b.toLowerCase());
}

/** รวม prefix + ส่วนท้ายเป็น itemname */
export function joinItemNameWithPrefix(prefix: string, suffix: string): string {
  const p = prefix.trim();
  const s = suffix.trim();
  if (!p) return s;
  if (!s) return p;
  // ถ้าผู้ใช้พิมพ์ขึ้นต้นด้วย + หรือ - แล้ว ไม่เติม " + " ซ้ำ
  if (/^[+\-]/.test(s)) return `${p} ${s}`;
  return `${p} + ${s}`;
}
