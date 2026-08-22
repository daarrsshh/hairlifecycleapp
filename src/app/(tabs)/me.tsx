import { useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getRequiredSlotsForDate } from '@/features/dose-log/api';
import { getAppSettings, setNotificationsEnabled, setReminderTimes } from '@/features/onboarding/settings-api';
import { useTheme } from '@/hooks/use-theme';
import { today } from '@/lib/date';
import { cancelAllDailyReminders, rescheduleDailyReminders } from '@/lib/notifications';

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function dateToTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function MeScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getAppSettings });

  async function updateTime(slot: 'am' | 'pm', date: Date | undefined) {
    if (!date || !settings) return;
    const am = slot === 'am' ? dateToTimeString(date) : settings.reminderAmTime;
    const pm = slot === 'pm' ? dateToTimeString(date) : settings.reminderPmTime;
    await setReminderTimes(am, pm);
    if (settings.notificationsEnabled) {
      const requiredSlots = await getRequiredSlotsForDate(today());
      await rescheduleDailyReminders(requiredSlots, { am, pm });
    }
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  }

  async function toggleNotifications() {
    if (!settings) return;
    const next = !settings.notificationsEnabled;
    await setNotificationsEnabled(next);
    if (next) {
      const requiredSlots = await getRequiredSlotsForDate(today());
      await rescheduleDailyReminders(requiredSlots, {
        am: settings.reminderAmTime,
        pm: settings.reminderPmTime,
      });
    } else {
      await cancelAllDailyReminders();
    }
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Me</ThemedText>

        {settings ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <Pressable style={styles.pickerRow} onPress={toggleNotifications}>
              <ThemedText type="smallBold">Notifications</ThemedText>
              <ThemedView
                type="backgroundSelected"
                style={[styles.toggle, settings.notificationsEnabled && { backgroundColor: theme.primary }]}>
                <ThemedText
                  type="small"
                  style={settings.notificationsEnabled ? { color: theme.onPrimary } : undefined}>
                  {settings.notificationsEnabled ? 'On' : 'Off'}
                </ThemedText>
              </ThemedView>
            </Pressable>

            <ThemedText type="smallBold">Reminders</ThemedText>

            <ThemedView style={styles.pickerRow}>
              <ThemedText themeColor="textSecondary">Morning</ThemedText>
              <DateTimePicker
                value={timeStringToDate(settings.reminderAmTime)}
                mode="time"
                onChange={(_, date) => updateTime('am', date)}
              />
            </ThemedView>

            <ThemedView style={styles.pickerRow}>
              <ThemedText themeColor="textSecondary">Evening</ThemedText>
              <DateTimePicker
                value={timeStringToDate(settings.reminderPmTime)}
                mode="time"
                onChange={(_, date) => updateTime('pm', date)}
              />
            </ThemedView>
          </ThemedView>
        ) : null}

        <Link href="/export" asChild>
          <Pressable>
            <ThemedText type="linkPrimary">Export data (PDF)</ThemedText>
          </Pressable>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Spacing.four },
});
