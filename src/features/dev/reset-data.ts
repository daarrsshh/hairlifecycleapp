import { db } from '@/db/client';
import {
  appSettings,
  doseLogs,
  photos,
  profiles,
  routineItems,
  routinePausePeriods,
  routines,
} from '@/db/schema';
import { deleteAllPhotoFiles } from '@/features/photos/api';
import { cancelAllDoseReminders, cancelPhotoReminder } from '@/lib/notifications';

/**
 * Returns the app to first-launch state — for testing onboarding repeatedly without
 * reinstalling. **Development only**; the UI that calls this is behind `__DEV__`.
 *
 * Deliberately clears three separate stores, because wiping only the obvious one leaves the
 * app in a state that isn't actually "new":
 *   1. database rows,
 *   2. photo *files*, which live on disk rather than in the database, and
 *   3. scheduled notifications, which live in the OS and would otherwise keep firing for a
 *      routine that no longer exists.
 *
 * Deletes children before parents so foreign keys never dangle mid-wipe.
 */
export async function resetAllData() {
  await db.delete(doseLogs);
  await db.delete(photos);
  await db.delete(routineItems);
  await db.delete(routinePausePeriods);
  await db.delete(routines);
  await db.delete(profiles);
  await db.delete(appSettings);

  deleteAllPhotoFiles();

  await cancelAllDoseReminders();
  await cancelPhotoReminder();
}
