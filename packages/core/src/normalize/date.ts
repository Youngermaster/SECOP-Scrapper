const ISO_DATE_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;
const DMY_RE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s.*)?$/;

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isValidCalendarDate(y: number, m: number, d: number): boolean {
  if (y < MIN_YEAR || y > MAX_YEAR || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Parse a Socrata floating timestamp ("2026-09-14T00:00:00.000"), a plain ISO date or a
 * Colombian "dd/mm/yyyy" string into an ISO calendar date "YYYY-MM-DD".
 * SECOP dates never carry a meaningful time-of-day, so the time is dropped.
 */
export function parseSocrataDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toISODate(value);
  }
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (s === '') return null;
  let m = ISO_DATE_RE.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isValidCalendarDate(y, mo, d) ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }
  m = DMY_RE.exec(s);
  if (m) {
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isValidCalendarDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  return null;
}

/** Local calendar date of a JS Date as "YYYY-MM-DD". */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today's local calendar date as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

function isoToUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Whole days from `fromISO` to `toISO` (positive when `toISO` is later). */
export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((isoToUTC(toISO) - isoToUTC(fromISO)) / 86_400_000);
}

/** Add (or subtract) days to an ISO date. */
export function addDays(iso: string, days: number): string {
  const t = isoToUTC(iso) + days * 86_400_000;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** First day of the ISO week (Monday) containing the date. */
export function startOfWeekISO(iso: string): string {
  const d = new Date(isoToUTC(iso));
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(iso, diff);
}

/** "YYYY-MM" for a date. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && parseSocrataDate(value) === value;
}
