import { QueryClientProvider } from '@tanstack/react-query';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
    /* Required ancestor for every GestureDetector — without it the photo comparison slider
       throws on render. expo-router ships its own GestureHandlerRootView, but it's a plain View
       stub used by its stack views, so it never satisfies this. The `flex: 1` is load-bearing:
       unstyled, this view collapses to zero height and the whole app renders blank. */
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <DoseNotificationResponder />
          {/* Deliberately no per-route <Stack.Screen> children here — declaring ~10 of them with
              custom options previously hung native-stack screen registration on-device (Android,
              Expo Go SDK 57). Screens that want a header/title set it themselves via an inline
              <Stack.Screen options={{...}} /> (see learn/[articleId].tsx for the pattern). */}
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
