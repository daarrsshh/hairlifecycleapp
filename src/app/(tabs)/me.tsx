import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimePickerField } from '@/components/time-picker-field';
import { Spacing } from '@/constants/theme';
import { getRequiredSlotsForDate } from '@/features/dose-log/api';
import { getAppSettings, setNotificationsEnabled, setReminderTimes } from '@/features/onboarding/settings-api';
import { useTheme } from '@/hooks/use-theme';
import { today } from '@/lib/date';
import { cancelAllDailyReminders, rescheduleDailyReminders } from '@/lib/notifications';

export default function MeScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getAppSettings });

  async function updateTime(slot: 'am' | 'pm', time: string) {
    if (!settings) return;
    const am = slot === 'am' ? time : settings.reminderAmTime;
    const pm = slot === 'pm' ? time : settings.reminderPmTime;
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
      <Tabs.Screen
        options={{
          title: 'Me',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'person.fill', android: 'person', web: 'person' }} size={22} tintColor={color} />
          ),
        }}
      />
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

            <TimePickerField
              label="Morning"
              time={settings.reminderAmTime}
              onChange={(time) => updateTime('am', time)}
              style={styles.pickerRow}
            />
            <TimePickerField
              label="Evening"
              time={settings.reminderPmTime}
              onChange={(time) => updateTime('pm', time)}
              style={styles.pickerRow}
            />
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
