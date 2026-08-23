import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();

  // No <Tabs.Screen> children here — each tab screen declares its own title/icon via an inline
  // <Tabs.Screen options={{...}} />, mirroring how the root Stack works. (Unlike the root Stack,
  // there's no known on-device bug forcing this here; it's just kept consistent with it.)
  //
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
        }}
      />
    </SafeAreaView>
  );
}
