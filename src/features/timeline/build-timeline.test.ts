import { buildTimeline } from './build-timeline';

const describeRoutine = (items: { name: string }[]) => items.map((i) => i.name).join(' + ');

describe('buildTimeline', () => {
  it('merges routine starts, pauses/resumes, and photo dates into one feed, newest first', () => {
    const events = buildTimeline(
      [{ id: 'r1', startDate: '2026-01-01' }],
      [{ routineId: 'r1', name: 'Minoxidil' }],
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
        { routineId: 'r1', name: 'Minoxidil' },
        { routineId: 'r1', name: 'Finasteride' },
        { routineId: 'r2', name: 'Not mine' },
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
