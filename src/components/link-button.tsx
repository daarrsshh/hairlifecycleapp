import { Link, type Href } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A tappable link. **Always use this instead of `<Link asChild><Pressable/></Link>`.**
 *
 * `Link asChild` clones its child through expo-router's `Slot`, which throws a
 * render-crashing error on-device if the child's `style` is an array rather than a flat
 * object. That footgun has broken this app three separate times (tab bar, Photos/Learn, the
 * routine builder) because the array form is the natural thing to write. Flattening here means
 * no call site can get it wrong — pass whatever `StyleProp` you like.
 */
export function LinkButton({
  href,
  style,
  children,
  onPress,
}: {
  href: Href;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={StyleSheet.flatten(style)} onPress={onPress}>
        {children}
      </Pressable>
    </Link>
  );
}
