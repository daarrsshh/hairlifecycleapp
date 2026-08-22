import * as Notifications from 'expo-notifications';

import type { DoseSlot } from '@/features/dose-log/doseState';

const IDENTIFIER: Record<DoseSlot, string> = {
  am: 'reminder-am',
  pm: 'reminder-pm',
};

export async function requestNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
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
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER.am).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER.pm).catch(() => {});

  for (const slot of requiredSlots) {
    const { hour, minute } = parseTime(times[slot]);
    await Notifications.scheduleNotificationAsync({
      identifier: IDENTIFIER[slot],
      content: { title: 'Did you take your meds?', body: 'Log today\'s dose in a tap.' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

export async function cancelAllDailyReminders() {
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER.am).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER.pm).catch(() => {});
}
