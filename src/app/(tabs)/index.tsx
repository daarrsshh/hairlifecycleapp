import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Link, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCurrentStreak } from '@/features/consistency/hooks';
import type { DoseState } from '@/features/dose-log/doseState';
import { useLogDose, useTodayDoses, type TodayDose } from '@/features/dose-log/hooks';
import { getAppSettings } from '@/features/onboarding/settings-api';
import { isPhotoReminderDue } from '@/features/photos/photo-reminder';
import { ITEM_TYPE_ICON } from '@/features/routine/components/routine-builder';
import { formatTime } from '@/features/routine/describe';
import { resumeRoutine } from '@/features/routine/api';
import { useTheme } from '@/hooks/use-theme';
import { today } from '@/lib/date';

function HomeTabScreen() {
  return (
    <Tabs.Screen
      options={{
        title: 'Home',
        tabBarIcon: ({ color }) => (
          <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} size={22} tintColor={color} />
        ),
      }}
    />
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { data, isLoading } = useTodayDoses();
  const { data: streak } = useCurrentStreak();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getAppSettings });
  const logDose = useLogDose();
  const queryClient = useQueryClient();

  if (isLoading || !data) {
    return (
      <ThemedView style={styles.container}>
        <HomeTabScreen />
      </ThemedView>
    );
  }

  const { routine, timeBlocks, takenCount, totalCount } = data;
  const currentDate = today();

  if (!routine) {
    return (
      <ThemedView style={styles.container}>
        <HomeTabScreen />
        <ThemedView style={styles.centered}>
          <ThemedText type="subtitle">No routine yet</ThemedText>
          <ThemedText themeColor="textSecondary">Head to the Routine tab to set one up.</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <HomeTabScreen />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedView>
            <ThemedText type="subtitle">Today</ThemedText>
            {totalCount > 0 ? (
              <ThemedText themeColor="textSecondary" type="small">
                {takenCount} of {totalCount} done
              </ThemedText>
            ) : null}
          </ThemedView>
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

        {routine.status === 'paused' ? (
          <ThemedView type="backgroundElement" style={styles.banner}>
            <ThemedText type="smallBold">Paused</ThemedText>
            <Pressable
              onPress={async () => {
                await resumeRoutine(routine.id);
                queryClient.invalidateQueries();
              }}>
              <ThemedText type="linkPrimary">Resume</ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}

        {settings &&
        isPhotoReminderDue(settings.lastPhotoSetDate, currentDate, settings.photoReminderIntervalDays) ? (
          <Link href="/photos/capture" asChild>
            <Pressable>
              <ThemedView type="backgroundElement" style={styles.banner}>
                <ThemedText type="smallBold">Time for new photos</ThemedText>
                <ThemedText type="linkPrimary">Add photos</ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        ) : null}

        {timeBlocks.length === 0 && routine.status !== 'paused' ? (
          <ThemedText themeColor="textSecondary">Nothing scheduled today.</ThemedText>
        ) : null}

        {timeBlocks.map((block) => (
          <ThemedView key={block.time} style={styles.block}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {block.label} · {formatTime(block.time)}
            </ThemedText>

            {block.doses.map((dose) => (
              <ThemedView key={`${dose.itemId}-${dose.time}`} type="backgroundElement" style={styles.doseCard}>
                <ThemedView type="backgroundElement" style={styles.doseHeader}>
                  <SymbolView name={ITEM_TYPE_ICON[dose.type]} size={20} tintColor={theme.primary} />
                  <ThemedText type="smallBold">
                    {dose.name}
                    {dose.dosage ? ` · ${dose.dosage}` : ''}
                  </ThemedText>
                </ThemedView>

                <StateActions
                  state={dose.state}
                  onTaken={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    logDose.mutate({
                      routineItemId: dose.itemId,
                      date: currentDate,
                      time: dose.time,
                      state: 'taken',
                    });
                  }}
                  onSkip={() =>
                    logDose.mutate({
                      routineItemId: dose.itemId,
                      date: currentDate,
                      time: dose.time,
                      state: 'skipped',
                    })
                  }
                />
              </ThemedView>
            ))}
          </ThemedView>
        ))}
      </ScrollView>
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
      <Pressable onPress={onTaken} style={[styles.actionButton, { backgroundColor: theme.primary }]}>
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

export type { TodayDose };

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  content: { padding: Spacing.four, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  streakBadge: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Spacing.four },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  block: { gap: Spacing.two },
  doseCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  doseHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  actionsRow: { flexDirection: 'row', gap: Spacing.two },
  actionButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
});
