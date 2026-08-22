import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { reconcileMissedDoses } from '@/features/dose-log/api';
import { getProfile } from '@/features/onboarding/api';
import { getAllTreatmentPeriods } from '@/features/treatment/api';

export default function Index() {
  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  useEffect(() => {
    if (isLoading) return;

    (async () => {
      if (profile) {
        const periods = await getAllTreatmentPeriods();
        if (periods[0]) {
          await reconcileMissedDoses(periods[0].startDate);
        }
      }
      await SplashScreen.hideAsync();
    })();
  }, [isLoading, profile]);

  if (isLoading) return null;

  return profile ? <Redirect href="/(tabs)" /> : <Redirect href="/(onboarding)/welcome" />;
}
