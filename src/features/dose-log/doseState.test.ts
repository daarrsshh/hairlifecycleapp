import {
  computeEffectiveState,
  computeRepromptTime,
  getRequiredSlots,
  resolveDayStatus,
  type DoseLogRecord,
} from './doseState';

describe('computeEffectiveState', () => {
  it('returns the stored state when a log exists and is not stale pending', () => {
    const log: DoseLogRecord = {
      date: '2026-08-20',
      slot: 'am',
      state: 'taken',
      locked: true,
      respondedAt: '2026-08-20T08:00:00',
    };
    expect(computeEffectiveState(log, '2026-08-20', '2026-08-22')).toBe('taken');
  });

  it('treats a stale pending log from a past day as missed, without mutating it', () => {
    const log: DoseLogRecord = {
      date: '2026-08-20',
      slot: 'am',
      state: 'pending',
      locked: false,
      respondedAt: null,
    };
    expect(computeEffectiveState(log, '2026-08-20', '2026-08-22')).toBe('missed');
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
    const respondedAt = new Date(2026, 7, 22, 8, 0);
    const reprompt = computeRepromptTime(respondedAt);
    expect(reprompt).toEqual(new Date(2026, 7, 22, 14, 0));
  });

  it('drops the reprompt when it would cross midnight', () => {
    const respondedAt = new Date(2026, 7, 22, 19, 0); // +6h = 01:00 next day
    expect(computeRepromptTime(respondedAt)).toBeNull();
  });

  it('drops the reprompt when it would land before 10:00', () => {
    // Only reachable with an unusual base time, but the guard should still hold.
    const respondedAt = new Date(2026, 7, 22, 3, 0); // +6h = 09:00, before window
    expect(computeRepromptTime(respondedAt)).toBeNull();
  });
});

describe('getRequiredSlots', () => {
  const periods = [{ id: 'p1', startDate: '2026-08-01', endDate: null }];
  const drugs = [
    { treatmentPeriodId: 'p1', slot: 'am' as const },
    { treatmentPeriodId: 'p1', slot: 'pm' as const },
  ];

  it('returns no slots before the period starts', () => {
    expect(getRequiredSlots('2026-07-31', periods, [], drugs)).toEqual([]);
  });

  it('returns configured slots while the period is active', () => {
    expect(getRequiredSlots('2026-08-05', periods, [], drugs)).toEqual(['am', 'pm']);
  });

  it('returns no slots during an open pause window', () => {
    const pauseWindows = [{ treatmentPeriodId: 'p1', pausedAt: '2026-08-05', resumedAt: null }];
    expect(getRequiredSlots('2026-08-10', periods, pauseWindows, drugs)).toEqual([]);
  });

  it('resumes requiring slots once a pause window closes', () => {
    const pauseWindows = [
      { treatmentPeriodId: 'p1', pausedAt: '2026-08-05', resumedAt: '2026-08-10' },
    ];
    expect(getRequiredSlots('2026-08-10', periods, pauseWindows, drugs)).toEqual(['am', 'pm']);
  });

  it('collapses a "both" slot drug into am + pm', () => {
    const bothDrugs = [{ treatmentPeriodId: 'p1', slot: 'both' as const }];
    expect(getRequiredSlots('2026-08-05', periods, [], bothDrugs).sort()).toEqual(['am', 'pm']);
  });
});

describe('resolveDayStatus', () => {
  const currentDate = '2026-08-22';

  it('is no-treatment when nothing is required', () => {
    expect(resolveDayStatus('2026-08-22', [], [], currentDate)).toBe('no-treatment');
  });

  it('is complete when every required slot was taken', () => {
    const logs: DoseLogRecord[] = [
      { date: '2026-08-20', slot: 'am', state: 'taken', locked: true, respondedAt: 'x' },
      { date: '2026-08-20', slot: 'pm', state: 'taken', locked: true, respondedAt: 'x' },
    ];
    expect(resolveDayStatus('2026-08-20', ['am', 'pm'], logs, currentDate)).toBe('complete');
  });

  it('is incomplete when any required slot was skipped, even if the other was taken', () => {
    const logs: DoseLogRecord[] = [
      { date: '2026-08-20', slot: 'am', state: 'taken', locked: true, respondedAt: 'x' },
      { date: '2026-08-20', slot: 'pm', state: 'skipped', locked: true, respondedAt: 'x' },
    ];
    expect(resolveDayStatus('2026-08-20', ['am', 'pm'], logs, currentDate)).toBe('incomplete');
  });

  it('is in-progress for today when a required slot has not been answered yet', () => {
    const logs: DoseLogRecord[] = [
      { date: '2026-08-22', slot: 'am', state: 'taken', locked: true, respondedAt: 'x' },
    ];
    expect(resolveDayStatus('2026-08-22', ['am', 'pm'], logs, currentDate)).toBe('in-progress');
  });
});
