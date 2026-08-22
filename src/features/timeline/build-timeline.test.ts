import { buildTimeline } from './build-timeline';

describe('buildTimeline', () => {
  it('merges treatment starts, pauses/resumes, and photo dates into one feed, newest first', () => {
    const events = buildTimeline(
      [{ id: 'p1', planType: 'minoxidil-only', startDate: '2026-01-01' }],
      [{ treatmentPeriodId: 'p1', drugName: 'Minoxidil' }],
      [{ treatmentPeriodId: 'p1', pausedAt: '2026-02-01', resumedAt: '2026-02-10' }],
      [
        { date: '2026-01-01', angle: 'crown' },
        { date: '2026-01-01', angle: 'hairline' },
        { date: '2026-03-01', angle: 'crown' },
      ],
      (planType) => (planType === 'minoxidil-only' ? 'Minoxidil only' : 'Custom')
    );

    expect(events.map((e) => `${e.date}:${e.type}`)).toEqual([
      '2026-03-01:photos',
      '2026-02-10:treatment-resumed',
      '2026-02-01:treatment-paused',
      '2026-01-01:treatment-started',
      '2026-01-01:photos',
    ]);
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
      () => ''
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'photos', date: '2026-01-01', angles: ['crown', 'hairline'] });
  });
});
