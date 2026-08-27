import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * The resolved palette for the device's current appearance.
 *
 * Anything other than an explicit `'dark'` falls back to light — including **`null`**, which is
 * what React Native returns when the OS reports no preference. The previous guard checked for
 * `'unspecified'`, a value `useColorScheme` never returns, so a null would have indexed `Colors`
 * with it and handed every caller `undefined`. Since screens read `theme.primary` straight off
 * the result, that's a crash on the first component to render.
 */
export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
