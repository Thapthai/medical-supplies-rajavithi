/** แปลง Date เป็นสตริงรูปแบบ YYYY-MM-DD */
export function TransformDateFormat(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** ตัวแรกเป็นตัวใหญ่ อักษรที่เหลือเป็นตัวเล็ก */
export function FirstUppercase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
