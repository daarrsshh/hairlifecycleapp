import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { NotificationResponse } from 'expo-notifications';
import { useEffect } from 'react';

import { logDose, recordDoseNoResponse } from '@/features/dose-log/api';
import { computeRepromptTime } from '@/features/dose-log/doseState';
import { today } from '@/lib/date';
import { getNotificationsModule } from '@/lib/notifications-safe';
import { scheduleReprompt } from '@/lib/notifications';

/**
 * Applies one Yes/No/Skip answer.
 *
 * Safe to run twice for the same response: `logDose` upserts on (item, date, time), so the
 * launch replay below can't double-log or contradict what the live listener already wrote.
 */
async function applyResponse(response: NotificationResponse, queryClient: QueryClient) {
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
}

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

    let cancelled = false;

    /*
     * The listener below only fires while this JS context is alive. A button tapped after
     * Android has killed the process — which is most taps, since the whole point is answering
     * without opening the app — would otherwise be dropped silently: the notification
     * disappears and nothing is ever logged. That response is held and delivered once at next
     * launch, so it's replayed here.
     */
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!cancelled && response) return applyResponse(response, queryClient);
      })
      .catch((e) => console.warn('[notifications] failed to replay last response', e));

    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      applyResponse(response, queryClient)
    );

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [queryClient]);

  return null;
}
