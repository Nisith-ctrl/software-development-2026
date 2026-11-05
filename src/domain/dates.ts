/** YYYY-MM-DD in the device's own time zone (toISOString would give the UTC date). */
export function localIsoDate(t: number | Date = Date.now()): string {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
