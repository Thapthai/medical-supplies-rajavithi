import { toUtcYyyyMmDd } from '@/lib/formatThaiDateTime';

export type CabinetStockRow = {
  StockID?: number;
  RowID?: number;
  RfidCode?: string;
  ItemCode?: string;
  Qty?: number;
  IsStock?: boolean | number;
  LastCabinetModify?: string;
  item?: {
    itemcode?: string;
    itemname?: string;
  };
};

export type CabinetStockGroup<T extends CabinetStockRow = CabinetStockRow> = {
  key: string;
  itemcode: string;
  itemname: string;
  /** วันที่แก้ไข YYYY-MM-DD (UTC) ที่ใช้จัดกลุ่ม */
  modifyDate: string;
  /** เวลาแก้ไขล่าสุดในกลุ่ม (สำหรับเรียง/แสดง) */
  modifyTime: string;
  totalQty: number;
  inCabinetCount: number;
  dispensedCount: number;
  items: T[];
};

function timeMs(v?: string): number {
  const t = new Date(v ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function isInCabinet(stock: CabinetStockRow): boolean {
  return stock.IsStock === true || stock.IsStock === 1;
}

function groupKeyParts(item: CabinetStockRow): {
  itemcode: string;
  modifyDate: string;
  key: string;
} {
  const itemcode = (item.item?.itemcode ?? item.ItemCode ?? '').trim() || '-';
  const modifyDate = item.LastCabinetModify
    ? toUtcYyyyMmDd(String(item.LastCabinetModify)) || '-'
    : '-';
  return {
    itemcode,
    modifyDate,
    key: `${itemcode}|${modifyDate}`,
  };
}

/**
 * จัดกลุ่มรายการสต็อกในตู้ตาม รหัสอุปกรณ์ + วันที่แก้ไข (UTC)
 * — รายการในกลุ่มเรียงเวลา DESC
 * — กลุ่มเรียงตามเวลาแก้ไขล่าสุด DESC
 */
export function buildCabinetStockGroups<T extends CabinetStockRow>(
  items: T[],
): CabinetStockGroup<T>[] {
  if (!items || items.length === 0) return [];

  const byKey = new Map<string, T[]>();
  for (const item of items) {
    const { key } = groupKeyParts(item);
    const list = byKey.get(key);
    if (list) list.push(item);
    else byKey.set(key, [item]);
  }

  const groups: CabinetStockGroup<T>[] = [];
  for (const groupItems of byKey.values()) {
    const sortedItems = [...groupItems].sort(
      (a, b) => timeMs(b.LastCabinetModify) - timeMs(a.LastCabinetModify),
    );
    const first = sortedItems[0];
    const parts = groupKeyParts(first);
    const totalQty = sortedItems.reduce((sum, i) => sum + (Number(i.Qty) || 1), 0);
    const inCabinetCount = sortedItems.filter(isInCabinet).length;
    groups.push({
      key: parts.key,
      itemcode: parts.itemcode,
      itemname: first?.item?.itemname ?? parts.itemcode,
      modifyDate: parts.modifyDate,
      modifyTime: first?.LastCabinetModify ?? '',
      totalQty,
      inCabinetCount,
      dispensedCount: sortedItems.length - inCabinetCount,
      items: sortedItems,
    });
  }

  groups.sort((a, b) => timeMs(b.modifyTime) - timeMs(a.modifyTime));
  return groups;
}
