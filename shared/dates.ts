// Calendar-day helpers. Dates are stored as YYYY-MM-DD strings for the player's
// local day; arithmetic runs on UTC day numbers so it never shifts with time zones.

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return fromDayNumber(dayNumber(iso) + days);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return dayNumber(toIso) - dayNumber(fromIso);
}

/** Monday of the week containing the given day. */
export function mondayOf(iso: string): string {
  const weekday = new Date(dayNumber(iso) * DAY_MS).getUTCDay(); // 0 = Sunday
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(iso, offset);
}

export function isMonday(iso: string): boolean {
  return new Date(dayNumber(iso) * DAY_MS).getUTCDay() === 1;
}

/** Today's date on the device's local calendar. */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today in UTC, used by the server where no local time zone is known. */
export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
