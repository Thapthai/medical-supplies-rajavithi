/** เรียงข้อความแบบตัวเลขธรรมชาติ เช่น 7.5 มาก่อน 18.0 / 19.0 */
const naturalCollator = new Intl.Collator('th', {
  numeric: true,
  sensitivity: 'base',
});

export function naturalCompare(a: string, b: string): number {
  return naturalCollator.compare(a ?? '', b ?? '');
}
