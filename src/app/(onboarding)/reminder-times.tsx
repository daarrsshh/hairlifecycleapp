import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimePickerField } from '@/components/time-picker-field';
import { Spacing } from '@/constants/theme';
import { useOnboardingDraft } from '@/features/onboarding/draft-store';
import { useTheme } from '@/hooks/use-theme';

export default function ReminderTimesScreen() {
  const theme = useTheme();
  const draft = useOnboardingDraft();
  const [amTime, setAmTime] = useState(draft.reminderAmTime);
  const [pmTime, setPmTime] = useState(draft.reminderPmTime);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.form}>
          <ThemedText themeColor="textSecondary" type="small">
            When should we remind you?
          </ThemedText>

          <TimePickerField
            label="Morning"
            time={amTime}
            onChange={setAmTime}
            type="backgroundElement"
            style={styles.pickerCard}
          />
          <TimePickerField
            label="Evening"
            time={pmTime}
            onChange={setPmTime}
            type="backgroundElement"
            style={styles.pickerCard}
          />
        </ThemedView>

        <Pressable
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => {
            draft.setReminderTimes(amTime, pmTime);
            router.push('/(onboarding)/baseline-photos');
          }}>
          <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
            Continue
          </ThemedText>
        </Pressable>
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
  form: { gap: Spacing.three, paddingTop: Spacing.three },
  pickerCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
