import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { doseLogs, routineItems, routinePausePeriods, routines } from '@/db/schema';
import {
  getScheduledDoses,
  resolveDayProgress,
  type DoseLogRecord,
  type DoseState,
  type ScheduledDose,
} from '@/features/dose-log/doseState';
import { addDays, today, type DateString } from '@/lib/date';

export async function getDoseLogsForDate(date: DateString): Promise<DoseLogRecord[]> {
  return db.select().from(doseLogs).where(eq(doseLogs.date, date));
}

export async function loadDosingContext() {
  const [allRoutines, items, pauseWindows] = await Promise.all([
    db.select().from(routines),
    db.select().from(routineItems),
    db.select().from(routinePausePeriods),
  ]);
  return { routines: allRoutines, items, pauseWindows };
}

export async function getScheduledDosesForDate(date: DateString): Promise<ScheduledDose[]> {
  const { routines: allRoutines, items, pauseWindows } = await loadDosingContext();
  return getScheduledDoses(date, allRoutines, pauseWindows, items);
}

/** Records a response for one item at one time. Taken/Skipped lock immediately (PRD §5.2). */
export async function logDose(
  routineItemId: string,
  date: DateString,
  time: string,
  state: Extract<DoseState, 'taken' | 'skipped'>
) {
  const existing = await db
    .select()
    .from(doseLogs)
    .where(
      and(eq(doseLogs.routineItemId, routineItemId), eq(doseLogs.date, date), eq(doseLogs.time, time))
    );

  const respondedAt = new Date().toISOString();

  if (existing[0]) {
    await db
      .update(doseLogs)
      .set({ state, locked: true, respondedAt })
      .where(eq(doseLogs.id, existing[0].id));
  } else {
    await db
      .insert(doseLogs)
      .values({ id: randomUUID(), routineItemId, date, time, state, locked: true, respondedAt });
  }
}

/** A "No" response: stays unlocked/pending (so it can still resolve to Taken) but records the response time for reprompt scheduling. */
export async function recordDoseNoResponse(routineItemId: string, date: DateString, time: string) {
  const existing = await db
    .select()
    .from(doseLogs)
    .where(
      and(eq(doseLogs.routineItemId, routineItemId), eq(doseLogs.date, date), eq(doseLogs.time, time))
    );

  const respondedAt = new Date().toISOString();

  if (existing[0]) {
    await db.update(doseLogs).set({ respondedAt }).where(eq(doseLogs.id, existing[0].id));
  } else {
    await db.insert(doseLogs).values({
      id: randomUUID(),
      routineItemId,
      date,
      time,
      state: 'pending',
      locked: false,
      respondedAt,
    });
  }
}

/**
 * Walks every scheduled dose from `fromDate` through yesterday and persists `missed` for any
 * that never got a locked response — the "auto-mark Missed at end of day" from PRD §8,
 * implemented as an on-open reconciliation pass instead of a background job.
 */
export async function reconcileMissedDoses(fromDate: DateString) {
  const currentDate = today();
  const { routines: allRoutines, items, pauseWindows } = await loadDosingContext();
  const allLogs = await db.select().from(doseLogs);

  let cursor = fromDate;
  while (cursor < currentDate) {
    for (const dose of getScheduledDoses(cursor, allRoutines, pauseWindows, items)) {
      const existing = allLogs.find(
        (l) => l.routineItemId === dose.itemId && l.date === cursor && l.time === dose.time
      );
      if (!existing) {
        await db.insert(doseLogs).values({
          id: randomUUID(),
          routineItemId: dose.itemId,
          date: cursor,
          time: dose.time,
          state: 'missed',
          locked: false,
          respondedAt: null,
        });
      } else if (existing.state === 'pending') {
        await db.update(doseLogs).set({ state: 'missed' }).where(eq(doseLogs.id, existing.id));
      }
    }
    cursor = addDays(cursor, 1);
  }
}

export async function getDayProgress(date: DateString) {
  const { routines: allRoutines, items, pauseWindows } = await loadDosingContext();
  const scheduled = getScheduledDoses(date, allRoutines, pauseWindows, items);
  const logsForDate = await getDoseLogsForDate(date);
  return resolveDayProgress(date, scheduled, logsForDate, today());
}
