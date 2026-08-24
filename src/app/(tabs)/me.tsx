import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { LinkButton } from '@/components/link-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getAppSettings, setNotificationsEnabled } from '@/features/onboarding/settings-api';
import { getAllRoutineItems } from '@/features/routine/api';
import { useRoutineDraft } from '@/features/routine/draft-store';
import { useTheme } from '@/hooks/use-theme';
import { cancelAllDoseReminders, rescheduleRoutineReminders } from '@/lib/notifications';

export default function MeScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getAppSettings });

  async function toggleNotifications() {
    if (!settings) return;
    const next = !settings.notificationsEnabled;
    await setNotificationsEnabled(next);
    if (next) await rescheduleRoutineReminders(await getAllRoutineItems());
    else await cancelAllDoseReminders();
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
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Me</ThemedText>

        {settings ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <Pressable style={styles.row} onPress={toggleNotifications}>
              <ThemedText type="smallBold">Notifications</ThemedText>
              <ThemedView
                type="backgroundSelected"
                style={StyleSheet.flatten([
                  styles.toggle,
                  settings.notificationsEnabled && { backgroundColor: theme.primary },
                ])}>
                <ThemedText
                  type="small"
                  style={settings.notificationsEnabled ? { color: theme.onPrimary } : undefined}>
                  {settings.notificationsEnabled ? 'On' : 'Off'}
                </ThemedText>
              </ThemedView>
            </Pressable>

            <ThemedText themeColor="textSecondary" type="small">
              Reminder times come from each item&apos;s own schedule — edit them in your routine.
            </ThemedText>
            <LinkButton href="/routine/new" onPress={() => useRoutineDraft.getState().reset()}>
                <ThemedText type="linkPrimary">Edit routine &amp; reminder times</ThemedText>
              </LinkButton>
          </ThemedView>
        ) : null}

        <LinkButton href="/export">
            <ThemedText type="linkPrimary">Export data (PDF)</ThemedText>
          </LinkButton>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Spacing.four },
});
