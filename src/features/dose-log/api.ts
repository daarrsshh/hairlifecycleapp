import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { doseLogs, treatmentPausePeriods, treatmentPeriodDrugs, treatmentPeriods } from '@/db/schema';
import {
  getRequiredSlots,
  resolveDayStatus,
  type DoseLogRecord,
  type DoseSlot,
  type DoseState,
} from '@/features/dose-log/doseState';
import { addDays, today, type DateString } from '@/lib/date';

export async function getDoseLogsForDate(date: DateString): Promise<DoseLogRecord[]> {
  return db.select().from(doseLogs).where(eq(doseLogs.date, date));
}

export async function loadDosingContext() {
  const [periods, drugs, pauseWindows] = await Promise.all([
    db.select().from(treatmentPeriods),
    db.select().from(treatmentPeriodDrugs),
    db.select().from(treatmentPausePeriods),
  ]);
  return { periods, drugs, pauseWindows };
}

export async function getRequiredSlotsForDate(date: DateString): Promise<DoseSlot[]> {
  const { periods, drugs, pauseWindows } = await loadDosingContext();
  return getRequiredSlots(date, periods, pauseWindows, drugs);
}

/** Records a user's response to a dose slot. Yes/Skip lock immediately; a fresh log always starts unlocked. */
export async function logDose(
  treatmentPeriodId: string,
  date: DateString,
  slot: DoseSlot,
  state: Extract<DoseState, 'taken' | 'skipped'>
) {
  const existing = await db
    .select()
    .from(doseLogs)
    .where(and(eq(doseLogs.treatmentPeriodId, treatmentPeriodId), eq(doseLogs.date, date), eq(doseLogs.slot, slot)));

  const respondedAt = new Date().toISOString();

  if (existing[0]) {
    await db
      .update(doseLogs)
      .set({ state, locked: true, respondedAt })
      .where(eq(doseLogs.id, existing[0].id));
  } else {
    await db.insert(doseLogs).values({
      id: randomUUID(),
      treatmentPeriodId,
      date,
      slot,
      state,
      locked: true,
      respondedAt,
    });
  }
}

/** A "No" response: stays unlocked/pending (so it can still resolve to Taken later) but records the response time for reprompt scheduling. */
export async function recordDoseNoResponse(treatmentPeriodId: string, date: DateString, slot: DoseSlot) {
  const existing = await db
    .select()
    .from(doseLogs)
    .where(and(eq(doseLogs.treatmentPeriodId, treatmentPeriodId), eq(doseLogs.date, date), eq(doseLogs.slot, slot)));

  const respondedAt = new Date().toISOString();

  if (existing[0]) {
    await db.update(doseLogs).set({ respondedAt }).where(eq(doseLogs.id, existing[0].id));
  } else {
    await db.insert(doseLogs).values({
      id: randomUUID(),
      treatmentPeriodId,
      date,
      slot,
      state: 'pending',
      locked: false,
      respondedAt,
    });
  }
}

/**
 * Walks every required slot from `fromDate` through yesterday and persists `missed` for any
 * that never got a locked response — the "auto-mark Missed at end of day" from PRD §8,
 * implemented as an on-open reconciliation pass instead of a background job.
 */
export async function reconcileMissedDoses(fromDate: DateString) {
  const currentDate = today();
  const { periods, drugs, pauseWindows } = await loadDosingContext();

  const allLogs = await db.select().from(doseLogs);

  let cursor = fromDate;
  while (cursor < currentDate) {
    const required = getRequiredSlots(cursor, periods, pauseWindows, drugs);
    for (const slot of required) {
      const period = periods.find(
        (p) => cursor >= p.startDate && (p.endDate === null || cursor <= p.endDate)
      );
      if (!period) continue;

      const existing = allLogs.find(
        (l) => l.treatmentPeriodId === period.id && l.date === cursor && l.slot === slot
      );
      if (!existing) {
        await db.insert(doseLogs).values({
          id: randomUUID(),
          treatmentPeriodId: period.id,
          date: cursor,
          slot,
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

export async function getDayStatus(date: DateString): Promise<ReturnType<typeof resolveDayStatus>> {
  const { periods, drugs, pauseWindows } = await loadDosingContext();
  const required = getRequiredSlots(date, periods, pauseWindows, drugs);
  const logsForDate = await getDoseLogsForDate(date);
  return resolveDayStatus(date, required, logsForDate, today());
}
