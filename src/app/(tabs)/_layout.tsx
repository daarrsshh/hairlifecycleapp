import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();

  // Deliberately no <Tabs.Screen> children here — same reason the root Stack has none: on this
  // Expo Go build, declaring several route-registration children up front hangs native mounting.
  // Each tab screen sets its own icon/title via an inline <Tabs.Screen options={{...}} />.
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.backgroundElement },
      }}
    />
  );
}
