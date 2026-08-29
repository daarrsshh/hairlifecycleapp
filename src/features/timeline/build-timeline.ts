import type { PhotoAngle } from '@/features/photos/api';
import type { DateString } from '@/lib/date';

export interface TimelineRoutine {
  id: string;
  startDate: DateString;
}

export interface TimelineRoutineItem {
  routineId: string;
  name: string;
  daysOfWeek: number[];
  times: string[];
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

/** What a later routine changed relative to the one it replaced. */
export interface RoutineChange {
  added: string[];
  removed: string[];
  /** Same item, different days or times — the common case, and the one that read as a duplicate. */
  rescheduled: string[];
}

export type TimelineEvent =
  | {
      type: 'routine-started';
      date: DateString;
      routineId: string;
      label: string;
      itemNames: string[];
      /** `null` for the very first routine — there was nothing before it to differ from. */
      change: RoutineChange | null;
    }
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

  /*
   * Routines are diffed against the one they replaced.
   *
   * Changing a dose time *ends* the current routine and starts a new one — that's the history
   * model — so a plain "Started X" per routine produced two identical-looking entries after any
   * edit, with no sign that one had ended or what had actually changed. The reported symptom was
   * "Started oral Minoxidil" appearing twice. The diff is what makes the entry worth reading.
   */
  const ordered = [...routines].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  ordered.forEach((routine, index) => {
    const routineItems = items.filter((i) => i.routineId === routine.id);
    const previous = index > 0 ? items.filter((i) => i.routineId === ordered[index - 1].id) : null;
    events.push({
      type: 'routine-started',
      date: routine.startDate,
      routineId: routine.id,
      label: describeRoutine(routineItems),
      itemNames: routineItems.map((i) => i.name),
      change: previous ? diffRoutineItems(previous, routineItems) : null,
    });
  });

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

/** Compares two routines' items by name; a same-named item with a different schedule counts as rescheduled. */
export function diffRoutineItems(
  before: TimelineRoutineItem[],
  after: TimelineRoutineItem[]
): RoutineChange {
  const byName = (list: TimelineRoutineItem[]) => new Map(list.map((i) => [i.name, i]));
  const b = byName(before);
  const a = byName(after);

  const schedule = (i: TimelineRoutineItem) =>
    `${[...i.daysOfWeek].sort((x, y) => x - y).join(',')}|${[...i.times].sort().join(',')}`;

  return {
    added: [...a.keys()].filter((n) => !b.has(n)),
    removed: [...b.keys()].filter((n) => !a.has(n)),
    rescheduled: [...a.keys()].filter((n) => {
      const prev = b.get(n);
      return prev !== undefined && schedule(prev) !== schedule(a.get(n)!);
    }),
  };
}
