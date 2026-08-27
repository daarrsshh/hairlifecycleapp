import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { LinkButton } from '@/components/link-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getAllPhotos } from '@/features/photos/api';
import { describeSetCoverage, describeSetTiming, groupPhotosIntoSets } from '@/features/photos/photo-sets';
import { getAllRoutines } from '@/features/routine/api';
import { useTheme } from '@/hooks/use-theme';

export default function PhotosScreen() {
  const theme = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ['photos', 'sets'],
    queryFn: async () => {
      const [photos, routines] = await Promise.all([getAllPhotos(), getAllRoutines()]);
      const startDate = routines.reduce<string | null>(
        (min, r) => (min === null || r.startDate < min ? r.startDate : min),
        null
      );
      return groupPhotosIntoSets(photos, startDate);
    },
  });

  const sets = data ?? [];

  return (
    <ThemedView style={styles.container}>
      <Tabs.Screen
        options={{
          title: 'Photos',
          tabBarIcon: ({ color }) => (
            <Icon
              name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.actionsRow}>
          <LinkButton href="/photos/capture" style={[styles.actionButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
              Add photos
            </ThemedText>
          </LinkButton>
          <LinkButton
            href="/photos/compare"
            style={[styles.actionButton, { borderColor: theme.border, borderWidth: 1 }]}>
            <ThemedText type="smallBold">Compare</ThemedText>
          </LinkButton>
        </ThemedView>

        {!isLoading && sets.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.empty}>
            <ThemedText type="smallBold">No photos yet</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Add your first set to start tracking progress — four angles takes about a minute.
            </ThemedText>
          </ThemedView>
        ) : null}

        {/* One card per capture session rather than one per photo, so the list stays readable
            as sets accumulate. Tapping opens all the angles from that day. */}
        {sets.map((set) => (
          <LinkButton
            key={set.date}
            href={{ pathname: '/photos/set', params: { date: set.date } }}
            style={[styles.setCard, { borderColor: theme.border }]}>
            <Image source={{ uri: set.coverPhoto.filePath }} style={styles.cover} contentFit="cover" />
            <ThemedView style={styles.setText}>
              <ThemedText type="smallBold">{describeSetTiming(set)}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {set.date}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {describeSetCoverage(set)}
              </ThemedText>
            </ThemedView>
            <Icon
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={18}
              color={theme.textSecondary}
            />
          </LinkButton>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  actionsRow: { flexDirection: 'row', gap: Spacing.two },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  empty: { padding: Spacing.four, borderRadius: Spacing.three, gap: Spacing.one },
  setCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  cover: { width: 72, height: 72, borderRadius: Spacing.two },
  setText: { flex: 1, gap: 2 },
});
