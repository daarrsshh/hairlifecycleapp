import { supabase } from '@/lib/supabase';

export type AuthStatus =
  /** No backend configured — the app runs exactly as it always has. */
  | { state: 'unconfigured' }
  /** Signed in anonymously; `userId` is stable and survives an email upgrade later. */
  | { state: 'anonymous'; userId: string }
  /** Anonymous account upgraded with an email — same `userId`. */
  | { state: 'identified'; userId: string; email: string }
  /** Couldn't reach Supabase. Not an error state for the user: the app is fully usable. */
  | { state: 'offline' };

function describeUser(user: { id: string; email?: string | null; is_anonymous?: boolean }): AuthStatus {
  if (user.email) return { state: 'identified', userId: user.id, email: user.email };
  return { state: 'anonymous', userId: user.id };
}

/**
 * Returns the current session, signing in anonymously if there isn't one.
 *
 * **Never throws and never blocks the UI.** Anonymous sign-in needs a network round trip, and
 * this app has always worked with no connection at all — someone logging a dose on a plane must
 * not be stopped by an account they didn't ask for and can't see. A failure here resolves to
 * `offline`, and the next launch tries again.
 *
 * The identity is deliberately created now rather than when it's first needed. Adding accounts
 * to an app that already has users means forcing everyone through a signup wall on update;
 * issuing an anonymous id from the first launch means the later email upgrade keeps the same
 * `userId`, so nothing has to be migrated or reconciled.
 */
export async function ensureAnonymousSession(): Promise<AuthStatus> {
  if (!supabase) return { state: 'unconfigured' };

  try {
    const { data: existing } = await supabase.auth.getSession();
    if (existing.session?.user) return describeUser(existing.session.user);

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      console.warn('[auth] anonymous sign-in unavailable', error?.message);
      return { state: 'offline' };
    }
    return describeUser(data.user);
  } catch (e) {
    console.warn('[auth] session lookup failed', e);
    return { state: 'offline' };
  }
}

/** The cached session only — no network, so it's safe to call during render paths. */
export async function getAuthStatus(): Promise<AuthStatus> {
  if (!supabase) return { state: 'unconfigured' };
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user ? describeUser(data.session.user) : { state: 'offline' };
  } catch {
    return { state: 'offline' };
  }
}

/**
 * Attaches an email to the existing anonymous account, keeping the same `userId`.
 *
 * This is the whole reason for signing in anonymously up front: the account is *upgraded* in
 * place, so anything already tied to that id stays tied to it. Unused until there's something
 * worth an account (sync, AI analysis) — it exists now so that arriving feature doesn't have to
 * reconcile two identities.
 */
export async function linkEmail(email: string, password: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Accounts are not available in this build.' };
  const { error } = await supabase.auth.updateUser({ email, password });
  return { error: error?.message ?? null };
}
