import { eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { treatmentPausePeriods, treatmentPeriodDrugs, treatmentPeriods } from '@/db/schema';
import { findPeriodForDate } from '@/features/dose-log/doseState';
import type { PresetDrug } from '@/features/treatment/presets';
import { today, type DateString } from '@/lib/date';

export interface StartTreatmentInput {
  planType: string; // preset id, or 'custom'
  drugs: PresetDrug[];
  startDate?: DateString;
}

export async function getActiveTreatmentPeriod() {
  const rows = await db
    .select()
    .from(treatmentPeriods)
    .where(isNull(treatmentPeriods.endDate))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllTreatmentPeriods() {
  return db.select().from(treatmentPeriods).orderBy(treatmentPeriods.startDate);
}

/** Which period covered a given (possibly past) date — for correcting a dose log on a day whose period has since ended or changed. */
export async function getPeriodForDate(date: DateString) {
  const periods = await getAllTreatmentPeriods();
  return findPeriodForDate(periods, date) ?? null;
}

export async function getDrugsForPeriod(treatmentPeriodId: string) {
  return db
    .select()
    .from(treatmentPeriodDrugs)
    .where(eq(treatmentPeriodDrugs.treatmentPeriodId, treatmentPeriodId));
}

export async function getPauseWindows(treatmentPeriodId: string) {
  return db
    .select()
    .from(treatmentPausePeriods)
    .where(eq(treatmentPausePeriods.treatmentPeriodId, treatmentPeriodId));
}

export async function getAllPauseWindows() {
  return db.select().from(treatmentPausePeriods);
}

/**
 * Ends the current active period (if any) and starts a new one. Used both for onboarding's
 * first treatment and for "Start New Treatment" (PRD §5.5) — history is preserved, not overwritten.
 */
export async function startTreatmentPeriod(input: StartTreatmentInput) {
  const startDate = input.startDate ?? today();

  const current = await getActiveTreatmentPeriod();
  if (current) {
    await db
      .update(treatmentPeriods)
      .set({ status: 'ended', endDate: startDate })
      .where(eq(treatmentPeriods.id, current.id));
  }

  const id = randomUUID();
  await db.insert(treatmentPeriods).values({
    id,
    planType: input.planType,
    startDate,
    status: 'active',
  });

  await db.insert(treatmentPeriodDrugs).values(
    input.drugs.map((drug) => ({
      id: randomUUID(),
      treatmentPeriodId: id,
      drugName: drug.drugName,
      dosage: drug.dosage,
      frequency: drug.frequency,
      slot: drug.slot,
    }))
  );

  return id;
}

export async function pauseTreatmentPeriod(
  treatmentPeriodId: string,
  resumeExpectedAt: DateString | null
) {
  await db.insert(treatmentPausePeriods).values({
    id: randomUUID(),
    treatmentPeriodId,
    pausedAt: today(),
    resumeExpectedAt,
    resumedAt: null,
  });
  await db.update(treatmentPeriods).set({ status: 'paused' }).where(eq(treatmentPeriods.id, treatmentPeriodId));
}

export async function resumeTreatmentPeriod(treatmentPeriodId: string) {
  const openPauses = await db
    .select()
    .from(treatmentPausePeriods)
    .where(eq(treatmentPausePeriods.treatmentPeriodId, treatmentPeriodId));
  const open = openPauses.find((p) => p.resumedAt === null);
  if (open) {
    await db
      .update(treatmentPausePeriods)
      .set({ resumedAt: today() })
      .where(eq(treatmentPausePeriods.id, open.id));
  }
  await db.update(treatmentPeriods).set({ status: 'active' }).where(eq(treatmentPeriods.id, treatmentPeriodId));
}
