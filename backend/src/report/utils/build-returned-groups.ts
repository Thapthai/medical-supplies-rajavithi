export type ReturnedGroupRow = {
  itemcode?: string;
  itemname?: string;
  modifyDate?: string;
  qty?: number;
  RowID?: number;
  cabinetUserName?: string;
  CabinetUserID?: number;
  StockID?: number;
};

export interface ReturnedReportGroup<T extends ReturnedGroupRow = ReturnedGroupRow> {
  itemcode: string;
  itemname: string;
  /** วันที่เติม YYYY-MM-DD (UTC) ที่ใช้จัดกลุ่ม */
  returnDate: string;
  returnTime: string;
  cabinetUserName: string;
  totalQty: number;
  items: T[];
}

function timeMs(v?: string): number {
  const t = new Date(v ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function toUtcYyyyMmDd(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC' });
}

/** คีย์ผู้เติม — ไม่ยุบรายการที่ไม่มีชื่อรวมกันเมื่อคนละ user/ตู้ */
function requesterGroupKey(item: ReturnedGroupRow): string {
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

function groupKeyParts(item: ReturnedGroupRow): {
  itemcode: string;
  returnDate: string;
  cabinetUserName: string;
  key: string;
} {
  const itemcode = (item.itemcode ?? '').trim() || '-';
  const returnDate = toUtcYyyyMmDd(item.modifyDate);
  const cabinetUserName = (item.cabinetUserName ?? '').trim();
  const requesterKey = requesterGroupKey(item);
  return {
    itemcode,
    returnDate,
    cabinetUserName,
    key: `${itemcode}|${returnDate}|${requesterKey}`,
  };
}

/**
 * จัดกลุ่มรายการเติมตาม รหัสอุปกรณ์ + วันที่เติม + ชื่อผู้เติม
 * — รายการในกลุ่มเรียงเวลา DESC
 * — กลุ่มเรียงตามเวลาเติมล่าสุดในกลุ่ม DESC
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
      itemname: first?.itemname ?? parts.itemcode,
      returnDate: parts.returnDate,
      returnTime: first?.modifyDate ?? '',
      cabinetUserName: parts.cabinetUserName,
      totalQty,
      items: sortedItems,
    });
  }

  groups.sort((a, b) => timeMs(b.returnTime) - timeMs(a.returnTime));
  return groups;
}
