/**
 * วันที่สำหรับ Date Picker
 * ค่าในระบบ/API ใช้ YYYY-MM-DD (ค.ศ.)
 * การแสดงผลใน input ใช้ dd/mm/YYYY (ค.ศ.) เช่น 04/09/2026
 * ยังรับปี พ.ศ. (>= 2400) เมื่อพิมพ์/วางค่าเก่าได้
 */

const BE_OFFSET = 543;

function buildCEFromParts(day: number, month: number, yearRaw: number): string | null {
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(yearRaw)) return null;
  // ปี 2 หลัก → สมมติ ค.ศ. 20xx (เช่น 30 → 2030)
  let year = yearRaw <= 99 ? 2000 + yearRaw : yearRaw;
  // ปี >= 2400 ถือเป็น พ.ศ. (รองรับค่าเก่า)
  if (year >= 2400) year -= BE_OFFSET;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getDate() !== day || date.getMonth() !== month - 1) return null;
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * แปลง YYYY-MM-DD (ค.ศ.) เป็น สตริง dd/mm/YYYY (ค.ศ.) เช่น 04/09/2026
 * (ชื่อฟังก์ชันเดิมคงไว้เพื่อไม่ต้องแก้ import ทั้งโปรเจกต์)
 */
export function formatCEToBEDMY(isoDate: string | null | undefined): string {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const trimmed = isoDate.trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (!match) return trimmed;
  const [, y, m, d] = match;
  const yearCE = parseInt(y!, 10);
  const month = parseInt(m!, 10);
  const day = parseInt(d!, 10);
  if (Number.isNaN(yearCE) || Number.isNaN(month) || Number.isNaN(day)) return trimmed;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${yearCE}`;
}

/**
 * แปลงสตริงวันที่เป็น YYYY-MM-DD (ค.ศ.) สำหรับส่ง API
 * รองรับ:
 * - d/m/yyyy, dd/mm/yyyy, วว/ดด/ปปปป (ค.ศ. หรือ พ.ศ. >= 2400)
 * - ตัวเลขล้วน 8 หลัก DDMMYYYY เช่น 02092030
 * - ตัวเลขล้วน 6 หลัก DDMMYY เช่น 050930 → 5/9/2030
 */
export function parseBEDMYToCE(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.trim().replace(/\s/g, '');
  if (!cleaned) return null;

  // ตัวเลขล้วน DDMMYYYY / DDMMYY
  if (/^\d{8}$/.test(cleaned)) {
    const day = parseInt(cleaned.slice(0, 2), 10);
    const month = parseInt(cleaned.slice(2, 4), 10);
    const year = parseInt(cleaned.slice(4, 8), 10);
    return buildCEFromParts(day, month, year);
  }
  if (/^\d{6}$/.test(cleaned)) {
    const day = parseInt(cleaned.slice(0, 2), 10);
    const month = parseInt(cleaned.slice(2, 4), 10);
    const year = parseInt(cleaned.slice(4, 6), 10);
    return buildCEFromParts(day, month, year);
  }

  const parts = cleaned.split(/[/\-.]/);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const day = parseInt(d!, 10);
  const month = parseInt(m!, 10);
  const year = parseInt(y!, 10);
  return buildCEFromParts(day, month, year);
}

/**
 * ได้วันนี้ในรูปแบบ YYYY-MM-DD (ค.ศ.)
 */
export function getTodayCE(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** เปรียบเทียบ YYYY-MM-DD — true ถ้า a >= b */
export function isYmdOnOrAfter(a: string, b: string): boolean {
  const aa = (a ?? '').trim().slice(0, 10);
  const bb = (b ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(aa) || !/^\d{4}-\d{2}-\d{2}$/.test(bb)) return false;
  return aa >= bb;
}
