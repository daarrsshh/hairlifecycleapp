import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { logDose, recordDoseNoResponse } from '@/features/dose-log/api';
import { computeRepromptTime, type DoseSlot } from '@/features/dose-log/doseState';
import { getActiveTreatmentPeriod } from '@/features/treatment/api';
import { today } from '@/lib/date';
import { scheduleReprompt } from '@/lib/notifications';

/** Wires the Yes/No/Skip notification action buttons to dose logging. Mount once, near the app root. */
export function DoseNotificationResponder() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Configured here (not at module scope) so it never runs during SSR's plain-Node module pass.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const slot = response.notification.request.content.data?.slot as DoseSlot | undefined;
      if (!slot) return;

      const period = await getActiveTreatmentPeriod();
      if (!period) return;
      const date = today();

      switch (response.actionIdentifier) {
        case 'yes':
          await logDose(period.id, date, slot, 'taken');
          break;
        case 'skip':
          await logDose(period.id, date, slot, 'skipped');
          break;
        case 'no': {
          await recordDoseNoResponse(period.id, date, slot);
          const reprompt = computeRepromptTime(new Date());
          if (reprompt) await scheduleReprompt(slot, reprompt);
          break;
        }
        default:
          return; // notification body tap (not an action button) — just opens the app
      }

      queryClient.invalidateQueries({ queryKey: ['doses'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
      queryClient.invalidateQueries({ queryKey: ['consistency'] });
    });

    return () => subscription.remove();
  }, [queryClient]);

  return null;
}
