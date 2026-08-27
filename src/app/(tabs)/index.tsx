import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { LinkButton } from '@/components/link-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useConsistencyStats, useWeeklyProgress } from '@/features/consistency/hooks';
import { ConsistencyHeatmap } from '@/features/consistency/components/consistency-heatmap';
import { DayDetailCard } from '@/features/consistency/components/day-detail-card';
import { ItemConsistencyList } from '@/features/consistency/components/item-consistency-list';
import { WeekStrip } from '@/features/consistency/components/week-strip';
import { DoseRow } from '@/features/dose-log/components/dose-row';
import { useLogDose, useTodayDoses } from '@/features/dose-log/hooks';
import { getAppSettings } from '@/features/onboarding/settings-api';
import { getActiveMilestone } from '@/features/learn/milestones';
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
  /* Deliberately a separate query from useTodayDoses, not a merged one: today's checklist is the
     30-second loop this screen exists for, and it must paint without waiting on a month of
     history being rolled up behind it. */
  const { data: stats } = useConsistencyStats();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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
  const milestone = getActiveMilestone(weekly?.earliestStart ?? null, currentDate);

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
        <ThemedView>
          <ThemedText type="subtitle">Today</ThemedText>
          {totalCount > 0 ? (
            <ThemedText themeColor="textSecondary" type="small">
              {takenCount} of {totalCount} done
            </ThemedText>
          ) : null}
        </ThemedView>

        {/* A compact week at a glance. Kept above the checklist because it's one short row —
            anything larger would push today's actual doses down the screen. */}
        {weekly ? (
          <ThemedView style={[styles.weekCard, { borderColor: theme.border }]}>
            <ThemedView style={styles.weekHeader}>
              <ThemedText type="smallBold">This week</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {weekly.total === 0 ? 'Nothing due yet' : `${weekly.completed} of ${weekly.total} days`}
              </ThemedText>
            </ThemedView>
            <WeekStrip days={weekly.days} />
          </ThemedView>
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

        {/* A note for where they are in the journey — most importantly the weeks-2-to-8 shedding
            phase, which looks like the treatment failing and is when people quit. Sits above the
            checklist because it's context for the whole screen, not another thing to do. */}
        {milestone ? (
          <ThemedView type="backgroundElement" style={styles.milestoneCard}>
            <ThemedText type="smallBold">{milestone.title}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {milestone.body}
            </ThemedText>
            <LinkButton href={`/learn/${milestone.articleId}`}>
              <ThemedText type="linkPrimary">{milestone.linkLabel}</ThemedText>
            </LinkButton>
          </ThemedView>
        ) : null}

        {todayItems.length === 0 && routine.status !== 'paused' ? (
          <ThemedText themeColor="textSecondary">Nothing scheduled today.</ThemedText>
        ) : null}

        {/* One card per item, with a row per dose — so an item taken twice a day reads as one
            thing done twice, while each dose is still logged independently. */}
        {todayItems.map((item) => (
          <ThemedView key={item.itemId} type="backgroundElement" style={styles.itemCard}>
            <ThemedView type="backgroundElement" style={styles.itemHeader}>
              <SymbolView name={ITEM_TYPE_ICON[item.type]} size={22} tintColor={theme.primary} />
              {/* `heading`, not `smallBold` — the item is the thing you're here to act on, so it
                  should outrank the dose times beneath it rather than matching them. */}
              <ThemedText type="heading" style={styles.itemName}>
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

        {/* Below the checklist, never above it: today is why anyone opens this screen, and
            history is what they scroll to when they want it. Formerly its own Consistency tab. */}
        {stats && (stats.itemsThisWeek.length > 0 || stats.monthRatio.total > 0) ? (
          <>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
              How it&apos;s going
            </ThemedText>

            {stats.itemsThisWeek.length > 0 ? (
              <ItemConsistencyList items={stats.itemsThisWeek} />
            ) : null}

            <ThemedView type="backgroundElement" style={styles.historyCard}>
              {/* The heatmap renders its own "August 2026" heading. */}
              <ConsistencyHeatmap
                year={stats.year}
                month={stats.month}
                dayStatuses={stats.monthDayStatuses}
                onSelectDate={setSelectedDate}
              />
              <ThemedText themeColor="textSecondary" type="small" style={styles.monthSummary}>
                {stats.monthRatio.total === 0
                  ? 'Nothing scheduled this month yet.'
                  : `${stats.monthRatio.completed} of ${stats.monthRatio.total} days complete`}
              </ThemedText>
              {/* Tapping a day to log a missed dose is PRD §4.2 and was unsignposted for a long
                  time — a correction feature nobody can find is the same as not having one. */}
              <ThemedText themeColor="textSecondary" type="caption">
                Tap any day to see what was scheduled, or to log something you missed.
              </ThemedText>
            </ThemedView>

            {selectedDate ? (
              <DayDetailCard date={selectedDate} onClose={() => setSelectedDate(null)} />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  content: { padding: Spacing.four, gap: Spacing.three },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.three },
  historyCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  monthSummary: { marginTop: Spacing.two },
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
  milestoneCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  itemCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one },
  itemName: { flex: 1 },
});
