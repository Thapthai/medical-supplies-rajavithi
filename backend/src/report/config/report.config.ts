import * as path from 'path';
import * as fs from 'fs';

/** รายงานสต๊อกอุปกรณ์ในตู้ - ชื่อไฟล์โลโก้ */
const CABINET_REPORT_LOGO_FILENAME = '3_logo_p-1-fit.png';

/** ฟอนต์ไทยสำหรับ PDF (โฟลเดอร์ backend/src/report/assets/fonts) */
const THAI_FONT_REGULAR = 'THSarabunNew.ttf';
const THAI_FONT_BOLD = 'THSarabunNew Bold.ttf';

/**
 * หาโฟลเดอร์ฟอนต์ไทยสำหรับรายงาน PDF
 * ใช้โฟลเดอร์ backend/src/report/assets/fonts (วาง THSarabunNew.ttf และ THSarabunNew Bold.ttf)
 */
export function resolveReportFontDir(): string | null {
  const candidates = [
    path.join(process.cwd(), 'dist', 'report', 'assets', 'fonts'),
    path.join(process.cwd(), 'src', 'report', 'assets', 'fonts'),
    path.join(__dirname, '..', 'assets', 'fonts'),
    path.join(process.cwd(), 'assets', 'fonts'),
    path.join(process.cwd(), 'backend', 'src', 'report', 'assets', 'fonts'),
  ];
  for (const dir of candidates) {
    const regularPath = path.join(dir, THAI_FONT_REGULAR);
    if (fs.existsSync(regularPath)) return dir;
  }
  return null;
}

export function getReportThaiFontPaths(): { regular: string; bold: string } | null {
  const dir = resolveReportFontDir();
  if (!dir) return null;
  const regular = path.join(dir, THAI_FONT_REGULAR);
  const bold = path.join(dir, THAI_FONT_BOLD);
  return {
    regular,
    bold: fs.existsSync(bold) ? bold : regular,
  };
}

/**
 * หา path ไฟล์โลโก้สำหรับรายงานสต๊อกอุปกรณ์ในตู้ (3_logo_p-1-fit.png)
 * ลองตามลำดับ: public/, dist/public/, uploads/items/, __dirname relative
 */
export function resolveReportLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'public', CABINET_REPORT_LOGO_FILENAME),
    path.join(process.cwd(), 'dist', 'public', CABINET_REPORT_LOGO_FILENAME),
    path.join(process.cwd(), 'backend', 'public', CABINET_REPORT_LOGO_FILENAME),
    path.join(process.cwd(), 'uploads', 'items', CABINET_REPORT_LOGO_FILENAME),
    path.join(process.cwd(), 'backend', 'uploads', 'items', CABINET_REPORT_LOGO_FILENAME),
    path.join(__dirname, '..', '..', '..', 'public', CABINET_REPORT_LOGO_FILENAME),
    path.join(__dirname, '..', '..', '..', '..', 'public', CABINET_REPORT_LOGO_FILENAME),
    path.join(__dirname, '..', '..', '..', '..', '..', 'public', CABINET_REPORT_LOGO_FILENAME),
    path.join(__dirname, '..', '..', '..', '..', 'uploads', 'items', CABINET_REPORT_LOGO_FILENAME),
    path.join(__dirname, '..', '..', '..', '..', '..', 'uploads', 'items', CABINET_REPORT_LOGO_FILENAME),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export const ReportConfig = {
  timezone: process.env.REPORT_TIMEZONE || 'Asia/Bangkok',
  locale: process.env.REPORT_LOCALE || 'th-TH',
  dateFormat: {
    date: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
    datetime: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  },
} as const;
