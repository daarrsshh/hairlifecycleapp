import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ListDivider, ListGroup, ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getAuthStatus } from '@/features/auth/api';
import { resetAllData } from '@/features/dev/reset-data';
import { getAppSettings, setNotificationsEnabled } from '@/features/onboarding/settings-api';
import { getAllRoutineItems } from '@/features/routine/api';
import { useRoutineDraft } from '@/features/routine/draft-store';
import { useTheme } from '@/hooks/use-theme';
import { cancelAllDoseReminders, rescheduleRoutineReminders } from '@/lib/notifications';

/**
 * Formerly the Me tab, which held three things and didn't earn a fifth slot in the tab bar.
 *
 * It's a pushed screen rather than scattered controls, because "what does this app know about
 * me, and how do I get my data out" is a question people go looking for an answer to — and the
 * answer needs one findable place, especially now that an account exists.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getAppSettings });
  const { data: auth } = useQuery({ queryKey: ['auth'], queryFn: getAuthStatus });
  const [resetting, setResetting] = useState(false);

  async function toggleNotifications() {
    if (!settings) return;
    const next = !settings.notificationsEnabled;
    await setNotificationsEnabled(next);
    if (next) await rescheduleRoutineReminders(await getAllRoutineItems());
    else await cancelAllDoseReminders();
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  }

  /** Destructive and irreversible, so it asks first — even in a dev-only affordance. */
  function confirmReset() {
    Alert.alert(
      'Reset all app data?',
      'Deletes your routine, every logged dose, all progress photos, and scheduled reminders. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await resetAllData();
              useRoutineDraft.getState().reset();
              // Clear every cache before routing, or the gate re-reads a stale profile and
              // sends you back to the tabs instead of onboarding.
              queryClient.clear();
              router.replace('/');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Settings' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
          Reminders
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <Pressable style={styles.row} onPress={toggleNotifications}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">Dose reminders</ThemedText>
              <ThemedText themeColor="textSecondary" type="caption">
                Times come from each item&apos;s own schedule
              </ThemedText>
            </View>
            <ThemedView
              type="backgroundSelected"
              style={StyleSheet.flatten([
                styles.toggle,
                settings?.notificationsEnabled && { backgroundColor: theme.primary },
              ])}>
              <ThemedText
                type="small"
                style={settings?.notificationsEnabled ? { color: theme.onPrimary } : undefined}>
                {settings?.notificationsEnabled ? 'On' : 'Off'}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>

        <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
          Your data
        </ThemedText>
        <ListGroup>
          <ListRow
            href="/export"
            icon={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' }}
            title="Export as PDF"
            subtitle="A summary and your photos, to share with a doctor"
          />
          <ListDivider />
          <ListRow
            href="/routine/new"
            onPress={() => useRoutineDraft.getState().reset()}
            icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            title="Edit routine & reminder times"
            subtitle="Changes what's scheduled from today"
          />
        </ListGroup>

        {/* Stated plainly rather than buried in a policy: an account exists, and it holds
            nothing. An account discovered later, rather than disclosed, is what costs trust. */}
        {auth && auth.state !== 'unconfigured' ? (
          <>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
              Account
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">
                {auth.state === 'identified' ? auth.email : 'Anonymous account'}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {auth.state === 'identified'
                  ? 'Signed in.'
                  : auth.state === 'anonymous'
                    ? 'No email, no password, and nothing to sign in to.'
                    : "Couldn't reach the server. Everything still works; this retries next time you open the app."}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                Your routine, doses and photos stay on this phone. Nothing is uploaded.
              </ThemedText>
            </ThemedView>
          </>
        ) : null}

        {/* Development only — stripped from production builds by the __DEV__ guard. */}
        {__DEV__ ? (
          <>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
              Developer
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText themeColor="textSecondary" type="small">
                Wipes your routine, logs, photos, and reminders, then restarts onboarding.
              </ThemedText>
              <Pressable onPress={confirmReset} disabled={resetting}>
                <ThemedText style={{ color: theme.missed }} type="smallBold">
                  {resetting ? 'Resetting…' : 'Reset all app data'}
                </ThemedText>
              </Pressable>
            </ThemedView>
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.five },
  label: { textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.three },
  rowText: { flex: 1, gap: Spacing.half },
  toggle: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Spacing.four },
});
