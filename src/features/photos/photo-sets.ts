import type { PhotoAngle } from '@/features/photos/api';
import { daysBetween, type DateString } from '@/lib/date';

/** Cover-photo preference — a stable order means every set card shows the same angle where possible. */
const COVER_PRIORITY: PhotoAngle[] = ['hairline', 'crown', 'left_temple', 'right_temple'];

export const ALL_ANGLES: PhotoAngle[] = ['crown', 'hairline', 'left_temple', 'right_temple'];

export interface PhotoRecord {
  id: string;
  date: DateString;
  angle: PhotoAngle;
  filePath: string;
  routineId?: string | null;
}

export interface PhotoSet {
  date: DateString;
  photos: PhotoRecord[];
  /** Which angles this set actually has — a set can be partial if the user skipped some. */
  angles: PhotoAngle[];
  coverPhoto: PhotoRecord;
  /** Days since the first routine started; the Day 0 baseline set reads as 0. Null with no routine history. */
  dayNumber: number | null;
}

/**
 * Groups photos into capture sets — one per day, since the capture flow saves every angle of a
 * session with the same date. Newest first, matching how the Photos tab reads top-to-bottom.
 */
export function groupPhotosIntoSets(
  photos: PhotoRecord[],
  startDate: DateString | null
): PhotoSet[] {
  const byDate = new Map<DateString, PhotoRecord[]>();
  for (const photo of photos) {
    const list = byDate.get(photo.date) ?? [];
    list.push(photo);
    byDate.set(photo.date, list);
  }

  const sets: PhotoSet[] = [];
  for (const [date, group] of byDate) {
    const ordered = ALL_ANGLES.flatMap((angle) => group.filter((p) => p.angle === angle));
    const cover =
      COVER_PRIORITY.map((angle) => ordered.find((p) => p.angle === angle)).find(Boolean) ?? ordered[0];
    if (!cover) continue;

    sets.push({
      date,
      photos: ordered,
      angles: ALL_ANGLES.filter((angle) => ordered.some((p) => p.angle === angle)),
      coverPhoto: cover,
      dayNumber: startDate ? daysBetween(startDate, date) : null,
    });
  }

  return sets.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** "Day 0" for the baseline set, "Day 14" thereafter — falls back to the date when there's no routine history. */
export function describeSetTiming(set: PhotoSet): string {
  return describeDayNumber(set.dayNumber, set.date);
}

/**
 * The same "Day N" label for a single photo rather than a whole set, so Compare's pickers read
 * the way the Photos tab does instead of showing raw `2026-08-14` strings.
 */
export function describePhotoTiming(date: DateString, startDate: DateString | null): string {
  return describeDayNumber(startDate ? daysBetween(startDate, date) : null, date);
}

/** Shared by both, so a set card and a photo chip can never disagree about what day it is. */
function describeDayNumber(dayNumber: number | null, fallbackDate: DateString): string {
  if (dayNumber === null) return fallbackDate;
  // A photo taken before the routine began still has a real date; a negative day would be noise.
  if (dayNumber < 0) return fallbackDate;
  if (dayNumber === 0) return 'Day 0 · baseline';
  return `Day ${dayNumber}`;
}

export function describeSetCoverage(set: PhotoSet): string {
  return set.angles.length === ALL_ANGLES.length
    ? 'All 4 angles'
    : `${set.angles.length} of ${ALL_ANGLES.length} angles`;
}
