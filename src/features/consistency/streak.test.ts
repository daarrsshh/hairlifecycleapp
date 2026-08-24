import type { DayStatus } from '@/features/dose-log/doseState';

import {
  computeBestStreak,
  computeCurrentStreak,
  computeMonthRatio,
  computeRangeRatio,
  computeCalendarWeek,
  startOfWeek,
} from './streak';

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

describe('startOfWeek', () => {
  it('returns Monday for a mid-week date', () => {
    // 2026-08-24 is a Monday, 2026-08-27 a Thursday.
    expect(startOfWeek('2026-08-27')).toBe('2026-08-24');
  });

  it('returns the same date when it is already the week start', () => {
    expect(startOfWeek('2026-08-24')).toBe('2026-08-24');
  });

  it('treats Sunday as the end of the week, not the start', () => {
    // 2026-08-23 is a Sunday — it belongs to the week beginning Mon 2026-08-17.
    expect(startOfWeek('2026-08-23')).toBe('2026-08-17');
  });

  it('supports a Sunday-start week for locales that use it', () => {
    expect(startOfWeek('2026-08-27', 0)).toBe('2026-08-23');
  });
});

describe('computeCalendarWeek', () => {
  const status = resolverFromMap({});

  it('runs Monday to Sunday regardless of which day it is', () => {
    const days = computeCalendarWeek('2026-08-27', status);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-08-24'); // Monday
    expect(days[6].date).toBe('2026-08-30'); // Sunday
  });

  it('starts on Monday even when today is Monday', () => {
    const days = computeCalendarWeek('2026-08-24', status);
    expect(days[0].date).toBe('2026-08-24');
    expect(days[0].isToday).toBe(true);
  });

  it('flags only today', () => {
    const days = computeCalendarWeek('2026-08-27', status);
    expect(days.filter((d) => d.isToday).map((d) => d.date)).toEqual(['2026-08-27']);
  });

  it('marks the rest of the week as future', () => {
    const days = computeCalendarWeek('2026-08-27', status);
    expect(days.filter((d) => d.isFuture).map((d) => d.date)).toEqual([
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
    ]);
  });

  it('never reports a future day as in-progress, even with items scheduled', () => {
    // Without the guard a future day resolves to `in-progress` (nothing logged, not past yet),
    // which would render tomorrow as though it were already underway.
    const days = computeCalendarWeek('2026-08-24', () => 'in-progress');
    expect(days.filter((d) => d.isFuture).every((d) => d.status === 'no-treatment')).toBe(true);
    expect(days.find((d) => d.isToday)?.status).toBe('in-progress');
  });

  it('carries each elapsed day’s resolved status', () => {
    const withData = resolverFromMap({ '2026-08-24': 'complete', '2026-08-25': 'incomplete' });
    const days = computeCalendarWeek('2026-08-25', withData);
    expect(days.slice(0, 2).map((d) => d.status)).toEqual(['complete', 'incomplete']);
  });
});
