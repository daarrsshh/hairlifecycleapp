import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { dateToTimeString, timeStringToDate } from '@/components/time-picker-field';
import { Spacing } from '@/constants/theme';
import { formatTime } from '@/features/routine/describe';
import { useTheme } from '@/hooks/use-theme';

/**
 * Edits the list of times an item is done on each scheduled day — one entry for a daily pill,
 * two for twice-daily minoxidil, and so on. Follows the same Android rule as TimePickerField:
 * the picker is a dialog there, so it's only mounted while actively choosing.
 */
export function TimesEditor({ value, onChange }: { value: string[]; onChange: (times: string[]) => void }) {
  const theme = useTheme();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  function commit(index: number, time: string) {
    const next = value.map((t, i) => (i === index ? time : t));
    onChange([...new Set(next)].sort());
  }

  function add(time: string) {
    onChange([...new Set([...value, time])].sort());
  }

  const pickerIndex = adding ? -1 : editingIndex;

  return (
    <ThemedView style={styles.container}>
      {value.map((time, index) => (
        <ThemedView key={`${time}-${index}`} type="backgroundElement" style={styles.row}>
          <Pressable onPress={() => setEditingIndex(index)} style={styles.timeButton}>
            <ThemedText type="smallBold">{formatTime(time)}</ThemedText>
          </Pressable>
          {value.length > 1 ? (
            <Pressable onPress={() => onChange(value.filter((_, i) => i !== index))}>
              <ThemedText themeColor="textSecondary" type="small">
                Remove
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      ))}

      <Pressable onPress={() => setAdding(true)}>
        <ThemedText type="linkPrimary">+ Add another time</ThemedText>
      </Pressable>

      {pickerIndex !== null ? (
        <DateTimePicker
          value={timeStringToDate(adding ? '12:00' : value[pickerIndex])}
          mode="time"
          onChange={(event, date) => {
            if (Platform.OS === 'android') {
              setEditingIndex(null);
              setAdding(false);
            }
            if (event.type === 'dismissed' || !date) return;
            const time = dateToTimeString(date);
            if (adding) add(time);
            else commit(pickerIndex, time);
          }}
        />
      ) : null}

      {Platform.OS === 'ios' && pickerIndex !== null ? (
        <Pressable
          onPress={() => {
            setEditingIndex(null);
            setAdding(false);
          }}>
          <ThemedText style={{ color: theme.primary }} type="smallBold">
            Done
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  timeButton: { flex: 1 },
});
