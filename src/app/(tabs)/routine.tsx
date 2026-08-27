import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ListDivider, ListGroup, ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ITEM_TYPE_LABEL } from '@/features/routine/catalog';
import { ITEM_TYPE_ICON } from '@/features/routine/components/routine-builder';
import { describeRoutine, describeSchedule } from '@/features/routine/describe';
import { useRoutineDraft } from '@/features/routine/draft-store';
import {
  getActiveRoutine,
  getItemsForRoutine,
  pauseRoutine,
  resumeRoutine,
} from '@/features/routine/api';
import { useTheme } from '@/hooks/use-theme';
import { daysBetween, today } from '@/lib/date';

export default function RoutineScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['routine'],
    queryFn: async () => {
      const routine = await getActiveRoutine();
      const items = routine ? await getItemsForRoutine(routine.id) : [];
      return { routine, items };
    },
  });

  const routine = data?.routine;
  const items = data?.items ?? [];
  const paused = routine?.status === 'paused';
  const dayCount = routine ? daysBetween(routine.startDate, today()) : 0;
  const doseCount = items.reduce((n, i) => n + i.daysOfWeek.length * i.times.length, 0);

  async function togglePause() {
    if (!routine) return;
    if (paused) await resumeRoutine(routine.id);
    else await pauseRoutine(routine.id, null);
    queryClient.invalidateQueries();
  }

  return (
    <ThemedView style={styles.container}>
      <Tabs.Screen
        options={{
          title: 'Routine',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'checklist', android: 'checklist', web: 'checklist' }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Routine</ThemedText>

        {!isLoading && !routine ? <EmptyRoutine /> : null}

        {routine ? (
          <>
            {/* Header carries the two facts worth knowing at a glance — what you're on, and how
                long you've been on it. Day count rather than a raw start date: on a treatment
                measured in months, "Day 47" is the number that means something. */}
            <ThemedView type="backgroundElement" style={styles.summary}>
              <View style={styles.summaryTop}>
                <View style={styles.summaryText}>
                  <ThemedText type="heading">{describeRoutine(items)}</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Day {dayCount} · {items.length} {items.length === 1 ? 'item' : 'items'} ·{' '}
                    {doseCount} {doseCount === 1 ? 'dose' : 'doses'} a week
                  </ThemedText>
                </View>
                {paused ? (
                  <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="caption" themeColor="textSecondary">
                      PAUSED
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              {/* A real button, not a text link — pausing treatment is a decision, and it was
                  previously indistinguishable from the navigation links below it. */}
              <Pressable
                onPress={togglePause}
                style={[styles.pauseButton, { borderColor: theme.border }]}>
                <SymbolView
                  name={
                    paused
                      ? { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }
                      : { ios: 'pause.fill', android: 'pause', web: 'pause' }
                  }
                  size={16}
                  tintColor={theme.text}
                />
                <ThemedText type="smallBold">{paused ? 'Resume routine' : 'Pause routine'}</ThemedText>
              </Pressable>

              {paused ? (
                <ThemedText themeColor="textSecondary" type="small">
                  Nothing is scheduled while paused, and your streak is frozen rather than broken.
                </ThemedText>
              ) : null}
            </ThemedView>

            <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
              What you&apos;re taking
            </ThemedText>

            {items.map((item) => (
              <ThemedView key={item.id} type="backgroundElement" style={styles.itemCard}>
                <View style={[styles.itemIcon, { backgroundColor: theme.backgroundSelected }]}>
                  <SymbolView name={ITEM_TYPE_ICON[item.type]} size={20} tintColor={theme.primary} />
                </View>
                <View style={styles.itemText}>
                  <ThemedText type="heading" numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  {item.dosage ? (
                    <ThemedText themeColor="textSecondary" type="small">
                      {ITEM_TYPE_LABEL[item.type]} · {item.dosage}
                    </ThemedText>
                  ) : (
                    <ThemedText themeColor="textSecondary" type="small">
                      {ITEM_TYPE_LABEL[item.type]}
                    </ThemedText>
                  )}
                  <ThemedText themeColor="textSecondary" type="small">
                    {describeSchedule(item.daysOfWeek, item.times)}
                  </ThemedText>
                </View>
              </ThemedView>
            ))}
          </>
        ) : null}

        {/* Grouped as one list with icons and chevrons rather than three loose blue links, which
            read as leftover debug affordances rather than the screen's main navigation. */}
        <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
          More
        </ThemedText>
        <ListGroup>
          <ListRow
            href="/routine/weekly"
            icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            title="Your week"
            subtitle="Everything scheduled, day by day"
          />
          <ListDivider />
          <ListRow
            href="/timeline"
            icon={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' }}
            title="Timeline"
            subtitle="Routine changes, pauses and photo dates"
          />
          <ListDivider />
          <ListRow
            href="/routine/new"
            onPress={() => useRoutineDraft.getState().reset()}
            icon={{ ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }}
            title={routine ? 'Start a new routine' : 'Set up your routine'}
            subtitle={
              routine
                ? 'Ends this one and keeps its history intact'
                : 'Add what you take and when'
            }
          />
        </ListGroup>
      </ScrollView>
    </ThemedView>
  );
}

function EmptyRoutine() {
  return (
    <ThemedView type="backgroundElement" style={styles.summary}>
      <ThemedText type="heading">No routine yet</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        Add what you&apos;re taking and when, and today&apos;s doses will show up on Home. You can
        change it whenever you like — starting a new routine keeps the old one&apos;s history.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.five },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.two },

  summary: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.three },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  summaryText: { flex: 1, gap: Spacing.half },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Spacing.four },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  itemIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, gap: Spacing.half },
});
