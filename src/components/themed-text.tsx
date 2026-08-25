import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextType =
  | 'default'
  | 'title'
  | 'small'
  | 'smallBold'
  | 'caption'
  | 'heading'
  | 'subtitle'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

/** `linkPrimary` is the accent by definition, so it defaults to `primary` instead of `text`. */
const DEFAULT_COLOR: Partial<Record<ThemedTextType, ThemeColor>> = {
  linkPrimary: 'primary',
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? DEFAULT_COLOR[type] ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'caption' && styles.caption,
        type === 'heading' && styles.heading,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

/**
 * One scale, six steps: 12 · 14 · 16 · 20 · 30 · 40.
 *
 * `heading` (20) is the step that was missing. Without it everything from a screen heading down
 * to a dose time collapsed onto 14/16, so every card carried identical typographic weight and
 * the screens read flat no matter how they were spaced. It's the size for anything that titles
 * a block — an item card on Home, a section header — sitting clearly under `subtitle` and
 * clearly over body text.
 *
 * Display sizes are set tight (~1.1) and text sizes loose (~1.4). `subtitle` previously ran
 * 32/44, a 1.38 ratio that left a visible gap under every screen heading.
 */
const styles = StyleSheet.create({
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 400,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 600,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: 700,
    letterSpacing: -0.5,
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  linkPrimary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
