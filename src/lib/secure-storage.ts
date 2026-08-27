import type { SupportedStorage } from '@supabase/supabase-js';

type SecureStoreModule = typeof import('expo-secure-store');

let cached: SecureStoreModule | null | undefined;

/**
 * `expo-secure-store` loaded lazily, `null` when its native module isn't in the build.
 *
 * A static import throws at *module evaluation* — "Cannot find native module 'ExpoSecureStore'"
 * — which takes down the entire bundle before any of the auth layer's own guards can run. That
 * happens whenever the JS is newer than the native build: a dev client compiled before this
 * package was added, Expo Go, or web's SSR pass. Same failure mode and same fix as
 * `notifications-safe.ts`.
 */
function getSecureStore(): SecureStoreModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-secure-store') as SecureStoreModule;
  } catch {
    console.warn('[auth] SecureStore unavailable — sessions will not persist across restarts');
    cached = null;
  }
  return cached;
}

/** SecureStore rejects keys outside this set, and supabase-js derives key names from the URL. */
function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

/**
 * Falls back to memory when the keystore is missing, so the app still runs — sign-in just
 * doesn't survive a restart. That's the right trade: an unavailable keystore is a degraded
 * session, never a broken app. It is *not* a fallback to AsyncStorage: a Supabase session is a
 * bearer token, and writing one to a plain readable file to avoid re-authenticating would trade
 * a real security property for a small convenience.
 */
const memory = new Map<string, string>();

export const sessionStorage: SupportedStorage = {
  async getItem(key) {
    const store = getSecureStore();
    if (!store) return memory.get(safeKey(key)) ?? null;
    try {
      return await store.getItemAsync(safeKey(key));
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    const store = getSecureStore();
    if (!store) {
      memory.set(safeKey(key), value);
      return;
    }
    try {
      await store.setItemAsync(safeKey(key), value);
    } catch (e) {
      console.warn('[auth] failed to persist session', e);
    }
  },
  async removeItem(key) {
    const store = getSecureStore();
    if (!store) {
      memory.delete(safeKey(key));
      return;
    }
    try {
      await store.deleteItemAsync(safeKey(key));
    } catch {
      /* nothing to clean up */
    }
  },
};

export const isSecureStorageAvailable = () => getSecureStore() !== null;
