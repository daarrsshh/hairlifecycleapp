import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCurrentStreak } from '@/features/consistency/hooks';
import { computeEffectiveState, type DoseSlot, type DoseState } from '@/features/dose-log/doseState';
import { useLogDose, useTodayDoses } from '@/features/dose-log/hooks';
import { getAppSettings } from '@/features/onboarding/settings-api';
import { isPhotoReminderDue } from '@/features/photos/photo-reminder';
import { resumeTreatmentPeriod } from '@/features/treatment/api';
import { useTheme } from '@/hooks/use-theme';
import { today } from '@/lib/date';

const SLOT_LABEL: Record<DoseSlot, string> = { am: 'Morning', pm: 'Evening' };

export default function HomeScreen() {
  const { data, isLoading } = useTodayDoses();
  const { data: streak } = useCurrentStreak();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getAppSettings });
  const logDose = useLogDose();
  const queryClient = useQueryClient();

  if (isLoading || !data) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} />
      </ThemedView>
    );
  }

  const { period, requiredSlots, logs, drugs } = data;
  const currentDate = today();

  if (!period) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle">No routine set up yet</ThemedText>
          <ThemedText themeColor="textSecondary">Head to the Routine tab to start one.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Today</ThemedText>
          <Link href="/consistency" asChild>
            <Pressable>
              <ThemedView type="backgroundElement" style={styles.streakBadge}>
                <ThemedText type="smallBold">
                  {streak && streak > 0 ? `🔥 ${streak} day streak` : 'Consistency'}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        </ThemedView>

        {period.status === 'paused' ? (
          <ThemedView type="backgroundElement" style={styles.pausedCard}>
            <ThemedText type="smallBold">Paused</ThemedText>
            <Pressable
              onPress={async () => {
                await resumeTreatmentPeriod(period.id);
                queryClient.invalidateQueries({ queryKey: ['doses'] });
              }}>
              <ThemedText type="linkPrimary">Resume</ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}

        {settings &&
        isPhotoReminderDue(settings.lastPhotoSetDate, currentDate, settings.photoReminderIntervalDays) ? (
          <Link href="/photos/capture" asChild>
            <Pressable>
              <ThemedView type="backgroundElement" style={styles.pausedCard}>
                <ThemedText type="smallBold">Time for new photos</ThemedText>
                <ThemedText type="linkPrimary">Add photos</ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        ) : null}

        {requiredSlots.length === 0 && period.status !== 'paused' ? (
          <ThemedText themeColor="textSecondary">Nothing to log today.</ThemedText>
        ) : null}

        {requiredSlots.map((slot) => {
          const drugNames = drugs
            .filter((d) => d.slot === slot || d.slot === 'both')
            .map((d) => d.drugName)
            .join(', ');
          const log = logs.find((l) => l.slot === slot);
          const state = computeEffectiveState(log, currentDate, currentDate);

          return (
            <ThemedView key={slot} type="backgroundElement" style={styles.slotCard}>
              <ThemedView type="backgroundElement" style={styles.slotHeader}>
                <ThemedText type="smallBold">{SLOT_LABEL[slot]}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {drugNames}
                </ThemedText>
              </ThemedView>

              <StateActions
                state={state}
                onTaken={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  logDose.mutate({ treatmentPeriodId: period.id, date: currentDate, slot, state: 'taken' });
                }}
                onSkip={() => {
                  logDose.mutate({ treatmentPeriodId: period.id, date: currentDate, slot, state: 'skipped' });
                }}
              />
            </ThemedView>
          );
        })}
      </SafeAreaView>
    </ThemedView>
  );
}

function StateActions({
  state,
  onTaken,
  onSkip,
}: {
  state: DoseState;
  onTaken: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();

  if (state === 'taken') {
    return <ThemedText style={{ color: theme.taken }}>✓ Taken</ThemedText>;
  }
  if (state === 'skipped' || state === 'missed') {
    // Skipped and Missed look identical (icon + color, no distinguishing text) — the
    // deliberate-vs-forgotten distinction is data-only (PRD §5.2/§9). Missed alone stays
    // tappable, since — unlike a locked Skip — it's still open to a late Taken.
    const notTaken = <ThemedText style={{ color: theme.missed }}>– Not taken</ThemedText>;
    return state === 'missed' ? <Pressable onPress={onTaken}>{notTaken}</Pressable> : notTaken;
  }

  return (
    <ThemedView type="backgroundElement" style={styles.actionsRow}>
      <Pressable
        onPress={onTaken}
        style={[styles.actionButton, { backgroundColor: theme.primary }]}>
        <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
          Taken
        </ThemedText>
      </Pressable>
      <Pressable onPress={onSkip} style={styles.actionButton}>
        <ThemedText themeColor="textSecondary" type="smallBold">
          Skip
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streakBadge: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Spacing.four },
  pausedCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  slotCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  slotHeader: { gap: Spacing.half },
  actionsRow: { flexDirection: 'row', gap: Spacing.two },
  actionButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
});
