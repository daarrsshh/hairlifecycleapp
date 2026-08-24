import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { LinkButton } from '@/components/link-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useWeeklyProgress } from '@/features/consistency/hooks';
import { WeekStrip } from '@/features/consistency/components/week-strip';
import { DoseRow } from '@/features/dose-log/components/dose-row';
import { useLogDose, useTodayDoses } from '@/features/dose-log/hooks';
import { getAppSettings } from '@/features/onboarding/settings-api';
import { isPhotoReminderDue } from '@/features/photos/photo-reminder';
import { ITEM_TYPE_ICON } from '@/features/routine/components/routine-builder';
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
  const { data: weekly } = useWeeklyProgress();
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

  const { routine, todayItems, takenCount, totalCount } = data;
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
          <LinkButton href="/consistency">
            <ThemedView type="backgroundElement" style={styles.streakBadge}>
              <ThemedText type="smallBold">
                {weekly && weekly.currentStreak > 0 ? `🔥 ${weekly.currentStreak} day streak` : 'Consistency'}
              </ThemedText>
            </ThemedView>
          </LinkButton>
        </ThemedView>

        {/* A compact week at a glance. Kept above the checklist because it's one short row —
            anything larger would push today's actual doses down the screen. */}
        {weekly ? (
          <LinkButton href="/consistency" style={[styles.weekCard, { borderColor: theme.border }]}>
            <ThemedView style={styles.weekHeader}>
              <ThemedText type="smallBold">This week</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {weekly.total === 0 ? 'Nothing due yet' : `${weekly.completed} of ${weekly.total} days`}
              </ThemedText>
            </ThemedView>
            <WeekStrip days={weekly.days} />
          </LinkButton>
        ) : null}

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
          <LinkButton href="/photos/capture">
              <ThemedView type="backgroundElement" style={styles.banner}>
                <ThemedText type="smallBold">Time for new photos</ThemedText>
                <ThemedText type="linkPrimary">Add photos</ThemedText>
              </ThemedView>
            </LinkButton>
        ) : null}

        {todayItems.length === 0 && routine.status !== 'paused' ? (
          <ThemedText themeColor="textSecondary">Nothing scheduled today.</ThemedText>
        ) : null}

        {/* One card per item, with a row per dose — so an item taken twice a day reads as one
            thing done twice, while each dose is still logged independently. */}
        {todayItems.map((item) => (
          <ThemedView key={item.itemId} type="backgroundElement" style={styles.itemCard}>
            <ThemedView type="backgroundElement" style={styles.itemHeader}>
              <SymbolView name={ITEM_TYPE_ICON[item.type]} size={20} tintColor={theme.primary} />
              <ThemedText type="smallBold" style={styles.itemName}>
                {item.name}
                {item.dosage ? ` · ${item.dosage}` : ''}
              </ThemedText>
              {item.doses.length > 1 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.takenCount} of {item.doses.length}
                </ThemedText>
              ) : null}
            </ThemedView>

            {item.doses.map((dose) => (
              <DoseRow
                key={dose.time}
                time={dose.time}
                state={dose.state}
                onTaken={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  logDose.mutate({
                    routineItemId: item.itemId,
                    date: currentDate,
                    time: dose.time,
                    state: 'taken',
                  });
                }}
                onSkip={() =>
                  logDose.mutate({
                    routineItemId: item.itemId,
                    date: currentDate,
                    time: dose.time,
                    state: 'skipped',
                  })
                }
              />
            ))}
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  content: { padding: Spacing.four, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  streakBadge: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Spacing.four },
  weekCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  itemCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one },
  itemName: { flex: 1 },
});
