import { ARTICLES } from './content/articles';
import { getActiveMilestone, MILESTONES, type Milestone } from './milestones';

const START = '2026-06-01';

/** `START` + n days, so tests can say "day 14" instead of doing calendar arithmetic. */
function day(n: number): string {
  const d = new Date(2026, 5, 1 + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('getActiveMilestone', () => {
  it('returns nothing before any routine exists', () => {
    expect(getActiveMilestone(null, '2026-08-01')).toBeNull();
  });

  it('returns nothing on a date before treatment started', () => {
    expect(getActiveMilestone(START, '2026-05-20')).toBeNull();
  });

  it('returns nothing on the start day itself — no note is due at day 0', () => {
    expect(getActiveMilestone(START, day(0))).toBeNull();
  });

  it('surfaces the shedding note across weeks 2 to 8', () => {
    for (const d of [14, 21, 40, 56]) {
      expect(getActiveMilestone(START, day(d))?.id).toBe('shedding');
    }
  });

  it('includes both ends of a window and excludes the days either side', () => {
    expect(getActiveMilestone(START, day(13))).toBeNull();
    expect(getActiveMilestone(START, day(14))?.id).toBe('shedding');
    expect(getActiveMilestone(START, day(56))?.id).toBe('shedding');
    expect(getActiveMilestone(START, day(57))).toBeNull();
  });

  it('shows nothing in the gap between windows', () => {
    expect(getActiveMilestone(START, day(70))).toBeNull();
  });

  it('surfaces the three-month note in its own window', () => {
    expect(getActiveMilestone(START, day(84))?.id).toBe('three-months');
    expect(getActiveMilestone(START, day(119))?.id).toBe('three-months');
  });

  it('goes quiet once every window has passed', () => {
    expect(getActiveMilestone(START, day(200))).toBeNull();
    expect(getActiveMilestone(START, day(900))).toBeNull();
  });

  it('crosses month and year boundaries by day count, not calendar arithmetic', () => {
    // 2025-12-25 + 14 days lands in the next year.
    expect(getActiveMilestone('2025-12-25', '2026-01-08')?.id).toBe('shedding');
  });
});

describe('MILESTONES invariants', () => {
  it('never overlaps, so at most one note can ever be due', () => {
    const sorted = [...MILESTONES].sort((a, b) => a.fromDay - b.fromDay);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].fromDay).toBeGreaterThan(sorted[i - 1].toDay);
    }
  });

  it('has a well-formed window for every entry', () => {
    for (const m of sorted()) {
      expect(m.fromDay).toBeGreaterThan(0);
      expect(m.toDay).toBeGreaterThanOrEqual(m.fromDay);
    }
  });

  it('links only to articles that exist', () => {
    const ids = new Set(ARTICLES.map((a) => a.id));
    for (const m of MILESTONES) {
      expect(ids.has(m.articleId)).toBe(true);
    }
  });

  it('uses no guilt-inducing or promissory language', () => {
    // The tone rule is a product constraint (PRD §5.5), so it gets a test rather than a comment.
    const banned = /\b(must|should have|failed|guarantee|will regrow|don't miss)\b/i;
    for (const m of MILESTONES) {
      expect(`${m.title} ${m.body}`).not.toMatch(banned);
    }
  });

  function sorted(): Milestone[] {
    return [...MILESTONES].sort((a, b) => a.fromDay - b.fromDay);
  }
});
