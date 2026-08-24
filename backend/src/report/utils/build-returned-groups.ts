export type ReturnedGroupRow = {
  itemcode?: string;
  itemname?: string;
  modifyDate?: string | Date;
  qty?: number;
  RowID?: number;
  cabinetUserName?: string;
  CabinetUserID?: number;
  StockID?: number;
};

export interface ReturnedReportGroup<T extends ReturnedGroupRow = ReturnedGroupRow> {
  itemcode: string;
  itemname: string;
  /** วันที่เติม YYYY-MM-DD (UTC) */
  returnDate: string;
  returnTime: string;
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

function toUtcYyyyMmDd(value?: string | Date | null): string {
  const s = asDateTimeString(value);
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC' });
}

function groupKeyParts(item: ReturnedGroupRow): {
  itemcode: string;
  itemname: string;
  returnDate: string;
  returnTime: string;
  timeKey: number;
  key: string;
} {
  const itemcode = String(item.itemcode ?? '').trim() || '-';
  const itemname = String(item.itemname ?? '').trim() || itemcode;
  const returnTime = asDateTimeString(item.modifyDate);
  const timeKey = timeMs(item.modifyDate);
  const returnDate = toUtcYyyyMmDd(item.modifyDate);
  return {
    itemcode,
    itemname,
    returnDate,
    returnTime,
    timeKey,
    key: `${timeKey}|${itemname}`,
  };
}

/**
 * จัดกลุ่มรายการเติมตาม เวลาเติม + ชื่ออุปกรณ์
 * — รายการในกลุ่มเรียงเวลา DESC
 * — กลุ่มเรียงตามเวลา DESC แล้วตามชื่ออุปกรณ์ ASC
 */
export function buildReturnedGroups<T extends ReturnedGroupRow>(
  items: T[],
): ReturnedReportGroup<T>[] {
  if (!items || items.length === 0) return [];

  const byKey = new Map<string, T[]>();
  for (const item of items) {
    const { key } = groupKeyParts(item);
    const list = byKey.get(key);
    if (list) list.push(item);
    else byKey.set(key, [item]);
  }

  const groups: ReturnedReportGroup<T>[] = [];
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
      returnDate: parts.returnDate,
      returnTime: asDateTimeString(first?.modifyDate) || parts.returnTime,
      cabinetUserName: String(first?.cabinetUserName ?? '').trim(),
      totalQty,
      items: sortedItems,
    });
  }

  groups.sort((a, b) => {
    const t = timeMs(b.returnTime) - timeMs(a.returnTime);
    if (t !== 0) return t;
    return a.itemname.localeCompare(b.itemname, 'th', { sensitivity: 'base' });
  });
  return groups;
}
