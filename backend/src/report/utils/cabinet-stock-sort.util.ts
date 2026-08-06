/** แถวขั้นต่ำสำหรับเรียงรายงานสต๊อกในตู้ */
export type CabinetStockSortableRow = {
  seq?: number;
  item_code?: string;
  item_name?: string;
  balance_qty?: number;
};

/**
 * เรียงรายงานสต๊อกในตู้:
 * 1) มีจำนวนในตู้ (>0) อยู่บนก่อน รายการที่เป็น 0 อยู่ล่าง
 * 2) ภายในกลุ่มเดียวกันเรียงชื่ออุปกรณ์ A–Z
 * แล้วตั้งลำดับ (seq) ใหม่ 1..n
 */
export function sortCabinetStockRowsForReport<T extends CabinetStockSortableRow>(rows: T[]): T[] {
  const sorted = [...(rows ?? [])].sort((a, b) => {
    const balA = Number(a.balance_qty ?? 0);
    const balB = Number(b.balance_qty ?? 0);
    const hasA = balA > 0 ? 0 : 1;
    const hasB = balB > 0 ? 0 : 1;
    if (hasA !== hasB) return hasA - hasB;
    const nameA = (a.item_name ?? a.item_code ?? '').toString();
    const nameB = (b.item_name ?? b.item_code ?? '').toString();
    return nameA.localeCompare(nameB, 'th', { sensitivity: 'base' });
  });
  return sorted.map((row, idx) => ({ ...row, seq: idx + 1 }));
}
