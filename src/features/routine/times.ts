/**
 * Pure helpers behind `TimesEditor`. An item's times are kept sorted and unique: they're a
 * *set* of moments in the day, so order of entry shouldn't matter and the same time twice
 * would create two indistinguishable doses.
 *
 * 'HH:MM' in 24-hour form sorts correctly as plain strings, which is why times are stored that
 * way rather than as display strings like '8:00 PM'.
 */
export function addTime(times: string[], time: string): string[] {
  return [...new Set([...times, time])].sort();
}

export function replaceTime(times: string[], index: number, time: string): string[] {
  const next = times.map((t, i) => (i === index ? time : t));
  return [...new Set(next)].sort();
}

export function removeTime(times: string[], index: number): string[] {
  return times.filter((_, i) => i !== index);
}
