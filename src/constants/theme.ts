/**
 * Design tokens. Screens read these through `useTheme()` — never hardcode a color in
 * `StyleSheet.create`, or it won't adapt to dark mode.
 *
 * **The palette.** Deep teal on warm paper neutrals, with moss green for a taken dose. Three
 * things drove it, all from the product rather than taste:
 *
 * - The neutrals are *warm* (a red/yellow bias) rather than the cold blue-greys they replace.
 *   This is a bathroom-shelf app opened for thirty seconds a day by someone who is quietly
 *   anxious about their appearance; warm paper reads as a journal, cold grey reads as a form.
 * - `primary` is teal, deliberately far from `taken`'s green in hue (~190° vs ~100°). Those two
 *   sit side by side constantly — an unfilled dose circle is `primary`, a filled one is `taken`
 *   — so a palette where they were neighbours would make the app's core interaction ambiguous.
 * - `missed` stays grey and is used for **both** Skipped and Missed. Never make it red. Someone
 *   already unhappy about their hair will delete an app that scolds them; the PRD renders the two
 *   states identically and keeps the distinction in data only.
 *
 * Every value clears WCAG AA (4.5:1) against the ground it sits on, in both themes — including
 * `missed`, which is muted but still has to be readable as "Not taken".
 */

import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B1A17',
    background: '#FBFAF8',
    backgroundElement: '#F1EEE9',
    backgroundSelected: '#E5E0D8',
    textSecondary: '#6A645C',
    primary: '#1F6F7A',
    onPrimary: '#FFFFFF',
    taken: '#447835',
    missed: '#706B63',
    border: '#E3DED6',
  },
  dark: {
    text: '#F2EFEA',
    background: '#171512',
    backgroundElement: '#221F1B',
    backgroundSelected: '#2E2A25',
    textSecondary: '#A69F96',
    primary: '#5FBECB',
    onPrimary: '#10262A',
    taken: '#7FC45F',
    missed: '#8E867D',
    border: '#302C27',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
