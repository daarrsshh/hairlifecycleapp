import type { PhotoAngle } from '@/features/photos/api';
import type { DateString } from '@/lib/date';

export interface TimelineRoutine {
  id: string;
  startDate: DateString;
}

export interface TimelineRoutineItem {
  routineId: string;
  name: string;
}

export interface TimelinePauseWindow {
  routineId: string;
  pausedAt: DateString;
  resumedAt: DateString | null;
}

export interface TimelinePhoto {
  date: DateString;
  angle: PhotoAngle;
}

export type TimelineEvent =
  | { type: 'routine-started'; date: DateString; routineId: string; label: string; itemNames: string[] }
  | { type: 'routine-paused'; date: DateString; routineId: string }
  | { type: 'routine-resumed'; date: DateString; routineId: string }
  | { type: 'photos'; date: DateString; angles: PhotoAngle[] };

/**
 * Merges routine/pause history and photo captures into one chronological feed (PRD §5.6:
 * photos + routine changes are the only two layers in v1). The routine's label is derived from
 * its live item list rather than a stored string, so a renamed or edited routine never shows a
 * stale name.
 */
export function buildTimeline(
  routines: TimelineRoutine[],
  items: TimelineRoutineItem[],
  pauseWindows: TimelinePauseWindow[],
  photos: TimelinePhoto[],
  describeRoutine: (items: { name: string }[]) => string
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const routine of routines) {
    const routineItems = items.filter((i) => i.routineId === routine.id);
    events.push({
      type: 'routine-started',
      date: routine.startDate,
      routineId: routine.id,
      label: describeRoutine(routineItems),
      itemNames: routineItems.map((i) => i.name),
    });
  }

  for (const pause of pauseWindows) {
    events.push({ type: 'routine-paused', date: pause.pausedAt, routineId: pause.routineId });
    if (pause.resumedAt) {
      events.push({ type: 'routine-resumed', date: pause.resumedAt, routineId: pause.routineId });
    }
  }

  const photosByDate = new Map<DateString, PhotoAngle[]>();
  for (const photo of photos) {
    const list = photosByDate.get(photo.date) ?? [];
    list.push(photo.angle);
    photosByDate.set(photo.date, list);
  }
  for (const [date, angles] of photosByDate) {
    events.push({ type: 'photos', date, angles });
  }

  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
