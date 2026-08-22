import * as Notifications from 'expo-notifications';

import type { DoseSlot } from '@/features/dose-log/doseState';

const IDENTIFIER: Record<DoseSlot, string> = {
  am: 'reminder-am',
  pm: 'reminder-pm',
};

const REPROMPT_IDENTIFIER: Record<DoseSlot, string> = {
  am: 'reminder-am-reprompt',
  pm: 'reminder-pm-reprompt',
};

export const DOSE_RESPONSE_CATEGORY = 'dose-response';

export async function requestNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Registers the Yes/No/Skip action buttons. Idempotent — safe to call on every launch. */
export async function ensureDoseResponseCategory() {
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

/**
 * Schedules the daily AM/PM reminders for exactly the slots a treatment requires, replacing
 * whatever was scheduled before. Cheap and idempotent — safe to call on every regimen change.
 */
export async function rescheduleDailyReminders(
  requiredSlots: DoseSlot[],
  times: { am: string; pm: string }
) {
  await ensureDoseResponseCategory();
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER.am).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER.pm).catch(() => {});

  for (const slot of requiredSlots) {
    const { hour, minute } = parseTime(times[slot]);
    await Notifications.scheduleNotificationAsync({
      identifier: IDENTIFIER[slot],
      content: {
        title: 'Did you take your meds?',
        body: "Log today's dose in a tap.",
        categoryIdentifier: DOSE_RESPONSE_CATEGORY,
        data: { slot },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

/** A "No" response's one-off follow-up (PRD §8: +6h, dropped outside 10:00-24:00 — see computeRepromptTime). Replaces any earlier reprompt for the same slot. */
export async function scheduleReprompt(slot: DoseSlot, at: Date) {
  await ensureDoseResponseCategory();
  await Notifications.cancelScheduledNotificationAsync(REPROMPT_IDENTIFIER[slot]).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REPROMPT_IDENTIFIER[slot],
    content: {
      title: 'Still there?',
      body: "Did you take today's dose?",
      categoryIdentifier: DOSE_RESPONSE_CATEGORY,
      data: { slot },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  });
}

export async function cancelAllDailyReminders() {
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER.am).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER.pm).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(REPROMPT_IDENTIFIER.am).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(REPROMPT_IDENTIFIER.pm).catch(() => {});
}
