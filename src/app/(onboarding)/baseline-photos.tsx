import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getRequiredSlots } from '@/features/dose-log/doseState';
import { useOnboardingDraft } from '@/features/onboarding/draft-store';
import { createProfile } from '@/features/onboarding/api';
import { setReminderTimes } from '@/features/onboarding/settings-api';
import { savePhoto, type PhotoAngle } from '@/features/photos/api';
import { startTreatmentPeriod } from '@/features/treatment/api';
import { useTheme } from '@/hooks/use-theme';
import { today } from '@/lib/date';
import { rescheduleDailyReminders, requestNotificationPermissions } from '@/lib/notifications';

const ANGLES: { value: PhotoAngle; label: string }[] = [
  { value: 'crown', label: 'Crown' },
  { value: 'hairline', label: 'Hairline' },
  { value: 'left_temple', label: 'Left temple' },
  { value: 'right_temple', label: 'Right temple' },
];

export default function BaselinePhotosScreen() {
  const theme = useTheme();
  const draft = useOnboardingDraft();
  const queryClient = useQueryClient();
  const [captured, setCaptured] = useState<Partial<Record<PhotoAngle, string>>>({});
  const [finishing, setFinishing] = useState(false);

  async function capture(angle: PhotoAngle) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    const result = permission.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setCaptured((prev) => ({ ...prev, [angle]: result.assets[0].uri }));
    }
  }

  async function finish() {
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

      await Promise.all(
        Object.entries(captured).map(([angle, uri]) =>
          savePhoto(uri as string, angle as PhotoAngle, treatmentPeriodId)
        )
      );

      queryClient.invalidateQueries();
      router.replace('/(tabs)');
    } finally {
      setFinishing(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText themeColor="textSecondary" type="small">
          These are your starting point — every future comparison is measured against them.
        </ThemedText>

        <ThemedView style={styles.grid}>
          {ANGLES.map((angle) => (
            <Pressable
              key={angle.value}
              onPress={() => capture(angle.value)}
              style={[styles.angleCard, { borderColor: theme.border }]}>
              {captured[angle.value] ? (
                <Image source={{ uri: captured[angle.value] }} style={styles.thumbnail} />
              ) : (
                <ThemedText themeColor="textSecondary" type="small">
                  Tap to add
                </ThemedText>
              )}
              <ThemedText type="small" style={styles.angleLabel}>
                {angle.label}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>

        <ThemedView style={styles.footer}>
          <Pressable
            disabled={finishing}
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={finish}>
            <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
              {finishing ? 'Setting up…' : 'Finish'}
            </ThemedText>
          </Pressable>
          <Pressable disabled={finishing} onPress={finish}>
            <ThemedText themeColor="textSecondary" type="small" style={styles.skipLink}>
              Skip for now
            </ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    justifyContent: 'space-between',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingTop: Spacing.three },
  angleCard: {
    width: '47%',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnail: StyleSheet.absoluteFill,
  angleLabel: { position: 'absolute', bottom: Spacing.one },
  footer: { gap: Spacing.two, alignItems: 'center' },
  button: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  skipLink: { textAlign: 'center' },
});
