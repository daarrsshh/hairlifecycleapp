/** All dates in this app are plain `YYYY-MM-DD` strings in the device's local time zone — never UTC/ISO instants, since a "day" here means the user's calendar day. */
export type DateString = string;

export function toDateString(d: Date): DateString {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function today(now: Date = new Date()): DateString {
  return toDateString(now);
}

export function addDays(date: DateString, days: number): DateString {
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function daysBetween(from: DateString, to: DateString): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const fromMs = new Date(fy, fm - 1, fd).getTime();
  const toMs = new Date(ty, tm - 1, td).getTime();
  return Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

export function isBefore(a: DateString, b: DateString): boolean {
  return a < b;
}

/** Builds a concrete local Date for scheduling a notification on a given calendar day at a given time. */
export function dateStringAt(date: DateString, hour: number, minute = 0): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}
