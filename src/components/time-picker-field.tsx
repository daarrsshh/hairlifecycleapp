import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import type { ThemeColor } from '@/constants/theme';

export function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function dateToTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * A time-of-day row that behaves correctly on both platforms. iOS renders `DateTimePicker`
 * inline, which is its native behavior. Android's `DateTimePicker` is dialog-only and opens
 * immediately the instant it's mounted — so mounting it unconditionally (as a plain inline
 * field) pops up a clock dialog the moment the screen renders. On Android this instead shows
 * the current value as a tappable label, and only mounts the picker (dialog) on tap, unmounting
 * it again once the dialog closes, whether the user picked a time or dismissed it.
 */
export function TimePickerField({
  label,
  time,
  onChange,
  style,
  type,
}: {
  label: string;
  time: string;
  onChange: (time: string) => void;
  style?: StyleProp<ViewStyle>;
  type?: ThemeColor;
}) {
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  return (
    <ThemedView type={type} style={style}>
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
      {Platform.OS === 'android' && !showPicker ? (
        <Pressable onPress={() => setShowPicker(true)}>
          <ThemedText type="smallBold">{time}</ThemedText>
        </Pressable>
      ) : null}
      {showPicker ? (
        <DateTimePicker
          value={timeStringToDate(time)}
          mode="time"
          onChange={(event, date) => {
            if (Platform.OS === 'android') setShowPicker(false);
            if (event.type !== 'dismissed' && date) onChange(dateToTimeString(date));
          }}
        />
      ) : null}
    </ThemedView>
  );
}
