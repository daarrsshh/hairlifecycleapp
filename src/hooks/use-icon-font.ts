import { MaterialSymbols_400Regular } from '@expo-google-fonts/material-symbols/400Regular';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';

/** The family name `expo-symbols` uses internally on Android — must match exactly. */
const MATERIAL_SYMBOLS = 'MaterialSymbols_400Regular';

/**
 * Loads the Material Symbols font once, before anything renders an icon.
 *
 * On Android, `SymbolView` renders `<Text style={{fontFamily}}>` with a glyph codepoint, and
 * each instance calls `loadAsync` in its own `useEffect` with its own `loaded` flag. Five tab
 * icons mounting at once all race to load the same family; an instance that flips `loaded`
 * before the family is actually registered renders against an unresolvable font, which Android
 * draws as the missing-glyph box — the tab icons appeared as ▯ until tapped, because tapping
 * re-rendered them once the font was genuinely ready.
 *
 * Loading it up front means every `SymbolView`'s own `loadAsync` resolves from cache
 * immediately, so that window never exists. iOS uses real SF Symbols and needs none of this.
 */
export function useIconFont(): boolean {
  const [loaded, error] = useFonts(
    Platform.OS === 'android' ? { [MATERIAL_SYMBOLS]: MaterialSymbols_400Regular } : {}
  );

  if (error) console.warn('[icons] Material Symbols failed to load', error);

  // `true` on failure as well as success: callers use this to decide when it's safe to render,
  // and a font that will never arrive must not hold the app on a blank screen forever. Missing
  // icons are a blemish; an app that won't start is not.
  return loaded || error !== null;
}
