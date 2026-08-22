import type { DayStatus } from '@/features/dose-log/doseState';

import { computeBestStreak, computeCurrentStreak, computeMonthRatio } from './streak';

function resolverFromMap(map: Record<string, DayStatus>, fallback: DayStatus = 'no-treatment') {
  return (date: string) => map[date] ?? fallback;
}

describe('computeCurrentStreak', () => {
  it('counts consecutive complete days walking back from today', () => {
    const status = resolverFromMap({
      '2026-08-22': 'complete',
      '2026-08-21': 'complete',
      '2026-08-20': 'complete',
      '2026-08-19': 'incomplete',
    });
    expect(computeCurrentStreak('2026-08-22', status)).toBe(3);
  });

  it('is zero when today is already resolved as incomplete', () => {
    const status = resolverFromMap({ '2026-08-22': 'incomplete' });
    expect(computeCurrentStreak('2026-08-22', status)).toBe(0);
  });

  it('does not zero the streak while today is still in-progress', () => {
    const status = resolverFromMap({
      '2026-08-22': 'in-progress',
      '2026-08-21': 'complete',
      '2026-08-20': 'complete',
      '2026-08-19': 'incomplete',
    });
    expect(computeCurrentStreak('2026-08-22', status)).toBe(2);
  });

  it('does not break the streak across a paused (no-treatment) gap', () => {
    const status = resolverFromMap({
      '2026-08-22': 'complete',
      '2026-08-21': 'no-treatment', // paused
      '2026-08-20': 'no-treatment', // paused
      '2026-08-19': 'complete',
      '2026-08-18': 'incomplete',
    });
    expect(computeCurrentStreak('2026-08-22', status)).toBe(2);
  });
});

describe('computeBestStreak', () => {
  it('finds the longest run of complete days in range, resetting on incomplete', () => {
    const status = resolverFromMap({
      '2026-08-01': 'complete',
      '2026-08-02': 'complete',
      '2026-08-03': 'incomplete',
      '2026-08-04': 'complete',
      '2026-08-05': 'complete',
      '2026-08-06': 'complete',
      '2026-08-07': 'complete',
    });
    expect(computeBestStreak('2026-08-01', '2026-08-07', status)).toBe(4);
  });

  it('does not reset the running streak on a no-treatment (paused) day', () => {
    const status = resolverFromMap({
      '2026-08-01': 'complete',
      '2026-08-02': 'no-treatment',
      '2026-08-03': 'complete',
    });
    expect(computeBestStreak('2026-08-01', '2026-08-03', status)).toBe(2);
  });
});

describe('computeMonthRatio', () => {
  it('counts only elapsed, treatment-applicable days', () => {
    const status = resolverFromMap(
      {
        '2026-08-01': 'complete',
        '2026-08-02': 'complete',
        '2026-08-03': 'incomplete',
        '2026-08-04': 'no-treatment',
        '2026-08-05': 'in-progress',
      },
      'complete'
    );
    // Aug has 31 days but currentDate caps us at the 5th; the 4th is excluded (no-treatment)
    // and the 5th is excluded (in-progress/today), leaving days 1-3 as the applicable set.
    const result = computeMonthRatio(2026, 8, '2026-08-05', status);
    expect(result).toEqual({ completed: 2, total: 3 });
  });
});
