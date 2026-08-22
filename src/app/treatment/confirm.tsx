import { useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getRequiredSlots } from '@/features/dose-log/doseState';
import { getAppSettings } from '@/features/onboarding/settings-api';
import { describeTreatment } from '@/features/treatment/describe';
import { useStartNewTreatmentDraft } from '@/features/treatment/start-new-draft-store';
import { getActiveTreatmentPeriod, getDrugsForPeriod, startTreatmentPeriod } from '@/features/treatment/api';
import { useTheme } from '@/hooks/use-theme';
import { today, toDateString } from '@/lib/date';
import { rescheduleDailyReminders } from '@/lib/notifications';

export default function ConfirmStartNewTreatmentScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const draft = useStartNewTreatmentDraft();
  const [startDate, setStartDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: current, isLoading } = useQuery({
    queryKey: ['treatment', 'current-for-confirm'],
    queryFn: async () => {
      const period = await getActiveTreatmentPeriod();
      const drugs = period ? await getDrugsForPeriod(period.id) : [];
      return { period, drugs };
    },
  });

  if (!draft.planType) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: true, title: 'Confirm' }} />
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="textSecondary">Pick a routine first.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const newLabel = describeTreatment(draft.planType, draft.drugs);
  const currentLabel =
    !isLoading && current?.period ? describeTreatment(current.period.planType, current.drugs) : null;

  async function confirm() {
    setSubmitting(true);
    try {
      const treatmentPeriodId = await startTreatmentPeriod({
        planType: draft.planType!,
        drugs: draft.drugs,
        startDate,
      });

      const settings = await getAppSettings();
      const requiredSlots = getRequiredSlots(
        today(),
        [{ id: treatmentPeriodId, startDate, endDate: null }],
        [],
        draft.drugs.map((d) => ({ treatmentPeriodId, slot: d.slot }))
      );
      if (settings) {
        await rescheduleDailyReminders(requiredSlots, {
          am: settings.reminderAmTime,
          pm: settings.reminderPmTime,
        });
      }

      draft.clear();
      queryClient.invalidateQueries();
      router.replace('/(tabs)/routine');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Confirm' }} />
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.body}>
          {currentLabel ? (
            <ThemedText>
              This will end your current treatment ({currentLabel}, started {current!.period!.startDate})
              and start {newLabel} from {startDate}.
            </ThemedText>
          ) : (
            <ThemedText>
              This will start {newLabel} from {startDate}.
            </ThemedText>
          )}

          <Pressable
            style={[styles.dateRow, { borderColor: theme.border }]}
            onPress={() => setShowDatePicker(true)}>
            <ThemedText type="smallBold">Start date</ThemedText>
            <ThemedText themeColor="textSecondary">{startDate}</ThemedText>
          </Pressable>

          {showDatePicker ? (
            <DateTimePicker
              value={new Date(startDate)}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setStartDate(toDateString(date));
              }}
            />
          ) : null}
        </ThemedView>

        <Pressable
          disabled={submitting}
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={confirm}>
          <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
            {submitting ? 'Starting…' : 'Confirm'}
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
  body: { gap: Spacing.three, paddingTop: Spacing.three },
  dateRow: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
