import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ARTICLES } from '@/features/learn/content/articles';

export default function ArticleScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const article = ARTICLES.find((a) => a.id === articleId);

  if (!article) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText themeColor="textSecondary">Article not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* The title is set in the body, not the nav bar — a native header would truncate it and
          then repeat what's already the first thing on the page. */}
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.category}>
          {article.category}
        </ThemedText>
        <ThemedText type="subtitle">{article.title}</ThemedText>
        {/* Bodies are single paragraphs today, so they lean on line-height to stay readable;
            splitting on a blank line means added paragraphs render correctly without a change. */}
        {article.body.split(/\n\s*\n/).map((para, i) => (
          <ThemedText key={i} style={styles.body}>
            {para.trim()}
          </ThemedText>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.five },
  category: { textTransform: 'uppercase', letterSpacing: 0.8 },
  /* Looser than the 16/24 default — this is the one screen in the app meant to be read rather
     than scanned, and 1.5 is tight for a solid block of prose. */
  body: { lineHeight: 26, marginTop: Spacing.one },
});
