import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { logDose, recordDoseNoResponse } from '@/features/dose-log/api';
import { computeRepromptTime } from '@/features/dose-log/doseState';
import { today } from '@/lib/date';
import { getNotificationsModule } from '@/lib/notifications-safe';
import { scheduleReprompt } from '@/lib/notifications';

/** Wires the Yes/No/Skip notification action buttons to dose logging. Mount once, near the app root. */
export function DoseNotificationResponder() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return; // e.g. Android + Expo Go — see notifications-safe.ts

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
      // A reminder is batched: one notification can cover several items due at the same time,
      // so one Yes/Skip answers for all of them.
      const { itemIds, time } = response.notification.request.content.data as {
        itemIds?: string[];
        time?: string;
      };
      if (!itemIds?.length || !time) return;

      const date = today();

      switch (response.actionIdentifier) {
        case 'yes':
          await Promise.all(itemIds.map((id) => logDose(id, date, time, 'taken')));
          break;
        case 'skip':
          await Promise.all(itemIds.map((id) => logDose(id, date, time, 'skipped')));
          break;
        case 'no': {
          await Promise.all(itemIds.map((id) => recordDoseNoResponse(id, date, time)));
          const reprompt = computeRepromptTime(new Date());
          if (reprompt) await scheduleReprompt(itemIds, time, reprompt);
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
