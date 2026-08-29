import { buildTimeline, diffRoutineItems } from './build-timeline';

const describeRoutine = (items: { name: string }[]) => items.map((i) => i.name).join(' + ');

describe('buildTimeline', () => {
  it('merges routine starts, pauses/resumes, and photo dates into one feed, newest first', () => {
    const events = buildTimeline(
      [{ id: 'r1', startDate: '2026-01-01' }],
      [{ routineId: 'r1', name: 'Minoxidil', daysOfWeek: [0,1,2,3,4,5,6], times: ['08:00'] }],
      [{ routineId: 'r1', pausedAt: '2026-02-01', resumedAt: '2026-02-10' }],
      [
        { date: '2026-01-01', angle: 'crown' },
        { date: '2026-01-01', angle: 'hairline' },
        { date: '2026-03-01', angle: 'crown' },
      ],
      describeRoutine
    );

    expect(events.map((e) => `${e.date}:${e.type}`)).toEqual([
      '2026-03-01:photos',
      '2026-02-10:routine-resumed',
      '2026-02-01:routine-paused',
      '2026-01-01:routine-started',
      '2026-01-01:photos',
    ]);
  });

  it('labels a routine from its live item list rather than a stored name', () => {
    const events = buildTimeline(
      [{ id: 'r1', startDate: '2026-01-01' }],
      [
        { routineId: 'r1', name: 'Minoxidil', daysOfWeek: [0,1,2,3,4,5,6], times: ['08:00'] },
        { routineId: 'r1', name: 'Finasteride', daysOfWeek: [0,1,2,3,4,5,6], times: ['08:00'] },
        { routineId: 'r2', name: 'Not mine', daysOfWeek: [0,1,2,3,4,5,6], times: ['08:00'] },
      ],
      [],
      [],
      describeRoutine
    );

    expect(events[0]).toMatchObject({
      type: 'routine-started',
      label: 'Minoxidil + Finasteride',
      itemNames: ['Minoxidil', 'Finasteride'],
    });
  });

  it('groups same-day photos from multiple angles into a single event', () => {
    const events = buildTimeline(
      [],
      [],
      [],
      [
        { date: '2026-01-01', angle: 'crown' },
        { date: '2026-01-01', angle: 'hairline' },
      ],
      describeRoutine
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'photos', date: '2026-01-01', angles: ['crown', 'hairline'] });
  });
});

describe('diffRoutineItems', () => {
  const item = (name: string, times = ['08:00'], daysOfWeek = [0, 1, 2, 3, 4, 5, 6]) => ({
    routineId: 'r',
    name,
    daysOfWeek,
    times,
  });

  it('reports nothing changed when the routines match', () => {
    const before = [item('Minoxidil'), item('Finasteride')];
    expect(diffRoutineItems(before, [...before])).toEqual({
      added: [],
      removed: [],
      rescheduled: [],
    });
  });

  it('catches a time change on the same item', () => {
    // The reported case: only the dose time moved, which previously rendered as a second
    // identical "Started oral Minoxidil".
    const before = [item('Minoxidil', ['11:54'])];
    const after = [item('Minoxidil', ['11:56'])];
    expect(diffRoutineItems(before, after)).toEqual({
      added: [],
      removed: [],
      rescheduled: ['Minoxidil'],
    });
  });

  it('catches a change of days', () => {
    const before = [item('LLLT', ['19:00'], [1, 3, 5])];
    const after = [item('LLLT', ['19:00'], [1, 2, 3, 4, 5])];
    expect(diffRoutineItems(before, after).rescheduled).toEqual(['LLLT']);
  });

  it('ignores ordering of days and times', () => {
    const before = [item('Minoxidil', ['20:00', '08:00'], [6, 0, 1])];
    const after = [item('Minoxidil', ['08:00', '20:00'], [0, 1, 6])];
    expect(diffRoutineItems(before, after).rescheduled).toEqual([]);
  });

  it('reports added and removed items', () => {
    const before = [item('Minoxidil')];
    const after = [item('Minoxidil'), item('Finasteride')];
    expect(diffRoutineItems(before, after)).toMatchObject({
      added: ['Finasteride'],
      removed: [],
    });
    expect(diffRoutineItems(after, before)).toMatchObject({
      added: [],
      removed: ['Finasteride'],
    });
  });
});
