import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();

  // No <Tabs.Screen> children here — each tab screen declares its own title/icon via an inline
  // <Tabs.Screen options={{...}} />, mirroring how the root Stack works. (Unlike the root Stack,
  // there's no known on-device bug forcing this here; it's just kept consistent with it.)
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
