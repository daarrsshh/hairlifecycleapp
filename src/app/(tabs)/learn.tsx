import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ListDivider, ListGroup, ListRow } from '@/components/list-row';
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
      <Tabs.Screen
        options={{
          title: 'Learn',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="subtitle">Learn</ThemedText>

        <View style={[styles.search, { borderColor: theme.border }]}>
          <SymbolView
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            size={18}
            tintColor={theme.textSecondary}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search articles and questions"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searching ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                size={18}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>

        {searching ? (
          <SearchResults
            articleIds={results.articles.map((a) => a.id)}
            faqIds={results.faq.map((f) => f.id)}
          />
        ) : (
          <>
            {CATEGORIES.map((category) => {
              const inCategory = ARTICLES.filter((a) => a.category === category);
              if (inCategory.length === 0) return null;
              return (
                <View key={category} style={styles.section}>
                  <SectionLabel>{category}</SectionLabel>
                  <ListGroup>
                    {inCategory.map((article, i) => (
                      <View key={article.id}>
                        {i > 0 ? <ListDivider /> : null}
                        <ListRow href={`/learn/${article.id}`} title={article.title} />
                      </View>
                    ))}
                  </ListGroup>
                </View>
              );
            })}

            <View style={styles.section}>
              <SectionLabel>Common questions</SectionLabel>
              <ListGroup>
                {FAQ.map((entry, i) => (
                  <View key={entry.id}>
                    {i > 0 ? <ListDivider /> : null}
                    <FaqRow question={entry.question} answer={entry.answer} />
                  </View>
                ))}
              </ListGroup>
            </View>

            {/* Settings sits at the foot of the tab, below the reading material rather than
                competing with it. Learn is the calmest surface in the app and the one people
                browse rather than act on, which makes it a reasonable home for the things you
                look for occasionally: reminders, export, and what the app knows about you. */}
            <View style={styles.section}>
              <SectionLabel>App</SectionLabel>
              <ListGroup>
                <ListRow
                  href="/settings"
                  icon={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                  title="Settings"
                  subtitle="Your account and app data"
                />
              </ListGroup>
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

/**
 * FAQ answers open in place rather than pushing a screen.
 *
 * They're two or three sentences — short enough that a navigation round trip costs more than it
 * gives, and short enough that reading several in a row is the normal case. Articles still push,
 * because those are a longer read.
 */
function FaqRow({ question, answer }: { question: string; answer: string }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Pressable onPress={() => setOpen((v) => !v)} style={styles.faqRow}>
      <View style={styles.faqHeader}>
        <ThemedText type="smallBold" style={styles.faqQuestion}>
          {question}
        </ThemedText>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          size={16}
          tintColor={theme.textSecondary}
          style={open ? styles.chevronOpen : undefined}
        />
      </View>
      {open ? (
        <ThemedText themeColor="textSecondary" type="small" style={styles.faqAnswer}>
          {answer}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

function SearchResults({ articleIds, faqIds }: { articleIds: string[]; faqIds: string[] }) {
  const articles = ARTICLES.filter((a) => articleIds.includes(a.id));
  const faq = FAQ.filter((f) => faqIds.includes(f.id));

  if (articles.length === 0 && faq.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.empty}>
        <ThemedText type="smallBold">Nothing matched</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Try a shorter word — &ldquo;shedding&rdquo; or &ldquo;minoxidil&rdquo; rather than a
          whole question.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      {articles.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>
            {articles.length} {articles.length === 1 ? 'article' : 'articles'}
          </SectionLabel>
          <ListGroup>
            {articles.map((article, i) => (
              <View key={article.id}>
                {i > 0 ? <ListDivider /> : null}
                <ListRow
                  href={`/learn/${article.id}`}
                  title={article.title}
                  subtitle={article.category}
                />
              </View>
            ))}
          </ListGroup>
        </View>
      ) : null}

      {faq.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>
            {faq.length} {faq.length === 1 ? 'question' : 'questions'}
          </SectionLabel>
          <ListGroup>
            {faq.map((entry, i) => (
              <View key={entry.id}>
                {i > 0 ? <ListDivider /> : null}
                <FaqRow question={entry.question} answer={entry.answer} />
              </View>
            ))}
          </ListGroup>
        </View>
      ) : null}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.five },
  section: { gap: Spacing.two },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.two },

  faqRow: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: Spacing.two },
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  faqQuestion: { flex: 1 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  faqAnswer: { paddingRight: Spacing.four },

  empty: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
