import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';

/**
 * Tab titles and icons are declared **here**, not inside each screen.
 *
 * They used to be set by an inline `<Tabs.Screen options={{...}} />` in each screen's own
 * return, which only runs once that screen has mounted. Until you visited a tab its
 * `tabBarIcon` was undefined, and React Navigation falls back to its `MissingIcon` — which
 * renders `⏷`, a character most Android system fonts have no glyph for, so Android drew
 * tofu. That box was the navigator's placeholder, not our icon failing to load: tapping a tab
 * mounted its screen, applied the options, and the real icon appeared.
 *
 * Declaring them at the navigator means every tab has its icon before any screen renders.
 */
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: { ios: 'house.fill', android: 'home', web: 'home' } },
  { name: 'routine', title: 'Routine', icon: { ios: 'checklist', android: 'checklist', web: 'checklist' } },
  { name: 'photos', title: 'Photos', icon: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } },
  { name: 'learn', title: 'Learn', icon: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' } },
];

export default function TabsLayout() {
  const theme = useTheme();

  // The top inset is handled here, once, rather than in each tab screen: these tabs run with
  // `headerShown: false`, so without it content renders under the status bar / notch and the
  // topmost row ends up unreachable. Bottom is left to the tab bar, which insets itself.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: { backgroundColor: theme.backgroundElement },
        }}>
        {TABS.map(({ name, title, icon }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarIcon: ({ color }) => <Icon name={icon} size={22} color={color} />,
            }}
          />
        ))}
      </Tabs>
    </SafeAreaView>
  );
}
