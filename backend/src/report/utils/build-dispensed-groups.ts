export type DispensedGroupRow = {
  itemcode?: string;
  itemname?: string;
  modifyDate?: string | Date;
  qty?: number;
  cabinetUserName?: string;
  CabinetUserID?: number;
  StockID?: number;
  RowID?: number;
};

export interface DispensedReportGroup<T extends DispensedGroupRow = DispensedGroupRow> {
  itemcode: string;
  itemname: string;
  /** วันที่เบิก YYYY-MM-DD (UTC) */
  dispenseDate: string;
  /** เวลาเบิกของกลุ่ม (ใช้เรียงลำดับกลุ่ม) */
  dispenseTime: string;
  cabinetUserName: string;
  totalQty: number;
  items: T[];
}

function asDateTimeString(v?: string | Date | null): string {
  if (v == null || v === '') return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString();
  return String(v).trim();
}

function timeMs(v?: string | Date | null): number {
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : 0;
  }
  const t = new Date(v ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** วันที่ปฏิทิน UTC เป็น YYYY-MM-DD */
function toUtcYyyyMmDd(value?: string | Date | null): string {
  const s = asDateTimeString(value);
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC' });
}

function groupKeyParts(item: DispensedGroupRow): {
  itemcode: string;
  itemname: string;
  dispenseDate: string;
  dispenseTime: string;
  timeKey: number;
  key: string;
} {
  const itemcode = String(item.itemcode ?? '').trim() || '-';
  const itemname = String(item.itemname ?? '').trim() || itemcode;
  const dispenseTime = asDateTimeString(item.modifyDate);
  const timeKey = timeMs(item.modifyDate);
  const dispenseDate = toUtcYyyyMmDd(item.modifyDate);
  return {
    itemcode,
    itemname,
    dispenseDate,
    dispenseTime,
    timeKey,
    key: `${timeKey}|${itemname}`,
  };
}

/**
 * จัดกลุ่มรายการเบิกตาม เวลาเบิก + ชื่ออุปกรณ์
 * — รายการในกลุ่มเรียงเวลาเบิก DESC
 * — กลุ่มเรียงตามเวลา DESC แล้วตามชื่ออุปกรณ์ ASC
 */
export function buildDispensedGroups<T extends DispensedGroupRow>(
  items: T[],
): DispensedReportGroup<T>[] {
  if (!items || items.length === 0) return [];

  const byKey = new Map<string, T[]>();
  for (const item of items) {
    const { key } = groupKeyParts(item);
    const list = byKey.get(key);
    if (list) list.push(item);
    else byKey.set(key, [item]);
  }

  const groups: DispensedReportGroup<T>[] = [];
  for (const groupItems of byKey.values()) {
    const sortedItems = [...groupItems].sort(
      (a, b) => timeMs(b.modifyDate) - timeMs(a.modifyDate),
    );
    const totalQty = sortedItems.reduce((sum, i) => sum + (i.qty ?? 1), 0);
    const first = sortedItems[0];
    const parts = groupKeyParts(first);
    groups.push({
      itemcode: parts.itemcode,
      itemname: parts.itemname,
      dispenseDate: parts.dispenseDate,
      dispenseTime: asDateTimeString(first?.modifyDate) || parts.dispenseTime,
      cabinetUserName: String(first?.cabinetUserName ?? '').trim(),
      totalQty,
      items: sortedItems,
    });
  }

  groups.sort((a, b) => {
    const t = timeMs(b.dispenseTime) - timeMs(a.dispenseTime);
    if (t !== 0) return t;
    return a.itemname.localeCompare(b.itemname, 'th', { sensitivity: 'base' });
  });
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
