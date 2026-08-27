import { Icon, type IconName } from '@/components/icon';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { LinkButton } from '@/components/link-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The app's grouped-list primitive: a bounded card of rows separated by hairlines.
 *
 * It exists because loose stacked text links read as leftover debug affordances rather than
 * navigation — the row, its divider, and the chevron are what make a destination look like a
 * destination. Used by Routine and Learn; keep them consistent by using this rather than
 * hand-rolling rows.
 */
export function ListGroup({ children }: { children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.group}>
      {children}
    </ThemedView>
  );
}

export function ListDivider({ inset = true }: { inset?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.divider, { backgroundColor: theme.border }, inset && styles.dividerInset]} />
  );
}

export function ListRow({
  href,
  title,
  subtitle,
  icon,
  onPress,
}: {
  /* Derived from LinkButton rather than typed as `string`: expo-router's typed routes only
     accept known route literals, so a widened string fails to compile. */
  href: React.ComponentProps<typeof LinkButton>['href'];
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <LinkButton href={href} onPress={onPress} style={styles.row}>
      {icon ? <Icon name={icon} size={20} color={theme.primary} /> : null}
      <View style={styles.rowText}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText themeColor="textSecondary" type="caption" numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <Icon
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={16}
        color={theme.textSecondary}
      />
    </LinkButton>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: Spacing.three, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowText: { flex: 1, gap: Spacing.half },
  divider: { height: StyleSheet.hairlineWidth },
  dividerInset: { marginLeft: Spacing.three },
});
