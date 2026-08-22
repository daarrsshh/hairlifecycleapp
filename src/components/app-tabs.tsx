import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useTheme } from '@/hooks/use-theme';

const TAB_ICONS: Record<string, SymbolViewProps['name']> = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  routine: { ios: 'checklist', android: 'checklist', web: 'checklist' },
  photos: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  learn: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' },
  me: { ios: 'person.fill', android: 'person', web: 'person' },
};

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <ThemedView type="backgroundElement" style={styles.tabList}>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="home">Home</TabButton>
          </TabTrigger>
          <TabTrigger name="routine" href="/routine" asChild>
            <TabButton icon="routine">Routine</TabButton>
          </TabTrigger>
          <TabTrigger name="photos" href="/photos" asChild>
            <TabButton icon="photos">Photos</TabButton>
          </TabTrigger>
          <TabTrigger name="learn" href="/learn" asChild>
            <TabButton icon="learn">Learn</TabButton>
          </TabTrigger>
          <TabTrigger name="me" href="/me" asChild>
            <TabButton icon="me">Me</TabButton>
          </TabTrigger>
        </ThemedView>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
  icon,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: keyof typeof TAB_ICONS }) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      style={(state) => [
        styles.tabButton,
        typeof props.style === 'function' ? props.style(state) : props.style,
      ]}>
      <SymbolView
        name={TAB_ICONS[icon]}
        size={22}
        tintColor={isFocused ? theme.primary : theme.textSecondary}
      />
      <ThemedText type="small" themeColor={isFocused ? 'primary' : 'textSecondary'}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabList: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
});
