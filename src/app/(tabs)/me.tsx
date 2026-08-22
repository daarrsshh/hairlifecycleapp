import { useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getRequiredSlotsForDate } from '@/features/dose-log/api';
import { getAppSettings, setReminderTimes } from '@/features/onboarding/settings-api';
import { today } from '@/lib/date';
import { rescheduleDailyReminders } from '@/lib/notifications';

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
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getAppSettings });

  async function updateTime(slot: 'am' | 'pm', date: Date | undefined) {
    if (!date || !settings) return;
    const am = slot === 'am' ? dateToTimeString(date) : settings.reminderAmTime;
    const pm = slot === 'pm' ? dateToTimeString(date) : settings.reminderPmTime;
    await setReminderTimes(am, pm);
    const requiredSlots = await getRequiredSlotsForDate(today());
    await rescheduleDailyReminders(requiredSlots, { am, pm });
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Me</ThemedText>

        {settings ? (
          <ThemedView type="backgroundElement" style={styles.card}>
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
});
