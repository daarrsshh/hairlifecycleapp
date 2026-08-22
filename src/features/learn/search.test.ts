import { searchLearnContent } from './search';

describe('searchLearnContent', () => {
  it('returns nothing for an empty query', () => {
    expect(searchLearnContent('')).toEqual({ articles: [], faq: [] });
  });

  it('matches articles by title or body, case-insensitively', () => {
    const results = searchLearnContent('DHT');
    expect(results.articles.some((a) => a.id === 'genetics-dht')).toBe(true);
  });

  it('matches FAQ entries by question or answer', () => {
    const results = searchLearnContent('shedding');
    expect(results.faq.some((f) => f.id === 'why-more-shedding')).toBe(true);
  });

  it('returns empty results for a query that matches nothing', () => {
    expect(searchLearnContent('xyznotfound')).toEqual({ articles: [], faq: [] });
  });
});
