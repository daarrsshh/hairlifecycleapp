import {
  computeEffectiveState,
  computeRepromptTime,
  dayOfWeek,
  getScheduledDoses,
  resolveDayProgress,
  resolveDayStatus,
  type DoseLogRecord,
  type RoutineItemSchedule,
} from './doseState';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

function log(overrides: Partial<DoseLogRecord> & Pick<DoseLogRecord, 'routineItemId' | 'time'>): DoseLogRecord {
  return {
    date: '2026-08-20',
    state: 'taken',
    locked: true,
    respondedAt: 'x',
    ...overrides,
  };
}

function item(overrides: Partial<RoutineItemSchedule> & Pick<RoutineItemSchedule, 'id'>): RoutineItemSchedule {
  return {
    routineId: 'r1',
    type: 'topical',
    name: 'Minoxidil',
    dosage: null,
    daysOfWeek: EVERY_DAY,
    times: ['08:00'],
    ...overrides,
  };
}

describe('computeEffectiveState', () => {
  it('returns the stored state when a log exists and is not stale pending', () => {
    expect(computeEffectiveState(log({ routineItemId: 'a', time: '08:00' }), '2026-08-20', '2026-08-22')).toBe(
      'taken'
    );
  });

  it('treats a stale pending log from a past day as missed, without mutating it', () => {
    const stale = log({ routineItemId: 'a', time: '08:00', state: 'pending', locked: false, respondedAt: null });
    expect(computeEffectiveState(stale, '2026-08-20', '2026-08-22')).toBe('missed');
  });

  it('treats a missing log for today as pending, not missed', () => {
    expect(computeEffectiveState(undefined, '2026-08-22', '2026-08-22')).toBe('pending');
  });

  it('treats a missing log for a past day as missed', () => {
    expect(computeEffectiveState(undefined, '2026-08-19', '2026-08-22')).toBe('missed');
  });
});

describe('computeRepromptTime', () => {
  it('schedules 6 hours later when that stays within the same day and after 10:00', () => {
    expect(computeRepromptTime(new Date(2026, 7, 22, 8, 0))).toEqual(new Date(2026, 7, 22, 14, 0));
  });

  it('drops the reprompt when it would cross midnight', () => {
    expect(computeRepromptTime(new Date(2026, 7, 22, 19, 0))).toBeNull();
  });

  it('drops the reprompt when it would land before 10:00', () => {
    expect(computeRepromptTime(new Date(2026, 7, 22, 3, 0))).toBeNull();
  });
});

describe('dayOfWeek', () => {
  it('maps a date to a local weekday index (0 = Sunday)', () => {
    expect(dayOfWeek('2026-08-23')).toBe(0); // Sunday
    expect(dayOfWeek('2026-08-24')).toBe(1); // Monday
  });
});

describe('getScheduledDoses', () => {
  const routines = [{ id: 'r1', startDate: '2026-08-01', endDate: null }];

  it('returns nothing before the routine starts', () => {
    expect(getScheduledDoses('2026-07-31', routines, [], [item({ id: 'i1' })])).toEqual([]);
  });

  it('returns one dose per scheduled time — a twice-daily item yields two', () => {
    const doses = getScheduledDoses(
      '2026-08-24',
      routines,
      [],
      [item({ id: 'min', times: ['08:00', '20:00'] })]
    );
    expect(doses).toEqual([
      { itemId: 'min', time: '08:00' },
      { itemId: 'min', time: '20:00' },
    ]);
  });

  it('only includes items scheduled for that weekday', () => {
    // 2026-08-24 is a Monday; the device item is Mon/Wed/Fri, the topical is daily.
    const items = [
      item({ id: 'min', name: 'Minoxidil' }),
      item({ id: 'lllt', name: 'LLLT', type: 'device', daysOfWeek: [1, 3, 5], times: ['19:00'] }),
    ];
    expect(getScheduledDoses('2026-08-24', routines, [], items).map((d) => d.itemId)).toEqual(['min', 'lllt']);
    // 2026-08-25 is a Tuesday — the device isn't scheduled.
    expect(getScheduledDoses('2026-08-25', routines, [], items).map((d) => d.itemId)).toEqual(['min']);
  });

  it('returns nothing during an open pause window', () => {
    const pauses = [{ routineId: 'r1', pausedAt: '2026-08-05', resumedAt: null }];
    expect(getScheduledDoses('2026-08-24', routines, pauses, [item({ id: 'i1' })])).toEqual([]);
  });

  it('resumes once a pause window closes', () => {
    const pauses = [{ routineId: 'r1', pausedAt: '2026-08-05', resumedAt: '2026-08-10' }];
    expect(getScheduledDoses('2026-08-24', routines, pauses, [item({ id: 'i1' })])).toHaveLength(1);
  });

  it('ignores items belonging to a different routine', () => {
    const items = [item({ id: 'i1' }), item({ id: 'other', routineId: 'r2' })];
    expect(getScheduledDoses('2026-08-24', routines, [], items).map((d) => d.itemId)).toEqual(['i1']);
  });

  it('orders doses by time of day', () => {
    const items = [
      item({ id: 'evening', times: ['20:00'] }),
      item({ id: 'morning', times: ['07:00'] }),
    ];
    expect(getScheduledDoses('2026-08-24', routines, [], items).map((d) => d.itemId)).toEqual([
      'morning',
      'evening',
    ]);
  });
});

describe('resolveDayProgress', () => {
  const currentDate = '2026-08-22';
  const scheduled = [
    { itemId: 'min', time: '08:00' },
    { itemId: 'min', time: '20:00' },
    { itemId: 'fin', time: '08:00' },
  ];

  it('is no-treatment when nothing is scheduled', () => {
    expect(resolveDayProgress('2026-08-22', [], [], currentDate)).toEqual({
      status: 'no-treatment',
      taken: 0,
      total: 0,
    });
  });

  it('is complete only when every scheduled dose was taken', () => {
    const logs = [
      log({ routineItemId: 'min', time: '08:00' }),
      log({ routineItemId: 'min', time: '20:00' }),
      log({ routineItemId: 'fin', time: '08:00' }),
    ];
    expect(resolveDayProgress('2026-08-20', scheduled, logs, currentDate)).toEqual({
      status: 'complete',
      taken: 3,
      total: 3,
    });
  });

  it('distinguishes which dose of a twice-daily item was skipped', () => {
    const logs = [
      log({ routineItemId: 'min', time: '08:00', state: 'taken' }),
      log({ routineItemId: 'min', time: '20:00', state: 'skipped' }),
      log({ routineItemId: 'fin', time: '08:00', state: 'taken' }),
    ];
    const progress = resolveDayProgress('2026-08-20', scheduled, logs, currentDate);
    expect(progress).toEqual({ status: 'incomplete', taken: 2, total: 3 });
  });

  it('reports partial progress for a day still in flight', () => {
    const logs = [log({ routineItemId: 'min', time: '08:00', date: currentDate })];
    expect(resolveDayProgress(currentDate, scheduled, logs, currentDate)).toEqual({
      status: 'in-progress',
      taken: 1,
      total: 3,
    });
  });
});

describe('resolveDayStatus', () => {
  it('rolls progress up to just the status', () => {
    expect(resolveDayStatus('2026-08-22', [], [], '2026-08-22')).toBe('no-treatment');
  });
});
