import { Icon } from '@/components/icon';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { ItemConsistencyRow } from '@/features/consistency/hooks';
import { ITEM_TYPE_ICON } from '@/features/routine/components/routine-builder';
import { useTheme } from '@/hooks/use-theme';

/**
 * Per-item consistency for the week so far.
 *
 * A bar rather than bare text: comparing "4 of 6" against "2 of 2" means doing arithmetic,
 * whereas bar lengths are comparable at a glance — which is the whole point of the section
 * (spotting the one item you're slipping on). The count stays alongside it because the PRD
 * asks for counts over percentages, so nothing here reads as a grade.
 */
export function ItemConsistencyList({ items }: { items: ItemConsistencyRow[] }) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">This week</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        Doses taken, item by item
      </ThemedText>

      {items.map((item) => {
        // Nothing due yet is a neutral state, not a zero score — an item scheduled for Friday
        // shouldn't look failed on Tuesday.
        const pending = item.total === 0;
        const fraction = pending ? 0 : item.taken / item.total;

        return (
          <View key={item.itemId} style={styles.row}>
            <View style={styles.labelRow}>
              <Icon
                name={ITEM_TYPE_ICON[item.type]}
                size={16}
                color={pending ? theme.textSecondary : theme.primary}
              />
              <ThemedText type="small" style={styles.name} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText
                type="smallBold"
                themeColor={pending ? 'textSecondary' : 'text'}>
                {pending ? 'None due yet' : `${item.taken} of ${item.total}`}
              </ThemedText>
            </View>

            <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              {fraction > 0 ? (
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.round(fraction * 100)}%`, backgroundColor: theme.taken },
                  ]}
                />
              ) : null}
            </View>
          </View>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { gap: Spacing.one },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { flex: 1 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
