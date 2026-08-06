/** stock_id = last IPv4 octet − 49 (เช่น .50→1, .51→2, .52→3) */
export const CABINET_STOCK_ID_OCTET_OFFSET = 49;

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

export function isValidCabinetIpv4(ip: string): boolean {
  return IPV4_RE.test(ip.trim());
}

/** คืน stock_id หรือ null ถ้า IP ว่าง/ไม่ครบ; throw ไม่ได้ — ใช้ preview ใน UI */
export function previewStockIdFromCabinetIp(raw: string | undefined | null): number | null {
  const ip = (raw ?? '').trim();
  if (!ip || !IPV4_RE.test(ip)) return null;
  const last = parseInt(ip.split('.').pop()!, 10);
  const stockId = last - CABINET_STOCK_ID_OCTET_OFFSET;
  if (!Number.isFinite(stockId) || stockId < 1) return null;
  return stockId;
}
