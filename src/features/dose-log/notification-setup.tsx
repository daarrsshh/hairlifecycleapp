import { useEffect } from 'react';

import { getNotificationsModule } from '@/lib/notifications-safe';

/**
 * Configures how notifications present while the app is running. Mount once, near the app root.
 *
 * This is all that's left of what used to be `DoseNotificationResponder`. Reminders no longer
 * carry Yes/No/Skip buttons — tapping one just opens the app, and the user logs each dose on
 * Home. That removed the action category, the response listener, the launch replay for taps that
 * arrived while the process was dead, and the batched-answer compromise where a single "Yes"
 * applied to *every* item due at that time and couldn't express "took one, skipped the other".
 *
 * The handler itself has to stay: without it, a reminder that fires while the app is open is
 * swallowed silently rather than shown.
 */
export function NotificationSetup() {
  useEffect(() => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return; // e.g. Android + Expo Go — see notifications-safe.ts

    // Set here, not at module scope, so it never runs during SSR's plain-Node module pass.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }, []);

  return null;
}
