const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Names a routine by its items, e.g. "Minoxidil + Finasteride". Built from the live item list
 * rather than a stored label so the Timeline never shows a stale name (PRD constraint).
 */
export function describeRoutine(items: { name: string }[]): string {
  if (items.length === 0) return 'Empty routine';
  if (items.length <= 3) return items.map((i) => i.name).join(' + ');
  return `${items[0].name} + ${items.length - 1} more`;
}

/** "Every day", "Mon, Wed, Fri", "Weekdays" — the human version of a daysOfWeek array. */
export function describeDays(daysOfWeek: number[]): string {
  const days = [...daysOfWeek].sort((a, b) => a - b);
  if (days.length === 0) return 'No days selected';
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return days.map((d) => WEEKDAY_LABELS[d]).join(', ');
}

/** 24h 'HH:MM' → a friendlier '8:00 AM'. */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** Groups a day's doses under a heading like "Morning" / "Afternoon" / "Evening". */
export function timeOfDayLabel(time: string): string {
  const hour = Number(time.split(':')[0]);
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export function describeSchedule(daysOfWeek: number[], times: string[]): string {
  const timePart = times.length === 0 ? '' : ` · ${times.map(formatTime).join(', ')}`;
  return `${describeDays(daysOfWeek)}${timePart}`;
}
