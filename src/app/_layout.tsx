import { QueryClientProvider } from '@tanstack/react-query';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { NotificationSetup } from '@/features/dose-log/notification-setup';
import { queryClient } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync();

/**
 * expo-router renders a route's `ErrorBoundary` export in place of the crashed tree. Exported
 * from the root layout, it covers everything below — see app-error-boundary for what it does
 * and doesn't catch.
 */
export { AppErrorBoundary as ErrorBoundary };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useMigrations(db, migrations);

  const [bootStalled, setBootStalled] = useState(false);

  useEffect(() => {
    if (error) console.warn('[migrations] failed', error);
    else if (success) console.log('[migrations] applied — rendering app');
    else console.log('[migrations] running…');
  }, [success, error]);

  /*
   * The splash is only hidden from index.tsx, which never mounts while this layout is showing a
   * fallback — so a fallback would render *behind* the splash and still look like a blank
   * screen. Hide it on error at once, and after a grace period if migrations simply never
   * settle. Migrations normally finish in well under this, so a healthy launch never sees it.
   */
  useEffect(() => {
    if (success) return;
    if (error) {
      SplashScreen.hideAsync().catch(() => {});
      return;
    }
    const timer = setTimeout(() => {
      setBootStalled(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, [success, error]);

  /*
   * Never `throw` here and never render nothing. A release build has no error overlay, so a
   * thrown migration error is a blank screen with no recourse; and `null` leaves the splash up
   * indefinitely, which since the splash went near-white is the *same* blank screen. Two
   * unrelated failures became one symptom that carried no information. Both now say what
   * happened, on screen, where a user (or a phone with no debugger attached) can read it.
   */
  if (error) {
    return (
      <SafeAreaView style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Couldn&apos;t open your data</Text>
        <Text style={styles.fallbackBody}>
          The local database didn&apos;t finish setting up, so the app can&apos;t start. Nothing
          has been lost — reopening usually clears it.
        </Text>
        <Text style={styles.fallbackDetail}>{error.message}</Text>
      </SafeAreaView>
    );
  }

  if (!success) {
    // Until the grace period elapses the splash is still up, so render nothing behind it. Once
    // it's clear the boot has stalled, say so instead of leaving a blank screen.
    if (!bootStalled) return null;
    return (
      <SafeAreaView style={styles.fallback}>
        <ActivityIndicator />
        <Text style={styles.fallbackTitle}>Still setting up</Text>
        <Text style={styles.fallbackBody}>
          The local database is taking longer than expected to open. Force-quitting and
          reopening the app usually clears it.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    /* Required ancestor for every GestureDetector — without it the photo comparison slider
       throws on render. expo-router ships its own GestureHandlerRootView, but it's a plain View
       stub used by its stack views, so it never satisfies this. The `flex: 1` is load-bearing:
       unstyled, this view collapses to zero height and the whole app renders blank. */
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <NotificationSetup />
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
  /* Fixed colors, not theme tokens: this renders before providers exist, and it has to be
     legible whatever the device theme is. */
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: '#FBFAF8',
  },
  fallbackTitle: { fontSize: 20, fontWeight: '600', color: '#1B1A17', textAlign: 'center' },
  fallbackBody: { fontSize: 15, lineHeight: 22, color: '#6A645C', textAlign: 'center' },
  fallbackDetail: { fontSize: 12, color: '#706B63', textAlign: 'center' },
});
