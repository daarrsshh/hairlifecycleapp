import { ARTICLES, type Article } from '@/features/learn/content/articles';
import { FAQ, type FaqEntry } from '@/features/learn/content/faq';

export interface LearnSearchResults {
  articles: Article[];
  faq: FaqEntry[];
}

export function searchLearnContent(query: string): LearnSearchResults {
  const q = query.trim().toLowerCase();
  if (!q) return { articles: [], faq: [] };

  return {
    articles: ARTICLES.filter(
      (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
    ),
    faq: FAQ.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)),
  };
}
