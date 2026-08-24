import type { WeekStartsOn } from '@/features/consistency/streak';
import type { DateString } from '@/lib/date';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Weekday initials in display order for a given week start (1 = Monday, 0 = Sunday). */
export function weekdayInitials(weekStartsOn: WeekStartsOn = 1): string[] {
  const sundayFirst = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return [...sundayFirst.slice(weekStartsOn), ...sundayFirst.slice(0, weekStartsOn)];
}

export function describeMonth(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * A month laid out as explicit weeks of exactly 7 — `null` for padding before the 1st and
 * after the last day.
 *
 * Returning real rows rather than one flat list matters: the grid used to be a single
 * `flexWrap` row of `width: 100/7 %` cells, and pixel rounding could push the seventh cell
 * onto the next line, leaving a column empty and shifting every date after it. Fixed rows of
 * `flex: 1` cells can't drift.
 */
export function buildMonthGrid(
  year: number,
  month: number, // 1-12
  weekStartsOn: WeekStartsOn = 1
): (DateString | null)[][] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = (firstWeekday - weekStartsOn + 7) % 7;

  const cells: (DateString | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (DateString | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
