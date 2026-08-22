import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { buildTimeline, type TimelineEvent } from '@/features/timeline/build-timeline';
import { describeTreatment } from '@/features/treatment/describe';
import { getAllPauseWindows, getAllTreatmentPeriods } from '@/features/treatment/api';
import { db } from '@/db/client';
import { treatmentPeriodDrugs } from '@/db/schema';
import { getAllPhotos } from '@/features/photos/api';

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
      const [periods, drugs, pauseWindows, photos] = await Promise.all([
        getAllTreatmentPeriods(),
        db.select().from(treatmentPeriodDrugs),
        getAllPauseWindows(),
        getAllPhotos(),
      ]);
      return buildTimeline(periods, drugs, pauseWindows, photos, describeTreatment);
    },
  });

  return (
    <ThemedView style={styles.container}>
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
    case 'treatment-started':
      return `Started ${event.label}`;
    case 'treatment-paused':
      return 'Paused';
    case 'treatment-resumed':
      return 'Resumed';
    case 'photos':
      return `Photos added (${event.angles.length})`;
  }
}

function detail(event: TimelineEvent): string {
  switch (event.type) {
    case 'treatment-started':
      return event.drugNames.join(', ');
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
