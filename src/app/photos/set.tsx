import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { LinkButton } from '@/components/link-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getAllPhotos } from '@/features/photos/api';
import { describeSetTiming, groupPhotosIntoSets } from '@/features/photos/photo-sets';
import { getAllRoutines } from '@/features/routine/api';
import { useTheme } from '@/hooks/use-theme';

const ANGLE_LABEL: Record<string, string> = {
  crown: 'Crown',
  hairline: 'Hairline',
  left_temple: 'Left temple',
  right_temple: 'Right temple',
};

/** Every angle captured on one day. Reached by tapping a set on the Photos tab. */
export default function PhotoSetScreen() {
  const theme = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['photos', 'set', date],
    queryFn: async () => {
      const [photos, routines] = await Promise.all([getAllPhotos(), getAllRoutines()]);
      const startDate = routines.reduce<string | null>(
        (min, r) => (min === null || r.startDate < min ? r.startDate : min),
        null
      );
      return groupPhotosIntoSets(photos, startDate).find((s) => s.date === date) ?? null;
    },
  });

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: data ? describeSetTiming(data) : 'Photos' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {!isLoading && !data ? (
          <ThemedText themeColor="textSecondary">That set is no longer available.</ThemedText>
        ) : null}

        {data ? (
          <>
            <ThemedText themeColor="textSecondary" type="small">
              Captured {data.date}
            </ThemedText>

            {data.photos.map((photo) => (
              <ThemedView key={photo.id} style={styles.photoBlock}>
                <ThemedText type="smallBold">{ANGLE_LABEL[photo.angle] ?? photo.angle}</ThemedText>
                <Image source={{ uri: photo.filePath }} style={styles.photo} contentFit="cover" />
              </ThemedView>
            ))}

            <LinkButton
              href="/photos/compare"
              style={[styles.button, { borderColor: theme.border, borderWidth: 1 }]}>
              <ThemedText type="smallBold">Compare with another set</ThemedText>
            </LinkButton>
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  photoBlock: { gap: Spacing.one },
  photo: { width: '100%', aspectRatio: 1, borderRadius: Spacing.three },
  button: { paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
});
