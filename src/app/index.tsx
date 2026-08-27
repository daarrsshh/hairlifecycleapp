import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ensureAnonymousSession } from '@/features/auth/api';
import { reconcileMissedDoses } from '@/features/dose-log/api';
import { getProfile } from '@/features/onboarding/api';
import { getAllRoutines } from '@/features/routine/api';

export default function Index() {
  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  useEffect(() => {
    if (isLoading) return;

    (async () => {
      try {
        if (profile) {
          const routines = await getAllRoutines();
          if (routines[0]) {
            await reconcileMissedDoses(routines[0].startDate);
          }
        }
      } catch (e) {
        // Startup cleanup failing shouldn't leave the user stuck on the splash screen forever.
        console.warn('[index] startup reconciliation failed', e);
      } finally {
        await SplashScreen.hideAsync();
      }
    })();
  }, [isLoading, profile]);

  /*
   * Deliberately its own effect, deliberately not awaited, and deliberately not in the splash
   * path above. Anonymous sign-in needs a network round trip; this app has always worked with
   * no connection, so a slow or unreachable Supabase must not delay the splash by even a frame,
   * and a failure must not surface to someone who never asked for an account. It resolves to
   * `offline` and the next launch retries.
   */
  useEffect(() => {
    ensureAnonymousSession()
      .then((status) => console.log('[auth]', status.state))
      .catch(() => {});
  }, []);

  if (isLoading) return null;

  return profile ? <Redirect href="/(tabs)" /> : <Redirect href="/(onboarding)/welcome" />;
}
