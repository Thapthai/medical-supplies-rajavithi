/** stock_id = last IPv4 octet − 49 (เช่น .50→1, .51→2, .52→3) */
const STOCK_ID_OCTET_OFFSET = 49;

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

export function parseCabinetIpAddress(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const ip = String(raw).trim();
  if (!ip) return null;
  if (!IPV4_RE.test(ip)) {
    throw new Error('รูปแบบ IP ไม่ถูกต้อง (เช่น 192.168.176.51)');
  }
  return ip;
}

export function stockIdFromCabinetIp(ip: string): number {
  const last = parseInt(ip.split('.').pop()!, 10);
  const stockId = last - STOCK_ID_OCTET_OFFSET;
  if (!Number.isFinite(stockId) || stockId < 1) {
    throw new Error(
      `เลขท้าย IP ต้องอย่างน้อย ${STOCK_ID_OCTET_OFFSET + 1} (ได้ stock_id ≥ 1) — ได้ท้าย ${last}`,
    );
  }
  return stockId;
}
