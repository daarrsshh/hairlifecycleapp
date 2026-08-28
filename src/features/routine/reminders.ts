import { getActiveRoutine, getItemsForRoutine } from '@/features/routine/api';
import { getAppSettings } from '@/features/onboarding/settings-api';
import { cancelAllDoseReminders, rescheduleRoutineReminders } from '@/lib/notifications';

/**
 * The single place that decides what dose reminders should currently exist.
 *
 * Every caller used to assemble this itself as
 * `rescheduleRoutineReminders(await getAllRoutineItems())`, and that was wrong twice over.
 *
 * **`getAllRoutineItems` returns items from every routine ever created.** Changing a dose time
 * *ends* the current routine and starts a new one, so the scheduler received the dead routine's
 * old time alongside the new one and scheduled both — the reported symptom being a reminder that
 * kept firing at 11:54 after it had been moved to 11:56. Every routine change added more stale
 * reminders, permanently. (Same trap as the Consistency per-item list; see CLAUDE.md.)
 *
 * **Pausing cancelled nothing.** `getScheduledDoses` correctly reports nothing due while paused,
 * so Home went quiet — but the OS kept asking "Did you take your meds?" at every scheduled time.
 * Someone who paused because of side effects got nagged daily by an app whose whole premise is
 * that it doesn't nag.
 *
 * Call this after anything that changes the routine, its pause state, or the notifications
 * setting. It is cheap and idempotent.
 */
export async function syncRoutineReminders() {
  const settings = await getAppSettings();
  if (settings && !settings.notificationsEnabled) {
    await cancelAllDoseReminders();
    return;
  }

  const routine = await getActiveRoutine();
  if (!routine || routine.status === 'paused') {
    await cancelAllDoseReminders();
    return;
  }

  await rescheduleRoutineReminders(await getItemsForRoutine(routine.id));
}
