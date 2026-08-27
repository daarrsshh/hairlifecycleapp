import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Session storage backed by the OS keystore rather than AsyncStorage.
 *
 * A Supabase session is a bearer token: anything holding it can act as that user. On a rooted
 * or compromised device, AsyncStorage is a readable file — SecureStore is Keystore on Android
 * and Keychain on iOS. This app's data is medication history and photos of someone's scalp, so
 * the stricter default is the right one.
 *
 * SecureStore rejects keys with characters outside [A-Za-z0-9._-], and supabase-js composes key
 * names from the project URL, so they're sanitized here rather than failing at runtime.
 */
const secureStorage: SupportedStorage = {
  getItem: (key) => SecureStore.getItemAsync(safeKey(key)),
  setItem: (key, value) => SecureStore.setItemAsync(safeKey(key), value),
  removeItem: (key) => SecureStore.deleteItemAsync(safeKey(key)),
};

function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

/**
 * `null` when the project isn't configured, rather than throwing at import time.
 *
 * The app is local-first and fully usable with no backend at all; a missing or misconfigured
 * Supabase project must degrade to "no account yet", never to a crash on launch. Every caller
 * checks for null the same way `getNotificationsModule()` is checked.
 */
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: secureStorage,
          autoRefreshToken: true,
          persistSession: true,
          // No deep-link callback to parse: anonymous sign-in and email upgrades both happen
          // in-process, and this would otherwise inspect the launch URL on every start.
          detectSessionInUrl: false,
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
