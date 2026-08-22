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
      <Stack.Screen options={{ headerShown: true, title: article.title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText themeColor="textSecondary" type="small">
          {article.category}
        </ThemedText>
        <ThemedText type="subtitle">{article.title}</ThemedText>
        <ThemedText>{article.body}</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two },
});
