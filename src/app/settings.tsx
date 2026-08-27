import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getAuthStatus } from '@/features/auth/api';
import { resetAllData } from '@/features/dev/reset-data';
import { useOnboardingDraft } from '@/features/onboarding/draft-store';
import { useRoutineDraft } from '@/features/routine/draft-store';
import { useAsyncAction } from '@/hooks/use-async-action';
import { useTheme } from '@/hooks/use-theme';

/**
 * What's left of the old Me tab: the account disclosure and the dev-only reset.
 *
 * Everything people actually reach for went back to where it's used — the reminders toggle and
 * PDF export now live on Routine, beside the routine they describe. Me felt useless because it
 * was a bucket of unrelated controls, and a bucket doesn't stop being one by moving tabs; what
 * was left after emptying it is genuinely low-traffic, which is why two taps deep is fine here
 * and wasn't for the rest.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data: auth } = useQuery({ queryKey: ['auth'], queryFn: getAuthStatus });
  const { run, pending: resetting } = useAsyncAction("Couldn't reset app data");

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
          onPress: () =>
            run(async () => {
              await resetAllData();
              // Both drafts, not just the routine one: they're persisted now, so a stale
              // onboarding draft would survive a reset and prefill the name of the "new" user.
              useRoutineDraft.getState().reset();
              useOnboardingDraft.getState().reset();
              // Clear every cache before routing, or the gate re-reads a stale profile and
              // sends you back to the tabs instead of onboarding.
              queryClient.clear();
              router.replace('/');
            }),
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Settings' }} />
      <ScrollView contentContainerStyle={styles.content}>
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
              {/* Precise, not reassuring-sounding. An account *is* created on a server, so
                  "nothing is uploaded" was too loose — what's true is that no health data
                  leaves the device. Overstating here is what costs trust when someone checks. */}
              <ThemedText themeColor="textSecondary" type="small">
                Your routine, doses and photos never leave this phone. The account holds no
                personal information — it exists so features that need a server can be added
                later without asking you to sign up for something you already have.
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
});
