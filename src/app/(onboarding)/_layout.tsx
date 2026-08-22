import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'About you' }} />
      <Stack.Screen name="treatment-select" options={{ title: 'Your routine' }} />
      <Stack.Screen name="treatment-custom" options={{ title: 'Add my own' }} />
      <Stack.Screen name="reminder-times" options={{ title: 'Reminders' }} />
      <Stack.Screen name="baseline-photos" options={{ title: 'Day 0 photos' }} />
    </Stack>
  );
}
