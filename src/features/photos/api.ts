import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import { db } from '@/db/client';
import { photos } from '@/db/schema';
import { getActiveRoutine } from '@/features/routine/api';
import { computeNextPhotoReminderDate } from '@/features/photos/photo-reminder';
import { getAppSettings, setLastPhotoSetDate } from '@/features/onboarding/settings-api';
import { dateStringAt, today, type DateString } from '@/lib/date';
import { schedulePhotoReminder } from '@/lib/notifications';

export type PhotoAngle = 'crown' | 'hairline' | 'left_temple' | 'right_temple';

// Built lazily, not at module scope: expo-file-system has no native module during
// server-side rendering (`expo start --web`'s SSR pass runs route modules in plain Node).
function getPhotosDirectory() {
  const dir = new Directory(Paths.document, 'progress-photos');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/** Best-effort file removal — a missing file shouldn't block replacing a photo. */
function deleteFileQuietly(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Orphaned file at worst; not worth failing the save over.
  }
}

/**
 * Copies a picked/captured image into app-managed storage and records it, so it survives the OS
 * clearing the picker's temp cache.
 *
 * **One photo per (date, angle).** A set is the four angles from one day, so re-capturing an
 * angle *replaces* that day's photo rather than appending a second one. The old file is deleted
 * so replacements don't leak storage.
 *
 * This replace step is load-bearing, not a nicety: `photos_date_angle` is a unique index, so
 * blindly inserting a second photo for an angle would now throw rather than quietly duplicate.
 */
export async function savePhoto(
  sourceUri: string,
  angle: PhotoAngle,
  routineId: string | null,
  date: DateString = today()
) {
  const source = new File(sourceUri);
  const id = randomUUID();
  const destination = new File(getPhotosDirectory(), `${id}${source.extension || '.jpg'}`);
  await source.copy(destination);

  const existing = await db
    .select()
    .from(photos)
    .where(and(eq(photos.date, date), eq(photos.angle, angle)));

  if (existing[0]) {
    deleteFileQuietly(existing[0].filePath);
    await db
      .update(photos)
      .set({ filePath: destination.uri, routineId, createdAt: new Date().toISOString() })
      .where(eq(photos.id, existing[0].id));
  } else {
    await db.insert(photos).values({ id, routineId, date, angle, filePath: destination.uri });
  }

  return destination.uri;
}

/** Today's set so far — lets the capture screen show what's already there instead of starting blank. */
export async function getPhotosForDate(date: DateString = today()) {
  return db.select().from(photos).where(eq(photos.date, date));
}

/** Convenience wrapper for capture flows outside onboarding, where there's no routine object already in hand. */
export async function captureCurrentPhoto(sourceUri: string, angle: PhotoAngle) {
  const routine = await getActiveRoutine();
  return savePhoto(sourceUri, angle, routine?.id ?? null);
}

export async function getAllPhotos() {
  return db.select().from(photos);
}

export async function getPhotosByAngle(angle: PhotoAngle) {
  return db.select().from(photos).where(eq(photos.angle, angle)).orderBy(photos.date);
}

/** Call once a full angle set has been captured: records the date and reschedules the next "every 15 days" photo reminder (PRD §4.3/§5.4) from it. */
export async function recordPhotoSetCompleted(date: DateString = today()) {
  await setLastPhotoSetDate(date);
  const settings = await getAppSettings();
  const intervalDays = settings?.photoReminderIntervalDays ?? 15;
  const nextDate = computeNextPhotoReminderDate(date, intervalDays);
  await schedulePhotoReminder(dateStringAt(nextDate, 10));
}
