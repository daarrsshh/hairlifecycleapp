import { createClient } from '@supabase/supabase-js';

import { sessionStorage } from '@/lib/secure-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
          storage: sessionStorage,
          autoRefreshToken: true,
          persistSession: true,
          // No deep-link callback to parse: anonymous sign-in and email upgrades both happen
          // in-process, and this would otherwise inspect the launch URL on every start.
          detectSessionInUrl: false,
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
