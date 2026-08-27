import { createJSONStorage, type StateStorage } from 'zustand/middleware';

type AsyncStorageModule = typeof import('@react-native-async-storage/async-storage').default;

let cached: AsyncStorageModule | null | undefined;

/**
 * AsyncStorage, loaded lazily and degrading to memory.
 *
 * Same rule as `expo-notifications` and `expo-secure-store`: a native module reached from a
 * startup path is `require()`d inside a function, never imported at module scope. The draft
 * stores are imported by the onboarding screens, so a missing native module here — a dev client
 * built before this package was added, Expo Go, web's SSR pass — would take down the bundle
 * before any screen renders. That has already happened once with SecureStore.
 *
 * Memory fallback means the worst case is the old behaviour (drafts lost on restart), not a
 * broken app.
 */
function getAsyncStorage(): AsyncStorageModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('@react-native-async-storage/async-storage').default as AsyncStorageModule;
  } catch {
    console.warn('[drafts] AsyncStorage unavailable — in-progress work will not survive a restart');
    cached = null;
  }
  return cached;
}

const memory = new Map<string, string>();

const backing: StateStorage = {
  async getItem(name) {
    const store = getAsyncStorage();
    if (!store) return memory.get(name) ?? null;
    try {
      return await store.getItem(name);
    } catch {
      return null;
    }
  },
  async setItem(name, value) {
    const store = getAsyncStorage();
    if (!store) {
      memory.set(name, value);
      return;
    }
    try {
      await store.setItem(name, value);
    } catch {
      /* a dropped draft write isn't worth surfacing mid-typing */
    }
  },
  async removeItem(name) {
    const store = getAsyncStorage();
    if (!store) {
      memory.delete(name);
      return;
    }
    try {
      await store.removeItem(name);
    } catch {
      /* nothing to clean up */
    }
  },
};

/**
 * For **in-progress drafts only** — never for anything sensitive.
 *
 * AsyncStorage is a plain readable file. Onboarding answers and a routine being built are
 * low-stakes and short-lived; auth sessions go to the OS keystore (`lib/secure-storage.ts`) and
 * real user data goes to SQLite.
 */
export const draftStorage = createJSONStorage(() => backing);
