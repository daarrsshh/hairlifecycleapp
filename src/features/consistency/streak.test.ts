import type { DayStatus } from '@/features/dose-log/doseState';

import { computeBestStreak, computeCurrentStreak, computeMonthRatio, computeRangeRatio } from './streak';

function resolverFromMap(map: Record<string, DayStatus>, fallback: DayStatus = 'no-treatment') {
  return (date: string) => map[date] ?? fallback;
}

/**
 * Wraps a resolver so a runaway walk-back fails the test instead of hanging the suite
 * forever — which is exactly what this function used to do on-device (see the
 * "terminates" tests below).
 */
function boundedResolver(inner: (date: string) => DayStatus, maxCalls = 5000) {
  let calls = 0;
  return (date: string) => {
    if (++calls > maxCalls) {
      throw new Error(`computeCurrentStreak walked back ${maxCalls}+ days — infinite loop`);
    }
    return inner(date);
  };
}

describe('computeCurrentStreak termination', () => {
  // Every other test in this file happens to include an `incomplete` day, which is the only
  // condition that used to break the loop — so they all passed while the app hard-froze
  // on real data. These cover the cases that have no `incomplete` day at all.
  it('terminates when every logged day is complete (walks back past the treatment start)', () => {
    const status = boundedResolver(resolverFromMap({ '2026-08-22': 'complete' }));
    expect(computeCurrentStreak('2026-08-22', status, '2026-08-22')).toBe(1);
  });

  it('terminates on day one when today is still in-progress and nothing precedes it', () => {
    const status = boundedResolver(resolverFromMap({ '2026-08-22': 'in-progress' }));
    expect(computeCurrentStreak('2026-08-22', status, '2026-08-22')).toBe(0);
  });

  it('terminates when the whole history is a pause (all no-treatment)', () => {
    const status = boundedResolver(resolverFromMap({}));
    expect(computeCurrentStreak('2026-08-22', status, '2026-08-01')).toBe(0);
  });

  it('is zero when there is no treatment history at all', () => {
    const status = boundedResolver(resolverFromMap({}));
    expect(computeCurrentStreak('2026-08-22', status, null)).toBe(0);
  });
});

describe('computeCurrentStreak', () => {
  it('counts consecutive complete days walking back from today', () => {
    const status = resolverFromMap({
      '2026-08-22': 'complete',
      '2026-08-21': 'complete',
      '2026-08-20': 'complete',
      '2026-08-19': 'incomplete',
    });
    expect(computeCurrentStreak('2026-08-22', status, '2026-08-01')).toBe(3);
  });

  it('is zero when today is already resolved as incomplete', () => {
    const status = resolverFromMap({ '2026-08-22': 'incomplete' });
    expect(computeCurrentStreak('2026-08-22', status, '2026-08-01')).toBe(0);
  });

  it('does not zero the streak while today is still in-progress', () => {
    const status = resolverFromMap({
      '2026-08-22': 'in-progress',
      '2026-08-21': 'complete',
      '2026-08-20': 'complete',
      '2026-08-19': 'incomplete',
    });
    expect(computeCurrentStreak('2026-08-22', status, '2026-08-01')).toBe(2);
  });

  it('does not break the streak across a paused (no-treatment) gap', () => {
    const status = resolverFromMap({
      '2026-08-22': 'complete',
      '2026-08-21': 'no-treatment', // paused
      '2026-08-20': 'no-treatment', // paused
      '2026-08-19': 'complete',
      '2026-08-18': 'incomplete',
    });
    expect(computeCurrentStreak('2026-08-22', status, '2026-08-01')).toBe(2);
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

describe('computeRangeRatio', () => {
  it('counts an arbitrary date range, not bound to a calendar month', () => {
    const status = resolverFromMap({
      '2026-07-30': 'complete',
      '2026-07-31': 'incomplete',
      '2026-08-01': 'complete',
    });
    expect(computeRangeRatio('2026-07-30', '2026-08-01', '2026-08-01', status)).toEqual({
      completed: 2,
      total: 3,
    });
  });
});
