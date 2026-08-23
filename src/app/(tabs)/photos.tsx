import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getAllPhotos } from '@/features/photos/api';
import { useTheme } from '@/hooks/use-theme';

const ANGLE_LABEL: Record<string, string> = {
  crown: 'Crown',
  hairline: 'Hairline',
  left_temple: 'Left temple',
  right_temple: 'Right temple',
};

export default function PhotosScreen() {
  const theme = useTheme();
  const { data: photos, isLoading } = useQuery({ queryKey: ['photos', 'all'], queryFn: getAllPhotos });

  const sorted = [...(photos ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <ThemedView style={styles.container}>
      <Tabs.Screen
        options={{
          title: 'Photos',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.actionsRow}>
          <Link href="/photos/capture" asChild>
            <Pressable style={StyleSheet.flatten([styles.actionButton, { backgroundColor: theme.primary }])}>
              <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
                Add photos
              </ThemedText>
            </Pressable>
          </Link>
          <Link href="/photos/compare" asChild>
            <Pressable
              style={StyleSheet.flatten([styles.actionButton, { borderColor: theme.border, borderWidth: 1 }])}>
              <ThemedText type="smallBold">Compare</ThemedText>
            </Pressable>
          </Link>
        </ThemedView>

        {!isLoading && sorted.length === 0 ? (
          <ThemedText themeColor="textSecondary">No photos yet — add your first set.</ThemedText>
        ) : null}

        <View style={styles.grid}>
          {sorted.map((photo) => (
            <View key={photo.id} style={styles.gridItem}>
              <Image source={{ uri: photo.filePath }} style={styles.thumbnail} contentFit="cover" />
              <ThemedText type="small" themeColor="textSecondary">
                {ANGLE_LABEL[photo.angle] ?? photo.angle} · {photo.date}
              </ThemedText>
            </View>
          ))}
        </View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  gridItem: { width: '47%', gap: Spacing.half },
  thumbnail: { width: '100%', aspectRatio: 1, borderRadius: Spacing.two },
});
