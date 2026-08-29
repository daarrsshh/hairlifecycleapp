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

/**
 * The headline. A routine that *replaced* another says what changed, not "Started" again —
 * changing a dose time creates a new routine, so every edit used to produce a second identical
 * "Started oral Minoxidil" with nothing to distinguish it.
 */
function summarize(event: TimelineEvent): string {
  switch (event.type) {
    case 'routine-started': {
      if (!event.change) return `Started ${event.label}`;
      const { added, removed, rescheduled } = event.change;
      const parts = [
        added.length ? `Added ${added.join(', ')}` : null,
        removed.length ? `Stopped ${removed.join(', ')}` : null,
        rescheduled.length ? `Rescheduled ${rescheduled.join(', ')}` : null,
      ].filter(Boolean);
      // A new routine whose items are identical to the last — possible if only a dosage or
      // the item order changed — still deserves an honest label rather than a blank one.
      return parts.length ? parts.join(' · ') : 'Routine updated';
    }
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
      // Expanding shows the full routine as it stood from this date, so a change entry can be
      // read in context rather than only as a delta.
      return event.itemNames.length ? `Now taking: ${event.itemNames.join(', ')}` : 'No items';
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
