import { daysBetween, isBefore } from '@/lib/date';
import type { DateString } from '@/lib/date';

/**
 * A note surfaced on Home during the window where it's actually relevant.
 *
 * This exists because of a retention problem the rest of the app can't solve: these treatments
 * take 3–6 months to show anything, and the one thing that *does* happen early — a temporary
 * increase in shedding around weeks 2–8 — looks exactly like the treatment making things worse.
 * That's the moment people quit. The Learn article explaining it has always been there; nothing
 * ever put it in front of anyone at the moment they needed it.
 *
 * Windows are **inclusive day ranges since the first routine started**, and must not overlap
 * (there's a test) — at most one note shows at a time, so Home never becomes a noticeboard.
 * There's deliberately no dismiss: dismissal state would need a settings column, and these
 * expire on their own.
 *
 * Copy must not outrun `timelines-and-shedding`, which is the article it links to. No claim
 * here that isn't already made there, and nothing phrased as a promise.
 */
export interface Milestone {
  id: string;
  /** Inclusive. Day 0 is the first routine's start date. */
  fromDay: number;
  toDay: number;
  title: string;
  body: string;
  /** Article to open — an id from `content/articles.ts`. */
  articleId: string;
  linkLabel: string;
}

export const MILESTONES: Milestone[] = [
  {
    id: 'shedding',
    fromDay: 14,
    toDay: 56,
    title: 'Noticing more hair fall?',
    body: 'A temporary increase in shedding is common in the first weeks, as weaker hairs make way for new growth. For most people it settles with continued use.',
    articleId: 'timelines-and-shedding',
    linkLabel: 'Why this happens',
  },
  {
    id: 'three-months',
    fromDay: 84,
    toDay: 119,
    title: "You're three months in",
    body: 'This is around when a difference typically starts to show. Your photos from today, set beside your Day 0 set, are the clearest way to see it.',
    articleId: 'timelines-and-shedding',
    linkLabel: 'What to expect',
  },
];

/**
 * The note for today, or `null` — before any routine exists, outside every window, and in the
 * gaps between them. Returns the first match; the non-overlap invariant makes "first" total.
 */
export function getActiveMilestone(
  firstRoutineStart: DateString | null,
  currentDate: DateString,
  milestones: Milestone[] = MILESTONES
): Milestone | null {
  if (!firstRoutineStart) return null;
  // A date before treatment began has no day number worth computing.
  if (isBefore(currentDate, firstRoutineStart)) return null;

  const day = daysBetween(firstRoutineStart, currentDate);
  return milestones.find((m) => day >= m.fromDay && day <= m.toDay) ?? null;
}
