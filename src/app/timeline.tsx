import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getAllPhotos } from '@/features/photos/api';
import { getAllPauseWindows, getAllRoutineItems, getAllRoutines } from '@/features/routine/api';
import { describeRoutine } from '@/features/routine/describe';
import { buildTimeline, type TimelineEvent } from '@/features/timeline/build-timeline';

const ANGLE_LABEL: Record<string, string> = {
  crown: 'Crown',
  hairline: 'Hairline',
  left_temple: 'Left temple',
  right_temple: 'Right temple',
};

export default function TimelineScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['timeline'],
    queryFn: async () => {
      const [routines, items, pauseWindows, photos] = await Promise.all([
        getAllRoutines(),
        getAllRoutineItems(),
        getAllPauseWindows(),
        getAllPhotos(),
      ]);
      return buildTimeline(routines, items, pauseWindows, photos, describeRoutine);
    },
  });

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Timeline' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {!isLoading && data && data.length === 0 ? (
          <ThemedText themeColor="textSecondary">Nothing here yet.</ThemedText>
        ) : null}
        {data?.map((event, i) => <TimelineRow key={i} event={event} />)}
      </ScrollView>
    </ThemedView>
  );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable onPress={() => setExpanded((e) => !e)}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedText themeColor="textSecondary" type="small">
          {event.date}
        </ThemedText>
        <ThemedText type="smallBold">{summarize(event)}</ThemedText>
        {expanded ? <ThemedText themeColor="textSecondary" type="small">{detail(event)}</ThemedText> : null}
      </ThemedView>
    </Pressable>
  );
}

function summarize(event: TimelineEvent): string {
  switch (event.type) {
    case 'routine-started':
      return `Started ${event.label}`;
    case 'routine-paused':
      return 'Paused';
    case 'routine-resumed':
      return 'Resumed';
    case 'photos':
      return `Photos added (${event.angles.length})`;
  }
}

function detail(event: TimelineEvent): string {
  switch (event.type) {
    case 'routine-started':
      return event.itemNames.join(', ');
    case 'photos':
      return event.angles.map((a) => ANGLE_LABEL[a] ?? a).join(', ');
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two },
  row: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
});
