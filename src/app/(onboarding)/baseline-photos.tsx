import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getRequiredSlots } from '@/features/dose-log/doseState';
import { useOnboardingDraft } from '@/features/onboarding/draft-store';
import { createProfile } from '@/features/onboarding/api';
import { setReminderTimes } from '@/features/onboarding/settings-api';
import { savePhoto, recordPhotoSetCompleted, type PhotoAngle } from '@/features/photos/api';
import { AngleCaptureFlow, CAPTURE_ANGLES, type CapturedPhotos } from '@/features/photos/components/angle-capture-flow';
import { startTreatmentPeriod } from '@/features/treatment/api';
import { today } from '@/lib/date';
import { rescheduleDailyReminders, requestNotificationPermissions } from '@/lib/notifications';

export default function BaselinePhotosScreen() {
  const draft = useOnboardingDraft();
  const queryClient = useQueryClient();
  const [finishing, setFinishing] = useState(false);

  async function finish(captured: CapturedPhotos) {
    setFinishing(true);
    try {
      await createProfile({ name: draft.name, age: draft.age, hairLossType: draft.hairLossType });
      const treatmentPeriodId = await startTreatmentPeriod({
        planType: draft.planType ?? 'custom',
        drugs: draft.drugs,
      });
      await setReminderTimes(draft.reminderAmTime, draft.reminderPmTime);

      const requiredSlots = getRequiredSlots(
        today(),
        [{ id: treatmentPeriodId, startDate: today(), endDate: null }],
        [],
        draft.drugs.map((d) => ({ treatmentPeriodId, slot: d.slot }))
      );
      const granted = await requestNotificationPermissions();
      if (granted) {
        await rescheduleDailyReminders(requiredSlots, {
          am: draft.reminderAmTime,
          pm: draft.reminderPmTime,
        });
      }

      const entries = Object.entries(captured) as [PhotoAngle, string][];
      await Promise.all(entries.map(([angle, uri]) => savePhoto(uri, angle, treatmentPeriodId)));
      if (entries.length === CAPTURE_ANGLES.length) {
        await recordPhotoSetCompleted();
      }

      queryClient.invalidateQueries();
      router.replace('/(tabs)');
    } finally {
      setFinishing(false);
    }
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
