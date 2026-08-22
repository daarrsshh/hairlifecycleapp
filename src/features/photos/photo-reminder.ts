import { addDays, daysBetween, type DateString } from '@/lib/date';

/** No photo set yet means there's nothing to prompt a follow-up on — the banner is about "time for your *next* set," not the first one. */
export function isPhotoReminderDue(
  lastPhotoSetDate: DateString | null,
  currentDate: DateString,
  intervalDays: number
): boolean {
  if (!lastPhotoSetDate) return false;
  return daysBetween(lastPhotoSetDate, currentDate) >= intervalDays;
}

export function computeNextPhotoReminderDate(lastPhotoSetDate: DateString, intervalDays: number): DateString {
  return addDays(lastPhotoSetDate, intervalDays);
}
