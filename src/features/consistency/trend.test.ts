import type { DayStatus } from '@/features/dose-log/doseState';
import { computeTimeOfDayStats, computeWeeklyTrend } from './trend';

/** Monday 2026-06-01 is the reference week start throughout. */
const MONDAY = '2026-06-01';

function statusesFrom(map: Record<string, DayStatus>) {
  return (date: string): DayStatus => map[date] ?? 'no-treatment';
}

describe('computeWeeklyTrend', () => {
  it('returns nothing before any routine exists', () => {
    expect(computeWeeklyTrend('2026-06-10', null, () => 'complete')).toEqual([]);
  });

  it('returns weeks oldest first, ending with the current one', () => {
    const trend = computeWeeklyTrend('2026-06-17', '2026-05-01', () => 'complete', 3);
    expect(trend.map((w) => w.weekStart)).toEqual(['2026-06-01', '2026-06-08', '2026-06-15']);
    expect(trend[trend.length - 1].isCurrent).toBe(true);
    expect(trend.slice(0, -1).every((w) => !w.isCurrent)).toBe(true);
  });

  it('scores a week by complete days over scheduled days', () => {
    const trend = computeWeeklyTrend(
      '2026-06-07',
      MONDAY,
      statusesFrom({
        '2026-06-01': 'complete',
        '2026-06-02': 'complete',
        '2026-06-03': 'incomplete',
        '2026-06-04': 'complete',
        '2026-06-05': 'incomplete',
        '2026-06-06': 'no-treatment', // rest day — not counted either way
        '2026-06-07': 'complete',
      }),
      1
    );
    expect(trend[0]).toMatchObject({ completed: 4, total: 6 });
    expect(trend[0].ratio).toBeCloseTo(4 / 6);
  });

  it('reports a week with nothing scheduled as a gap, not a zero', () => {
    // A paused week must not render as a bar at the floor — that reads as failure.
    const trend = computeWeeklyTrend('2026-06-07', MONDAY, () => 'no-treatment', 1);
    expect(trend[0].total).toBe(0);
    expect(trend[0].ratio).toBeNull();
  });

  it("doesn't score the in-flight week on days that haven't happened", () => {
    // Wednesday of the week: only Mon-Wed exist so far.
    const trend = computeWeeklyTrend('2026-06-03', MONDAY, () => 'complete', 1);
    expect(trend[0]).toMatchObject({ completed: 3, total: 3, isCurrent: true });
  });

  it('skips weeks entirely before the routine started', () => {
    const trend = computeWeeklyTrend('2026-06-17', '2026-06-15', () => 'complete', 8);
    expect(trend.map((w) => w.weekStart)).toEqual(['2026-06-15']);
  });

  it('is bounded — a long history still returns only the requested weeks', () => {
    const trend = computeWeeklyTrend('2026-06-17', '2019-01-01', () => 'complete', 8);
    expect(trend).toHaveLength(8);
  });
});

describe('computeTimeOfDayStats', () => {
  it('groups doses by scheduled time', () => {
    const stats = computeTimeOfDayStats([
      { time: '08:00', taken: true },
      { time: '08:00', taken: true },
      { time: '20:00', taken: false },
      { time: '20:00', taken: true },
    ]);
    expect(stats).toEqual(
      expect.arrayContaining([
        { time: '08:00', taken: 2, total: 2 },
        { time: '20:00', taken: 1, total: 2 },
      ])
    );
  });

  it('orders worst-first, so the time being missed is read first', () => {
    const stats = computeTimeOfDayStats([
      { time: '08:00', taken: true },
      { time: '20:00', taken: false },
      { time: '20:00', taken: false },
      { time: '13:00', taken: true },
      { time: '13:00', taken: false },
    ]);
    expect(stats.map((s) => s.time)).toEqual(['20:00', '13:00', '08:00']);
  });

  it('returns nothing for no doses', () => {
    expect(computeTimeOfDayStats([])).toEqual([]);
  });
});
