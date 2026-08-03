export type DispensedGroupRow = {
  itemcode?: string;
  itemname?: string;
  modifyDate?: string;
  qty?: number;
};

export interface DispensedReportGroup<T extends DispensedGroupRow = DispensedGroupRow> {
  itemcode: string;
  itemname: string;
  /** เวลาเบิกล่าสุดในกลุ่ม (ใช้เรียงลำดับกลุ่ม) */
  dispenseTime: string;
  totalQty: number;
  items: T[];
}

function timeMs(v?: string): number {
  const t = new Date(v ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * จัดกลุ่มรายการเบิกตามรหัสอุปกรณ์ (itemcode)
 * — รายการในกลุ่มเรียงเวลาเบิก DESC
 * — กลุ่มเรียงตามเวลาเบิกล่าสุดในกลุ่ม DESC
 */
export function buildDispensedGroups<T extends DispensedGroupRow>(
  items: T[],
): DispensedReportGroup<T>[] {
  if (!items || items.length === 0) return [];

  const byCode = new Map<string, T[]>();
  for (const item of items) {
    const code = (item.itemcode ?? '').trim() || '-';
    const list = byCode.get(code);
    if (list) list.push(item);
    else byCode.set(code, [item]);
  }

  const groups: DispensedReportGroup<T>[] = [];
  for (const [itemcode, groupItems] of byCode) {
    const sortedItems = [...groupItems].sort(
      (a, b) => timeMs(b.modifyDate) - timeMs(a.modifyDate),
    );
    const totalQty = sortedItems.reduce((sum, i) => sum + (i.qty ?? 1), 0);
    const first = sortedItems[0];
    groups.push({
      itemcode,
      itemname: first?.itemname ?? itemcode,
      dispenseTime: first?.modifyDate ?? '',
      totalQty,
      items: sortedItems,
    });
  }

  groups.sort((a, b) => timeMs(b.dispenseTime) - timeMs(a.dispenseTime));
  return groups;
}

/** เรียงแถบรายการเดียว — ตรง ORDER BY ist.LastCabinetModify DESC, i.itemname ASC */
export function sortDispensedItemsForReport<T extends DispensedGroupRow>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const tA = timeMs(a.modifyDate);
    const tB = timeMs(b.modifyDate);
    if (tB !== tA) return tB - tA;
    const nameA = (a.itemname ?? a.itemcode ?? '').toString();
    const nameB = (b.itemname ?? b.itemcode ?? '').toString();
    return nameA.localeCompare(nameB, 'th', { sensitivity: 'base' });
  });
}
