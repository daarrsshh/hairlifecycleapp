import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import { db } from '@/db/client';
import { photos } from '@/db/schema';
import { getActiveTreatmentPeriod } from '@/features/treatment/api';
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

/** Copies a picked/captured image into app-managed storage and records it, so it survives the OS clearing the picker's temp cache. */
export async function savePhoto(
  sourceUri: string,
  angle: PhotoAngle,
  treatmentPeriodId: string | null,
  date: DateString = today()
) {
  const id = randomUUID();
  const source = new File(sourceUri);
  const destination = new File(getPhotosDirectory(), `${id}${source.extension || '.jpg'}`);
  await source.copy(destination);

  await db.insert(photos).values({
    id,
    treatmentPeriodId,
    date,
    angle,
    filePath: destination.uri,
  });

  return destination.uri;
}

/** Convenience wrapper for capture flows outside onboarding, where there's no treatment period object already in hand. */
export async function captureCurrentPhoto(sourceUri: string, angle: PhotoAngle) {
  const period = await getActiveTreatmentPeriod();
  return savePhoto(sourceUri, angle, period?.id ?? null);
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
