import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

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
          const periods = await getAllRoutines();
          if (periods[0]) {
            await reconcileMissedDoses(periods[0].startDate);
          }
        }
      } catch (e) {
        // Reconciliation failing shouldn't leave the user stuck on the splash screen forever.
        console.warn('[index] reconciliation failed', e);
      } finally {
        await SplashScreen.hideAsync();
      }
    })();
  }, [isLoading, profile]);

  if (isLoading) return null;

  return profile ? <Redirect href="/(tabs)" /> : <Redirect href="/(onboarding)/welcome" />;
}
