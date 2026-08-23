import { Link } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { RoutineItemType } from '@/features/dose-log/doseState';
import { ITEM_TYPE_LABEL } from '@/features/routine/catalog';
import { describeSchedule } from '@/features/routine/describe';
import { useRoutineDraft } from '@/features/routine/draft-store';
import { useTheme } from '@/hooks/use-theme';

export const ITEM_TYPE_ICON: Record<RoutineItemType, SymbolViewProps['name']> = {
  oral: { ios: 'pills.fill', android: 'medication', web: 'medication' },
  topical: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  device: { ios: 'wave.3.right', android: 'devices', web: 'devices' },
};

/**
 * The list of items in the routine being built, shared by onboarding and "Start new routine".
 * Both assemble the same thing; they differ only in the footer action.
 */
export function RoutineBuilder({
  headerText,
  footer,
}: {
  headerText: string;
  footer: ReactNode;
}) {
  const theme = useTheme();
  const { items, removeItem } = useRoutineDraft();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText themeColor="textSecondary" type="small">
          {headerText}
        </ThemedText>

        {items.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.empty}>
            <ThemedText type="smallBold">Nothing added yet</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Add each pill, topical, or device you use — you can set its own days and times.
            </ThemedText>
          </ThemedView>
        ) : null}

        {items.map((item, index) => (
          <ThemedView key={index} type="backgroundElement" style={styles.card}>
            <ThemedView type="backgroundElement" style={styles.cardHeader}>
              <SymbolView name={ITEM_TYPE_ICON[item.type]} size={20} tintColor={theme.primary} />
              <ThemedView type="backgroundElement" style={styles.cardTitle}>
                <ThemedText type="smallBold">
                  {item.name}
                  {item.dosage ? ` · ${item.dosage}` : ''}
                </ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {ITEM_TYPE_LABEL[item.type]} · {describeSchedule(item.daysOfWeek, item.times)}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.cardActions}>
              <Link href={{ pathname: '/routine/item', params: { index: String(index) } }} asChild>
                <Pressable>
                  <ThemedText type="linkPrimary">Edit</ThemedText>
                </Pressable>
              </Link>
              <Pressable onPress={() => removeItem(index)}>
                <ThemedText themeColor="textSecondary" type="small">
                  Remove
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        ))}

        <Link href="/routine/item" asChild>
          <Pressable style={[styles.addButton, { borderColor: theme.primary }]}>
            <ThemedText style={{ color: theme.primary }} type="smallBold">
              + Add {items.length === 0 ? 'your first item' : 'another item'}
            </ThemedText>
          </Pressable>
        </Link>

        {footer}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  empty: { padding: Spacing.four, borderRadius: Spacing.three, gap: Spacing.one },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  cardHeader: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  cardTitle: { flex: 1, gap: Spacing.half },
  cardActions: { flexDirection: 'row', gap: Spacing.four },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
