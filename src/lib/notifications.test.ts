import type { RoutineItemSchedule } from '@/features/dose-log/doseState';

import { buildBatchedReminders } from './notifications';

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
