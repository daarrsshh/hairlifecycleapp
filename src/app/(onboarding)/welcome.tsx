import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <ThemedText type="title" style={styles.title}>
            Stay consistent.{'\n'}See your progress.
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Track your hair regrowth routine day by day, and watch your progress with photos over
            time.
          </ThemedText>
        </ThemedView>

        <Pressable
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/(onboarding)/profile')}>
          <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
            Get started
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
  heroSection: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  title: { textAlign: 'left' },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
