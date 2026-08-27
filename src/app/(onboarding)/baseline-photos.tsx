import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { createProfile, getProfile } from '@/features/onboarding/api';
import { useOnboardingDraft } from '@/features/onboarding/draft-store';
import { ensureAppSettings } from '@/features/onboarding/settings-api';
import { savePhoto, recordPhotoSetCompleted, type PhotoAngle } from '@/features/photos/api';
import { AngleCaptureFlow, CAPTURE_ANGLES, type CapturedPhotos } from '@/features/photos/components/angle-capture-flow';
import { getActiveRoutine, getAllRoutineItems, startRoutine } from '@/features/routine/api';
import { useRoutineDraft } from '@/features/routine/draft-store';
import { useAsyncAction } from '@/hooks/use-async-action';
import { rescheduleRoutineReminders, requestNotificationPermissions } from '@/lib/notifications';

export default function BaselinePhotosScreen() {
  const draft = useOnboardingDraft();
  const routineDraft = useRoutineDraft();
  const queryClient = useQueryClient();
  const { run, pending: finishing } = useAsyncAction("Couldn't finish setting up");

  /**
   * Creates everything the app needs to exist, and is **safe to run again after a failure.**
   *
   * This is five writes in sequence, and a throw partway used to be worse than a lost message:
   * `createProfile` came first, and `index.tsx` gates onboarding purely on a profile existing —
   * so a failure at `startRoutine` left someone with a profile, no routine, and onboarding that
   * would never run again. A bricked first launch, silently.
   *
   * Two changes make that recoverable. Each step checks whether it already happened, so a retry
   * resumes rather than duplicating (nothing at the schema level prevents a second profile row,
   * and `getProfile()` takes `.limit(1)`, so duplicates would be arbitrary). And the profile —
   * the thing that flips the onboarding gate — is written **last**, so an interrupted run leaves
   * the gate closed and the user simply lands back here to try again.
   */
  async function finish(captured: CapturedPhotos) {
    await run(async () => {
      // Routine first: if this throws, the gate is still closed and onboarding runs again.
      const existingRoutine = await getActiveRoutine();
      const routineId = existingRoutine
        ? existingRoutine.id
        : await startRoutine({ items: routineDraft.items });

      await ensureAppSettings();

      const granted = await requestNotificationPermissions();
      if (granted) {
        await rescheduleRoutineReminders(await getAllRoutineItems());
      }

      const entries = Object.entries(captured) as [PhotoAngle, string][];
      // savePhoto already replaces by (date, angle), so re-running can't duplicate a set.
      await Promise.all(entries.map(([angle, uri]) => savePhoto(uri, angle, routineId)));
      if (entries.length === CAPTURE_ANGLES.length) {
        await recordPhotoSetCompleted();
      }

      // Written last, and only if absent: this is what tells index.tsx onboarding is done.
      if (!(await getProfile())) {
        await createProfile({ name: draft.name, age: draft.age, hairLossType: draft.hairLossType });
      }

      routineDraft.reset();
      draft.reset();
      queryClient.invalidateQueries();
      router.replace('/(tabs)');
    });
  }

  return (
    <AngleCaptureFlow
      headerText="These are your starting point — every future comparison is measured against them."
      saveLabel="Finish"
      saving={finishing}
      onSave={finish}
      footer={(captured) => (
        <Pressable disabled={finishing} onPress={() => finish(captured)}>
          <ThemedText themeColor="textSecondary" type="small" style={styles.skipLink}>
            Skip for now
          </ThemedText>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  skipLink: { textAlign: 'center' },
});
