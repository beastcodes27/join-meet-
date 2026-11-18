/** Interpret datetime-local in the browser's explicitly displayed local timezone. */
export function scheduleInstant(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const date = new Date(local);
  if (!Number.isFinite(date.getTime())) return null;
  const pad = (value: number) => String(value).padStart(2, '0');
  const normalized = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return normalized === local ? date.toISOString() : null;
}
export function meetingTime(instant: string, timezone?: string): string {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) return 'Time unavailable';
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(date); }
  catch { return date.toLocaleString(); }
}
export function loginReturn(path: string | null): string {
  return path && /^\/m\/[a-f0-9]{32}$/.test(path) ? path : '/dashboard';
}
