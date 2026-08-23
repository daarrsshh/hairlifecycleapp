import type { RoutineItemSchedule } from '@/features/dose-log/doseState';
import { getNotificationsModule } from '@/lib/notifications-safe';

export const DOSE_RESPONSE_CATEGORY = 'dose-response';

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Registers the Yes/No/Skip action buttons. Idempotent — safe to call on every launch. */
export async function ensureDoseResponseCategory() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  await Notifications.setNotificationCategoryAsync(DOSE_RESPONSE_CATEGORY, [
    { identifier: 'yes', buttonTitle: 'Yes', options: { opensAppToForeground: false } },
    { identifier: 'no', buttonTitle: 'No', options: { opensAppToForeground: false } },
    { identifier: 'skip', buttonTitle: 'Skip', options: { opensAppToForeground: false } },
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
      },
    });
  }
}

/** A "No" response's one-off follow-up (PRD §8: +6h, dropped outside 10:00-24:00 — see computeRepromptTime). */
export async function scheduleReprompt(itemIds: string[], time: string, at: Date) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  await ensureDoseResponseCategory();
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
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
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
