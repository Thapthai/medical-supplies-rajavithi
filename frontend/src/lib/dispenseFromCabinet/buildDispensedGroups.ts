import type { DispensedItem } from '@/app/admin/dispense-from-cabinet/types';

export interface DispensedGroup {
  key: string;
  itemcode: string;
  itemname: string;
  dispenseTime: string;
  items: DispensedItem[];
  totalQty: number;
}

function timeMs(v?: string): number {
  const t = new Date(v ?? 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** จัดกลุ่มรายการเบิกตามรหัสอุปกรณ์ — รายการในกลุ่มเรียงเวลา DESC */
export function buildDispensedGroups(items: DispensedItem[]): DispensedGroup[] {
  if (items.length === 0) return [];

  const byCode = new Map<string, DispensedItem[]>();
  for (const item of items) {
    const code = (item.itemcode ?? '').trim() || '-';
    const list = byCode.get(code);
    if (list) list.push(item);
    else byCode.set(code, [item]);
  }

  const groups: DispensedGroup[] = [];
  for (const [itemcode, groupItems] of byCode) {
    const sortedItems = [...groupItems].sort(
      (a, b) => timeMs(b.modifyDate) - timeMs(a.modifyDate),
    );
    const totalQty = sortedItems.reduce((sum, i) => sum + (i.qty ?? 1), 0);
    const first = sortedItems[0];
    groups.push({
      key: itemcode,
      itemcode,
      itemname: first?.itemname ?? itemcode,
      dispenseTime: first?.modifyDate ?? '',
      items: sortedItems,
      totalQty,
    });
  }

  groups.sort((a, b) => timeMs(b.dispenseTime) - timeMs(a.dispenseTime));
  return groups;
}
