export type DispensedGroupRow = {
  itemcode?: string;
  itemname?: string;
  modifyDate?: string;
  qty?: number;
  cabinetUserName?: string;
  CabinetUserID?: number;
  StockID?: number;
  RowID?: number;
};

export interface DispensedReportGroup<T extends DispensedGroupRow = DispensedGroupRow> {
  itemcode: string;
  itemname: string;
  /** วันที่เบิก YYYY-MM-DD (UTC) ที่ใช้จัดกลุ่ม */
  dispenseDate: string;
  /** เวลาเบิกล่าสุดในกลุ่ม (ใช้เรียงลำดับกลุ่ม) */
  dispenseTime: string;
  cabinetUserName: string;
  totalQty: number;
  items: T[];
}

function timeMs(v?: string): number {
  const t = new Date(v ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** วันที่ปฏิทิน UTC เป็น YYYY-MM-DD */
function toUtcYyyyMmDd(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC' });
}

/** คีย์ผู้เบิก — ไม่ยุบรายการที่ไม่มีชื่อรวมกันเมื่อคนละ user/ตู้ */
function requesterGroupKey(item: DispensedGroupRow): string {
  const name = (item.cabinetUserName ?? '').trim();
  if (name) return `n:${name}`;
  const uid = item.CabinetUserID;
  if (uid != null && Number(uid) > 0) return `u:${uid}`;
  const stock = item.StockID;
  if (stock != null && Number(stock) > 0) return `s:${stock}`;
  const rowId = item.RowID;
  if (rowId != null && Number(rowId) > 0) return `r:${rowId}`;
  return 'anon';
}

function groupKeyParts(item: DispensedGroupRow): {
  itemcode: string;
  dispenseDate: string;
  cabinetUserName: string;
  key: string;
} {
  const itemcode = (item.itemcode ?? '').trim() || '-';
  const dispenseDate = toUtcYyyyMmDd(item.modifyDate);
  const cabinetUserName = (item.cabinetUserName ?? '').trim();
  const requesterKey = requesterGroupKey(item);
  return {
    itemcode,
    dispenseDate,
    cabinetUserName,
    key: `${itemcode}|${dispenseDate}|${requesterKey}`,
  };
}

/**
 * จัดกลุ่มรายการเบิกตาม รหัสอุปกรณ์ + วันที่เบิก + ชื่อผู้เบิก
 * — รายการในกลุ่มเรียงเวลาเบิก DESC
 * — กลุ่มเรียงตามเวลาเบิกล่าสุดในกลุ่ม DESC
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
      itemname: first?.itemname ?? parts.itemcode,
      dispenseDate: parts.dispenseDate,
      dispenseTime: first?.modifyDate ?? '',
      cabinetUserName: parts.cabinetUserName,
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
