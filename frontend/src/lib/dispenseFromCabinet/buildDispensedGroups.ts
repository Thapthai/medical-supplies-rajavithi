import type { DispensedItem } from '@/app/admin/dispense-from-cabinet/types';
import { toUtcYyyyMmDd } from '@/lib/formatThaiDateTime';

export interface DispensedGroup {
  key: string;
  itemcode: string;
  itemname: string;
  /** วันที่เบิก (YYYY-MM-DD UTC) */
  dispenseDate: string;
  dispenseTime: string;
  cabinetUserName: string;
  items: DispensedItem[];
  totalQty: number;
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

function groupKeyParts(item: DispensedItem): {
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
  const dispenseDate = toUtcYyyyMmDd(item.modifyDate) || '-';
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
 * — รายการในกลุ่มเรียงเวลา DESC
 * — กลุ่มเรียงตามเวลา DESC แล้วตามชื่ออุปกรณ์ ASC
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
      itemname: parts.itemname,
      dispenseDate: parts.dispenseDate,
      dispenseTime: asDateTimeString(first?.modifyDate) || parts.dispenseTime,
      cabinetUserName: String(first?.cabinetUserName ?? '').trim(),
      items: sortedItems,
      totalQty,
    });
  }

  groups.sort((a, b) => {
    const t = timeMs(b.dispenseTime) - timeMs(a.dispenseTime);
    if (t !== 0) return t;
    return a.itemname.localeCompare(b.itemname, 'th', { sensitivity: 'base' });
  });
  return groups;
}
