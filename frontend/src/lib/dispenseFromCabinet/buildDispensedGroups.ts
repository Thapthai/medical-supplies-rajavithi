import type { DispensedItem } from '@/app/admin/dispense-from-cabinet/types';
import { toUtcYyyyMmDd } from '@/lib/formatThaiDateTime';

export interface DispensedGroup {
  key: string;
  itemcode: string;
  itemname: string;
  /** วันที่เบิก (YYYY-MM-DD UTC) ที่ใช้จัดกลุ่ม */
  dispenseDate: string;
  dispenseTime: string;
  cabinetUserName: string;
  items: DispensedItem[];
  totalQty: number;
}

function timeMs(v?: string): number {
  const t = new Date(v ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** คีย์ผู้เบิก — ไม่ยุบรายการที่ไม่มีชื่อรวมกันเมื่อคนละ user/ตู้ */
function requesterGroupKey(item: DispensedItem): string {
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

function groupKeyParts(item: DispensedItem): {
  itemcode: string;
  dispenseDate: string;
  cabinetUserName: string;
  key: string;
} {
  const itemcode = (item.itemcode ?? '').trim() || '-';
  const dispenseDate = toUtcYyyyMmDd(item.modifyDate) || '-';
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
 * — รายการในกลุ่มเรียงเวลา DESC
 * — กลุ่มเรียงตามเวลาเบิกล่าสุดในกลุ่ม DESC
 */
export function buildDispensedGroups(items: DispensedItem[]): DispensedGroup[] {
  if (items.length === 0) return [];

  const byKey = new Map<string, DispensedItem[]>();
  for (const item of items) {
    const { key } = groupKeyParts(item);
    const list = byKey.get(key);
    if (list) list.push(item);
    else byKey.set(key, [item]);
  }

  const groups: DispensedGroup[] = [];
  for (const groupItems of byKey.values()) {
    const sortedItems = [...groupItems].sort(
      (a, b) => timeMs(b.modifyDate) - timeMs(a.modifyDate),
    );
    const totalQty = sortedItems.reduce((sum, i) => sum + (i.qty ?? 1), 0);
    const first = sortedItems[0];
    const parts = groupKeyParts(first);
    groups.push({
      key: parts.key,
      itemcode: parts.itemcode,
      itemname: first?.itemname ?? parts.itemcode,
      dispenseDate: parts.dispenseDate,
      dispenseTime: first?.modifyDate ?? '',
      cabinetUserName: parts.cabinetUserName,
      items: sortedItems,
      totalQty,
    });
  }

  groups.sort((a, b) => timeMs(b.dispenseTime) - timeMs(a.dispenseTime));
  return groups;
}
