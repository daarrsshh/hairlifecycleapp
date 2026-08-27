import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * What renders instead of a white screen when something throws during render.
 *
 * Exported as `ErrorBoundary` from the root `_layout.tsx`, which is how expo-router wires a
 * fallback for a route segment — from the root it covers the whole tree.
 *
 * **What it catches:** render-time throws. That's the `Link asChild` / `Slot` class that broke
 * this app three separate times, a `GestureDetector` outside its root view, and any bad data
 * shape reaching a component.
 *
 * **What it doesn't:** errors in async handlers (that's `useAsyncAction`), native crashes, and —
 * importantly — hangs. Neither of this project's two worst failures would land here: the boot
 * hang and the `computeCurrentStreak` infinite loop never threw, the JS thread just stopped. A
 * boundary catches things that throw; it is not a general safety net.
 *
 * Colours are fixed rather than themed: this can render above or outside `ThemeProvider`, so it
 * can't assume `useTheme()` resolves. Same constraint as the migration fallback.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.warn('[render] uncaught error', error);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Something went wrong</Text>

        {/* Said plainly and first. Someone months into a photo timeline will assume a crash
            means their history is gone — it isn't, and a render crash never touches SQLite. */}
        <Text style={styles.body}>
          The app hit a problem and stopped. Your routine, doses and photos are safe — they&apos;re
          stored on this phone and nothing here touches them.
        </Text>

        <Pressable
          onPress={retry}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel="Try again">
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>

        {/* Shown, not hidden. For a tester, "screenshot this" is worth far more than a polished
            apology — the PDF export bug was diagnosable the moment its message became visible. */}
        {error?.message ? <Text style={styles.detail}>{error.message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFAF8' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  title: { fontSize: 22, fontWeight: '600', color: '#1B1A17', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, color: '#6A645C', textAlign: 'center' },
  button: {
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    backgroundColor: '#1F6F7A',
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  detail: { fontSize: 12, lineHeight: 18, color: '#706B63', textAlign: 'center', marginTop: 10 },
});
