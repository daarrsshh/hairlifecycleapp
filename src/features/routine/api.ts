import { eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { routineItems, routinePausePeriods, routines } from '@/db/schema';
import { findRoutineForDate, type RoutineItemType } from '@/features/dose-log/doseState';
import { today, type DateString } from '@/lib/date';

/** A routine item as the builder produces it, before it's persisted and given an id. */
export interface DraftRoutineItem {
  type: RoutineItemType;
  name: string;
  dosage: string | null;
  daysOfWeek: number[];
  times: string[];
}

export async function getActiveRoutine() {
  const rows = await db.select().from(routines).where(isNull(routines.endDate)).limit(1);
  return rows[0] ?? null;
}

export async function getAllRoutines() {
  return db.select().from(routines).orderBy(routines.startDate);
}

export async function getItemsForRoutine(routineId: string) {
  return db
    .select()
    .from(routineItems)
    .where(eq(routineItems.routineId, routineId))
    .orderBy(routineItems.sortOrder);
}

export async function getAllRoutineItems() {
  return db.select().from(routineItems);
}

export async function getAllPauseWindows() {
  return db.select().from(routinePausePeriods);
}

/** Which routine covered a given (possibly past) date — for correcting a log on a day whose routine has since ended. */
export async function getRoutineForDate(date: DateString) {
  return findRoutineForDate(await getAllRoutines(), date) ?? null;
}

/**
 * Ends the current active routine (if any) and starts a new one. Used for both onboarding's
 * first routine and "Start new routine" — history is preserved, never overwritten (PRD §5.5).
 */
export async function startRoutine(input: { items: DraftRoutineItem[]; startDate?: DateString }) {
  const startDate = input.startDate ?? today();

  const current = await getActiveRoutine();
  if (current) {
    await db.update(routines).set({ status: 'ended', endDate: startDate }).where(eq(routines.id, current.id));
  }

  const id = randomUUID();
  await db.insert(routines).values({ id, startDate, status: 'active' });

  if (input.items.length > 0) {
    await db.insert(routineItems).values(
      input.items.map((item, index) => ({
        id: randomUUID(),
        routineId: id,
        type: item.type,
        name: item.name,
        dosage: item.dosage,
        daysOfWeek: item.daysOfWeek,
        times: item.times,
        sortOrder: index,
      }))
    );
  }

  return id;
}

export async function addItemToRoutine(routineId: string, item: DraftRoutineItem) {
  const existing = await getItemsForRoutine(routineId);
  const id = randomUUID();
  await db.insert(routineItems).values({
    id,
    routineId,
    type: item.type,
    name: item.name,
    dosage: item.dosage,
    daysOfWeek: item.daysOfWeek,
    times: item.times,
    sortOrder: existing.length,
  });
  return id;
}

export async function updateRoutineItem(itemId: string, item: DraftRoutineItem) {
  await db
    .update(routineItems)
    .set({
      type: item.type,
      name: item.name,
      dosage: item.dosage,
      daysOfWeek: item.daysOfWeek,
      times: item.times,
    })
    .where(eq(routineItems.id, itemId));
}

export async function removeRoutineItem(itemId: string) {
  await db.delete(routineItems).where(eq(routineItems.id, itemId));
}

export async function pauseRoutine(routineId: string, resumeExpectedAt: DateString | null) {
  await db.insert(routinePausePeriods).values({
    id: randomUUID(),
    routineId,
    pausedAt: today(),
    resumeExpectedAt,
    resumedAt: null,
  });
  await db.update(routines).set({ status: 'paused' }).where(eq(routines.id, routineId));
}

export async function resumeRoutine(routineId: string) {
  const pauses = await db
    .select()
    .from(routinePausePeriods)
    .where(eq(routinePausePeriods.routineId, routineId));
  const open = pauses.find((p) => p.resumedAt === null);
  if (open) {
    await db
      .update(routinePausePeriods)
      .set({ resumedAt: today() })
      .where(eq(routinePausePeriods.id, open.id));
  }
  await db.update(routines).set({ status: 'active' }).where(eq(routines.id, routineId));
}
