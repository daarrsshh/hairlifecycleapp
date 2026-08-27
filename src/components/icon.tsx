import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform, type ColorValue, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

export type IconName = SymbolViewProps['name'];

/**
 * The app's only icon component.
 *
 * **Why not `SymbolView` everywhere:** on Android it has no native symbol set, so it renders a
 * `<Text>` with a Material Symbols codepoint and loads that font itself — each instance in its
 * own `useEffect`, with its own `loaded` flag. Five tab icons mounting together race on the same
 * family, and any that flip `loaded` before it's actually registered draw the missing-glyph box.
 * That is what produced tab icons showing as ▯. Preloading the font up front did not fix it, and
 * the font is not the problem: the file contains every codepoint we use — verified by parsing
 * its cmap. The failure is in how `expo-symbols` applies it.
 *
 * So Android uses `@expo/vector-icons`, which ships its own font and registers it once at module
 * load rather than per component. iOS keeps `SymbolView`, where SF Symbols are native and right.
 *
 * Call sites keep passing the same `{ ios, android, web }` object they already used.
 */
export function Icon({
  name,
  size = 24,
  color,
  style,
  // React Navigation hands tab icons a ColorValue, and decorative icons need to be hidden from
  // screen readers — both pass straight through rather than being re-declared per call site.
  accessibilityElementsHidden,
  importantForAccessibility,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  /* Both, because SymbolView renders a View and MaterialIcons renders Text. */
  style?: StyleProp<ViewStyle & TextStyle>;
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}) {
  const a11y = { accessibilityElementsHidden, importantForAccessibility };

  if (Platform.OS === 'ios') {
    return <SymbolView name={name} size={size} tintColor={color} style={style as StyleProp<ViewStyle>} {...a11y} />;
  }

  // Material *Symbols* names use underscores; Material *Icons* uses hyphens for the same glyph.
  const androidName = typeof name === 'object' ? name.android : undefined;
  const glyph = (androidName ?? 'help-outline').replace(/_/g, '-');

  return (
    <MaterialIcons
      name={glyph as React.ComponentProps<typeof MaterialIcons>['name']}
      size={size}
      color={color}
      style={style as StyleProp<TextStyle>}
      {...a11y}
    />
  );
}
