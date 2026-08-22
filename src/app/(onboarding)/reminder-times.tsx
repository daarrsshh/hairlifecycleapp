import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useOnboardingDraft } from '@/features/onboarding/draft-store';
import { useTheme } from '@/hooks/use-theme';

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function dateToTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

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

          <ThemedView type="backgroundElement" style={styles.pickerCard}>
            <ThemedText type="smallBold">Morning</ThemedText>
            <DateTimePicker
              value={timeStringToDate(amTime)}
              mode="time"
              onChange={(_, date) => date && setAmTime(dateToTimeString(date))}
            />
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.pickerCard}>
            <ThemedText type="smallBold">Evening</ThemedText>
            <DateTimePicker
              value={timeStringToDate(pmTime)}
              mode="time"
              onChange={(_, date) => date && setPmTime(dateToTimeString(date))}
            />
          </ThemedView>
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
