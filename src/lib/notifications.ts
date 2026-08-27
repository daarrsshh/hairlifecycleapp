import { Platform } from 'react-native';

import type { RoutineItemSchedule } from '@/features/dose-log/doseState';
import { getNotificationsModule } from '@/lib/notifications-safe';

export const DOSE_CHANNEL_ID = 'dose-reminders';

/**
 * Android needs an explicit channel; there was none, so reminders landed in the system default
 * at default importance, which shows them collapsed and low-priority. HIGH is what makes a dose
 * reminder actually surface at the moment it's due rather than sitting quietly in the shade.
 *
 * `lockscreenVisibility: PRIVATE` is a product decision, not a default. "Did you take your
 * meds?" on a lockscreen is readable by anyone who picks up the phone, and hair loss is exactly
 * the sort of thing people are treating privately. Content stays hidden until unlocked.
 *
 * Idempotent — re-registering a channel updates it.
 */
export async function ensureDoseChannel() {
  const Notifications = getNotificationsModule();
  if (!Notifications || Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(DOSE_CHANNEL_ID, {
    name: 'Dose reminders',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    vibrationPattern: [0, 250],
    showBadge: false,
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

/** Deterministic id so rescheduling replaces rather than duplicates. */
function reminderId(weekday: number, time: string) {
  return `reminder-${weekday}-${time.replace(':', '')}`;
}

interface BatchedReminder {
  weekday: number; // 1 = Sunday … 7 = Saturday (expo-notifications WEEKLY convention)
  time: string;
  itemIds: string[];
  itemNames: string[];
}

/**
 * Collapses every item's own schedule into one notification per (weekday, time) — so
 * Minoxidil and Finasteride both due at 8am produce a single "2 items due this morning"
 * prompt rather than two competing pushes (spec §4). Exported for testing.
 */
export function buildBatchedReminders(items: RoutineItemSchedule[]): BatchedReminder[] {
  const batches = new Map<string, BatchedReminder>();

  for (const item of items) {
    for (const weekday of item.daysOfWeek) {
      for (const time of item.times) {
        const key = `${weekday}-${time}`;
        const batch = batches.get(key) ?? {
          // JS getDay() is 0-indexed from Sunday; expo-notifications' WEEKLY trigger is 1-indexed.
          weekday: weekday + 1,
          time,
          itemIds: [],
          itemNames: [],
        };
        batch.itemIds.push(item.id);
        batch.itemNames.push(item.name);
        batches.set(key, batch);
      }
    }
  }

  return [...batches.values()].sort((a, b) =>
    a.weekday === b.weekday ? a.time.localeCompare(b.time) : a.weekday - b.weekday
  );
}

/**
 * The body is the whole message now — there are no action buttons, so tapping opens the app and
 * the user logs each dose themselves. That's one more tap than a Yes button, and buys per-dose
 * accuracy: reminders are batched by time, so a single Yes applied to *every* item due at once
 * and couldn't express "took the Finasteride, skipped the Minoxidil".
 */
function batchBody(names: string[]): string {
  if (names.length === 1) return `${names[0]} — tap to log it.`;
  return `${names.join(', ')} — tap to log them.`;
}

/**
 * Replaces all scheduled dose reminders with ones derived from the current routine. Cheap and
 * idempotent — call it whenever the routine changes.
 */
export async function rescheduleRoutineReminders(items: RoutineItemSchedule[]) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  await ensureDoseChannel();
  await cancelAllDoseReminders();

  for (const batch of buildBatchedReminders(items)) {
    const { hour, minute } = parseTime(batch.time);
    await Notifications.scheduleNotificationAsync({
      identifier: reminderId(batch.weekday, batch.time),
      content: {
        title: 'Did you take your meds?',
        body: batchBody(batch.itemNames),
        data: { itemIds: batch.itemIds, time: batch.time },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: batch.weekday,
        hour,
        minute,
        channelId: DOSE_CHANNEL_ID,
      },
    });
  }
}

/** Cancels every dose reminder, leaving the photo reminder alone. */
export async function cancelAllDoseReminders() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('reminder-'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );
}

const PHOTO_REMINDER_IDENTIFIER = 'photo-reminder';

/** The "every 15 days" photo prompt (PRD §4.3/§5.4) — a one-off, rescheduled each time a photo set completes. */
export async function schedulePhotoReminder(at: Date) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(PHOTO_REMINDER_IDENTIFIER).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: PHOTO_REMINDER_IDENTIFIER,
    content: {
      title: 'Time for new photos',
      body: 'See how far you’ve come — add a fresh set of progress photos.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  });
}

export async function cancelPhotoReminder() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(PHOTO_REMINDER_IDENTIFIER).catch(() => {});
}
