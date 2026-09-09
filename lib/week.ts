export const WEEKDAYS_KO = ["월", "화", "수", "목", "금", "토", "일"] as const;

/** Parse a YYYY-MM-DD string into a UTC Date at noon (tz-safe for date math). */
function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function toISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday (ISO weekday 1) of the week containing `iso` or today. */
export function mondayOf(iso?: string): string {
  const base = iso ? parseISO(iso) : parseISO(toISO(new Date(Date.now())));
  const dow = base.getUTCDay(); // 0=Sun..6=Sat
  const deltaToMonday = dow === 0 ? -6 : 1 - dow;
  base.setUTCDate(base.getUTCDate() + deltaToMonday);
  return toISO(base);
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/** True if `iso` is a valid YYYY-MM-DD date. */
export function isValidISO(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = parseISO(iso);
  return toISO(d) === iso;
}

/** "9월 8일 (월) ~ 9월 14일 (일)" style label for a week starting Monday. */
export function weekLabel(mondayISO: string): string {
  const mon = parseISO(mondayISO);
  const sun = parseISO(addDays(mondayISO, 6));
  const fmt = (d: Date) => `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
  return `${fmt(mon)} ~ ${fmt(sun)}`;
}
