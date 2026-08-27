import type { RoutineItemSchedule } from '@/features/dose-log/doseState';

import { buildBatchedReminders, capReminders } from './notifications';

function item(overrides: Partial<RoutineItemSchedule> & Pick<RoutineItemSchedule, 'id' | 'name'>) {
  return {
    routineId: 'r1',
    type: 'topical' as const,
    dosage: null,
    daysOfWeek: [1],
    times: ['08:00'],
    ...overrides,
  };
}

describe('buildBatchedReminders', () => {
  it('collapses items sharing a weekday and time into one reminder', () => {
    const batches = buildBatchedReminders([
      item({ id: 'min', name: 'Minoxidil' }),
      item({ id: 'fin', name: 'Finasteride' }),
    ]);

    expect(batches).toHaveLength(1);
    expect(batches[0].itemIds.sort()).toEqual(['fin', 'min']);
    expect(batches[0].time).toBe('08:00');
  });

  it('keeps different times on the same day separate', () => {
    const batches = buildBatchedReminders([item({ id: 'min', name: 'Minoxidil', times: ['08:00', '20:00'] })]);
    expect(batches.map((b) => b.time)).toEqual(['08:00', '20:00']);
  });

  it('emits one reminder per scheduled weekday', () => {
    const batches = buildBatchedReminders([
      item({ id: 'lllt', name: 'LLLT', type: 'device', daysOfWeek: [1, 3, 5], times: ['19:00'] }),
    ]);
    // JS 0-indexed Mon/Wed/Fri (1,3,5) -> expo's 1-indexed weekday (2,4,6)
    expect(batches.map((b) => b.weekday)).toEqual([2, 4, 6]);
  });

  it('converts Sunday (0) to expo weekday 1', () => {
    const batches = buildBatchedReminders([item({ id: 'x', name: 'X', daysOfWeek: [0] })]);
    expect(batches[0].weekday).toBe(1);
  });

  it('returns nothing for an empty routine', () => {
    expect(buildBatchedReminders([])).toEqual([]);
  });
});

describe('capReminders', () => {
  /** One batch per (weekday, time) — the shape buildBatchedReminders produces. */
  function batchesFor(times: string[], weekdays = [1, 2, 3, 4, 5, 6, 7]) {
    return weekdays.flatMap((weekday) =>
      times.map((time) => ({ weekday, time, itemIds: ['i'], itemNames: ['Item'] }))
    );
  }

  it('leaves a realistic routine untouched', () => {
    // Minoxidil twice daily + Finasteride (shares 8am) + LLLT at 7pm = 3 distinct times.
    const batches = batchesFor(['08:00', '19:00', '20:00']);
    expect(batches).toHaveLength(21);
    expect(capReminders(batches)).toHaveLength(21);
  });

  it('caps a routine that would exceed the OS limit', () => {
    const times = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '23:00'];
    const batches = batchesFor(times); // 70 — over iOS's 64
    const capped = capReminders(batches);
    expect(batches.length).toBeGreaterThan(60);
    expect(capped.length).toBeLessThanOrEqual(60);
  });

  it('drops whole times rather than whole weekdays', () => {
    // Truncating the sorted list would strip Saturday and Sunday entirely; every weekday that
    // has a kept time must still be represented.
    const capped = capReminders(batchesFor(['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '23:00']));
    const weekdays = new Set(capped.map((b) => b.weekday));
    expect(weekdays.size).toBe(7);
  });

  it('keeps the earliest times when it has to choose', () => {
    const capped = capReminders(batchesFor(['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '23:00']));
    const kept = [...new Set(capped.map((b) => b.time))].sort();
    expect(kept[0]).toBe('06:00');
    expect(kept).not.toContain('23:00');
  });

  it('keeps every reminder for a time it keeps at all', () => {
    const capped = capReminders(batchesFor(['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '23:00']));
    for (const time of new Set(capped.map((b) => b.time))) {
      expect(capped.filter((b) => b.time === time)).toHaveLength(7);
    }
  });
});
