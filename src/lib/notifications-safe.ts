import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

/**
 * `expo-notifications` throws at *import time* on Android inside Expo Go — a side effect of its
 * own push-token auto-registration module, unrelated to whether we actually use push tokens (we
 * only use local scheduled notifications). A static top-level `import` would crash the whole app
 * bundle before any of our code runs. Loading it lazily via `require()`, guarded by
 * `isRunningInExpoGo()`, means Expo Go on Android can still run everything else; every export in
 * `notifications.ts` becomes a safe no-op there instead.
 */
export function getNotificationsModule(): NotificationsModule | null {
  if (cached !== undefined) return cached;

  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}
