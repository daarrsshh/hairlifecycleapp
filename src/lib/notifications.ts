import { Platform } from 'react-native';

import type { RoutineItemSchedule } from '@/features/dose-log/doseState';
import { getNotificationsModule } from '@/lib/notifications-safe';

export const DOSE_RESPONSE_CATEGORY = 'dose-response';
export const DOSE_CHANNEL_ID = 'dose-reminders';

/**
 * Android needs an explicit channel; there was none, so reminders landed in the system default
 * at default importance. That matters for the action buttons specifically — a notification that
 * isn't important enough to expand shows collapsed, and Yes/No/Skip only render on the expanded
 * form, so the buttons were effectively unreachable.
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

/**
 * Registers the Yes/No/Skip action buttons. Idempotent — safe to call on every launch.
 *
 * **`opensAppToForeground: true` is deliberate, and was changed from `false`.** Answering
 * without opening the app is the nicer idea, but on Android it can't confirm anything: the
 * notification simply vanishes, and if the process was already killed the answer isn't applied
 * until the app is next opened. Tapping Yes and seeing nothing happen is indistinguishable from
 * a button that doesn't work — which is exactly how it got reported.
 *
 * Opening the app costs a moment and buys a guarantee: the handler always runs, and the dose is
 * visibly ticked off on Home. For something done once or twice a day, a reliable answer beats a
 * silent one.
 */
export async function ensureDoseResponseCategory() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  await Notifications.setNotificationCategoryAsync(DOSE_RESPONSE_CATEGORY, [
    { identifier: 'yes', buttonTitle: 'Yes', options: { opensAppToForeground: true } },
    { identifier: 'no', buttonTitle: 'No', options: { opensAppToForeground: true } },
    { identifier: 'skip', buttonTitle: 'Skip', options: { opensAppToForeground: true } },
  ]);
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

function batchBody(names: string[]): string {
  if (names.length === 1) return `${names[0]} — log it in a tap.`;
  return `${names.length} items due: ${names.join(', ')}`;
}

/**
 * Replaces all scheduled dose reminders with ones derived from the current routine. Cheap and
 * idempotent — call it whenever the routine changes.
 */
export async function rescheduleRoutineReminders(items: RoutineItemSchedule[]) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  await ensureDoseResponseCategory();
  await ensureDoseChannel();
  await cancelAllDoseReminders();

  for (const batch of buildBatchedReminders(items)) {
    const { hour, minute } = parseTime(batch.time);
    await Notifications.scheduleNotificationAsync({
      identifier: reminderId(batch.weekday, batch.time),
      content: {
        title: 'Did you take your meds?',
        body: batchBody(batch.itemNames),
        categoryIdentifier: DOSE_RESPONSE_CATEGORY,
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

/** A "No" response's one-off follow-up (PRD §8: +6h, dropped outside 10:00-24:00 — see computeRepromptTime). */
export async function scheduleReprompt(itemIds: string[], time: string, at: Date) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  await ensureDoseResponseCategory();
  await ensureDoseChannel();
  const identifier = `reprompt-${time.replace(':', '')}`;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'Still there?',
      body: "Did you take today's dose?",
      categoryIdentifier: DOSE_RESPONSE_CATEGORY,
      data: { itemIds, time },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      channelId: DOSE_CHANNEL_ID,
    },
  });
}

/** Cancels every dose reminder and reprompt, leaving the photo reminder alone. */
export async function cancelAllDoseReminders() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('reminder-') || n.identifier.startsWith('reprompt-'))
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
