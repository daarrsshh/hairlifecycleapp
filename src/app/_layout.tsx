import { QueryClientProvider } from '@tanstack/react-query';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { DoseNotificationResponder } from '@/features/dose-log/notification-responder';
import { queryClient } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    throw error;
  }

  if (!success) {
    // Splash stays up until the local database is ready.
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <DoseNotificationResponder />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="consistency" options={{ headerShown: true, title: 'Consistency' }} />
          <Stack.Screen name="timeline" options={{ headerShown: true, title: 'Timeline' }} />
          <Stack.Screen name="treatment/start-new" options={{ headerShown: true, title: 'Start new treatment' }} />
          <Stack.Screen
            name="treatment/start-new-custom"
            options={{ headerShown: true, title: 'Add my own' }}
          />
          <Stack.Screen name="treatment/confirm" options={{ headerShown: true, title: 'Confirm' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
