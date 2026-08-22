import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ARTICLES, CATEGORIES } from '@/features/learn/content/articles';
import { FAQ } from '@/features/learn/content/faq';
import { searchLearnContent } from '@/features/learn/search';
import { useTheme } from '@/hooks/use-theme';

export default function LearnScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const results = searchLearnContent(query);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          placeholderTextColor={theme.textSecondary}
          style={[styles.search, { color: theme.text, borderColor: theme.border }]}
        />

        {searching ? (
          <SearchResults articleIds={results.articles.map((a) => a.id)} faqIds={results.faq.map((f) => f.id)} />
        ) : (
          <>
            {CATEGORIES.map((category) => (
              <ThemedView key={category} style={styles.section}>
                <ThemedText type="smallBold">{category}</ThemedText>
                {ARTICLES.filter((a) => a.category === category).map((article) => (
                  <Link key={article.id} href={`/learn/${article.id}`} asChild>
                    <Pressable style={StyleSheet.flatten([styles.row, { borderColor: theme.border }])}>
                      <ThemedText>{article.title}</ThemedText>
                    </Pressable>
                  </Link>
                ))}
              </ThemedView>
            ))}

            <ThemedView style={styles.section}>
              <ThemedText type="smallBold">FAQ</ThemedText>
              {FAQ.map((entry) => (
                <ThemedView key={entry.id} type="backgroundElement" style={styles.faqCard}>
                  <ThemedText type="smallBold">{entry.question}</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    {entry.answer}
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function SearchResults({ articleIds, faqIds }: { articleIds: string[]; faqIds: string[] }) {
  const theme = useTheme();
  const articles = ARTICLES.filter((a) => articleIds.includes(a.id));
  const faq = FAQ.filter((f) => faqIds.includes(f.id));

  if (articles.length === 0 && faq.length === 0) {
    return <ThemedText themeColor="textSecondary">No results.</ThemedText>;
  }

  return (
    <ThemedView style={styles.section}>
      {articles.map((article) => (
        <Link key={article.id} href={`/learn/${article.id}`} asChild>
          <Pressable style={[styles.row, { borderColor: theme.border }]}>
            <ThemedText>{article.title}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {article.category}
            </ThemedText>
          </Pressable>
        </Link>
      ))}
      {faq.map((entry) => (
        <ThemedView key={entry.id} type="backgroundElement" style={styles.faqCard}>
          <ThemedText type="smallBold">{entry.question}</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {entry.answer}
          </ThemedText>
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  search: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  section: { gap: Spacing.two },
  row: { paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.half },
  faqCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
