import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { RoutineBuilder } from '@/features/routine/components/routine-builder';
import { describeRoutine } from '@/features/routine/describe';
import { useRoutineDraft } from '@/features/routine/draft-store';
import { useAsyncAction } from '@/hooks/use-async-action';
import {
  getActiveRoutine,
  getAllRoutineItems,
  getItemsForRoutine,
  startRoutine,
} from '@/features/routine/api';
import { useTheme } from '@/hooks/use-theme';
import { today } from '@/lib/date';
import { rescheduleRoutineReminders } from '@/lib/notifications';

/**
 * "Start new routine" — builds a fresh routine and swaps it in, ending the current one.
 * Seeded with a copy of the current routine's items, since switching usually means tweaking
 * an existing stack rather than starting from nothing.
 */
export default function NewRoutineScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const draft = useRoutineDraft();
  const { run, pending: submitting } = useAsyncAction("Couldn't save your routine");
  // A one-shot latch, not render state — seeding shouldn't itself trigger a re-render.
  const seeded = useRef(false);

  const { data: current } = useQuery({
    queryKey: ['routine', 'current'],
    queryFn: async () => {
      const routine = await getActiveRoutine();
      const items = routine ? await getItemsForRoutine(routine.id) : [];
      return { routine, items };
    },
  });

  useEffect(() => {
    if (seeded.current || !current?.routine) return;
    seeded.current = true;

    // Read the store directly rather than through the render closure: this query resolves
    // asynchronously, so by now the user may already have added items — going to the item
    // builder and back is faster than the query on a warm screen. Seeding unconditionally
    // (with a reset) silently discarded whatever they'd just built and replaced it with the
    // old routine, which looked like the new item saving with the wrong schedule.
    if (useRoutineDraft.getState().items.length > 0) return;

    // Writing to the zustand store is updating an external system — the intended use of an effect.
    for (const item of current.items) {
      draft.addItem({
        type: item.type,
        name: item.name,
        dosage: item.dosage,
        daysOfWeek: item.daysOfWeek,
        times: item.times,
      });
    }
    // `draft`'s actions are stable zustand references; including it would just re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  async function confirm() {
    await run(async () => {
      await startRoutine({ items: draft.items });
      await rescheduleRoutineReminders(await getAllRoutineItems());
      draft.reset();
      queryClient.invalidateQueries();
      router.replace('/(tabs)/routine');
    });
  }

  const canSave = draft.items.length > 0 && !submitting;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Start new routine' }} />
      <RoutineBuilder
        headerText="Adjust what you're using. Saving ends your current routine and starts this one from today — your history stays intact."
        footer={
          <ThemedView style={styles.footer}>
            {current?.routine ? (
              <ThemedText themeColor="textSecondary" type="small">
                This will end your current routine ({describeRoutine(current.items)}, started{' '}
                {current.routine.startDate}) and start this one from {today()}.
              </ThemedText>
            ) : null}
            <Pressable
              disabled={!canSave}
              onPress={confirm}
              style={[styles.button, { backgroundColor: theme.primary, opacity: canSave ? 1 : 0.4 }]}>
              <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
                {submitting ? 'Saving…' : 'Save routine'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  footer: { gap: Spacing.three },
  button: { paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
});
