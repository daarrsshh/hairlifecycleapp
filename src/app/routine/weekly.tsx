import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Icon } from '@/components/icon';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ITEM_TYPE_ICON } from '@/features/routine/components/routine-builder';
import { getActiveRoutine, getItemsForRoutine } from '@/features/routine/api';
import { formatTime } from '@/features/routine/describe';
import { useTheme } from '@/hooks/use-theme';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Items as rows, Mon–Sun as columns — the one place the whole combined routine is visible at a glance (spec §2). */
export default function WeeklyRoutineScreen() {
  const theme = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ['routine', 'weekly'],
    queryFn: async () => {
      const routine = await getActiveRoutine();
      const items = routine ? await getItemsForRoutine(routine.id) : [];
      return { routine, items };
    },
  });

  const items = data?.items ?? [];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Your week' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {!isLoading && items.length === 0 ? (
          <ThemedText themeColor="textSecondary">No routine set up yet.</ThemedText>
        ) : null}

        {items.length > 0 ? (
          <ThemedView type="backgroundElement" style={styles.grid}>
            <View style={styles.headerRow}>
              <View style={styles.nameCell} />
              {DAY_LABELS.map((label, i) => (
                <View key={i} style={styles.dayCell}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {label}
                  </ThemedText>
                </View>
              ))}
            </View>

            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.nameCell}>
                  <View style={styles.nameLine}>
                    <Icon name={ITEM_TYPE_ICON[item.type]} size={16} color={theme.textSecondary} accessibilityElementsHidden importantForAccessibility="no" />
                    <ThemedText type="small" numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.timeLine}>
                    {item.times.map(formatTime).join(', ')}
                  </ThemedText>
                </View>

                {DAY_LABELS.map((_, day) => {
                  const scheduled = item.daysOfWeek.includes(day);
                  return (
                    <View key={day} style={styles.dayCell}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: scheduled ? theme.primary : 'transparent',
                            borderColor: scheduled ? theme.primary : theme.border,
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </ThemedView>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  grid: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  nameCell: { flex: 1, minWidth: 0, paddingRight: Spacing.two, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  timeLine: { fontSize: 11 },
  dayCell: { width: 28, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
});
