import { daysBetween, type DateString } from '@/lib/date';

export interface DatedPhoto {
  date: DateString;
}

/** Used by the comparison screen's "Last Month vs Today" shortcut to find the photo nearest a target date. */
export function findClosestPhoto<T extends DatedPhoto>(photos: T[], targetDate: DateString): T | null {
  if (photos.length === 0) return null;
  return photos.reduce((closest, p) =>
    Math.abs(daysBetween(p.date, targetDate)) < Math.abs(daysBetween(closest.date, targetDate)) ? p : closest
  );
}
