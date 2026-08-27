import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

/**
 * Runs an async handler with the pending flag, error reporting and double-tap guard handled once.
 *
 * This exists because the same bug was written six times: `try { … } finally { setPending(false) }`
 * with no `catch`. When something throws, the button un-disables and *nothing else happens* — no
 * message, no state change, no clue. From the user's side that is indistinguishable from a dead
 * button, which is exactly how the PDF export failure was reported, and the real error turned out
 * to be immediately diagnosable the moment it was visible.
 *
 * Same treatment `LinkButton` and `TimePickerField` got: make the correct thing easier to write
 * than the broken thing, rather than relying on remembering.
 *
 * `title` should say what didn't happen, in the user's terms — "Couldn't save your routine", not
 * "Error". The thrown message is appended when there is one, because a specific failure the user
 * can screenshot is worth far more to you than a polished generic apology.
 */
export function useAsyncAction(title: string) {
  const [pending, setPending] = useState(false);
  // Ref as well as state: two taps in the same frame both see `pending === false`, so the state
  // check alone doesn't prevent a double submit.
  const running = useRef(false);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      if (running.current) return;
      running.current = true;
      setPending(true);
      try {
        await fn();
      } catch (e) {
        console.warn(`[${title}]`, e);
        Alert.alert(title, e instanceof Error && e.message ? e.message : 'Something went wrong.');
      } finally {
        running.current = false;
        setPending(false);
      }
    },
    [title]
  );

  return { run, pending };
}
