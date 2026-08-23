import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { LinkButton } from '@/components/link-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ITEM_TYPE_LABEL } from '@/features/routine/catalog';
import { ITEM_TYPE_ICON } from '@/features/routine/components/routine-builder';
import { describeRoutine, describeSchedule } from '@/features/routine/describe';
import {
  getActiveRoutine,
  getItemsForRoutine,
  pauseRoutine,
  resumeRoutine,
} from '@/features/routine/api';
import { useTheme } from '@/hooks/use-theme';

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

        {!isLoading && !routine ? (
          <ThemedText themeColor="textSecondary">No routine set up yet.</ThemedText>
        ) : null}

        {routine ? (
          <>
            <ThemedView type="backgroundElement" style={styles.summary}>
              <ThemedText type="smallBold">{describeRoutine(items)}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                Since {routine.startDate}
                {routine.status === 'paused' ? ' · Paused' : ''}
              </ThemedText>
              <Pressable
                onPress={async () => {
                  if (routine.status === 'paused') await resumeRoutine(routine.id);
                  else await pauseRoutine(routine.id, null);
                  queryClient.invalidateQueries();
                }}>
                <ThemedText type="linkPrimary">
                  {routine.status === 'paused' ? 'Resume routine' : 'Pause routine'}
                </ThemedText>
              </Pressable>
            </ThemedView>

            {items.map((item) => (
              <ThemedView key={item.id} type="backgroundElement" style={styles.itemCard}>
                <SymbolView name={ITEM_TYPE_ICON[item.type]} size={20} tintColor={theme.primary} />
                <ThemedView type="backgroundElement" style={styles.itemText}>
                  <ThemedText type="smallBold">
                    {item.name}
                    {item.dosage ? ` · ${item.dosage}` : ''}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    {ITEM_TYPE_LABEL[item.type]} · {describeSchedule(item.daysOfWeek, item.times)}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            ))}
          </>
        ) : null}

        <ThemedView style={styles.links}>
          <LinkButton href="/routine/weekly">
              <ThemedText type="linkPrimary">View your week</ThemedText>
            </LinkButton>
          <LinkButton href="/routine/new">
              <ThemedText type="linkPrimary">
                {routine ? 'Start new routine' : 'Set up your routine'}
              </ThemedText>
            </LinkButton>
          <LinkButton href="/timeline">
              <ThemedText type="linkPrimary">View timeline</ThemedText>
            </LinkButton>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  summary: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  itemText: { flex: 1, gap: Spacing.half },
  links: { gap: Spacing.two, paddingTop: Spacing.two },
});
