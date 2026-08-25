import { describePhotoTiming, describeSetCoverage, describeSetTiming, groupPhotosIntoSets, type PhotoRecord } from './photo-sets';

function photo(date: string, angle: PhotoRecord['angle'], id = `${date}-${angle}`): PhotoRecord {
  return { id, date, angle, filePath: `/photos/${id}.jpg` };
}

describe('groupPhotosIntoSets', () => {
  it('groups a day of captures into one set, newest first', () => {
    const sets = groupPhotosIntoSets(
      [
        photo('2026-08-01', 'crown'),
        photo('2026-08-01', 'hairline'),
        photo('2026-08-16', 'crown'),
        photo('2026-08-16', 'hairline'),
      ],
      '2026-08-01'
    );

    expect(sets).toHaveLength(2);
    expect(sets.map((s) => s.date)).toEqual(['2026-08-16', '2026-08-01']);
    expect(sets[0].photos).toHaveLength(2);
  });

  it('numbers days from the routine start, with the baseline set as day 0', () => {
    const sets = groupPhotosIntoSets(
      [photo('2026-08-01', 'crown'), photo('2026-08-16', 'crown')],
      '2026-08-01'
    );
    expect(sets.map((s) => s.dayNumber)).toEqual([15, 0]);
  });

  it('leaves the day number null when there is no routine history', () => {
    const sets = groupPhotosIntoSets([photo('2026-08-01', 'crown')], null);
    expect(sets[0].dayNumber).toBeNull();
  });

  it('orders photos within a set consistently regardless of capture order', () => {
    const sets = groupPhotosIntoSets(
      [
        photo('2026-08-01', 'right_temple'),
        photo('2026-08-01', 'crown'),
        photo('2026-08-01', 'left_temple'),
        photo('2026-08-01', 'hairline'),
      ],
      '2026-08-01'
    );
    expect(sets[0].photos.map((p) => p.angle)).toEqual([
      'crown',
      'hairline',
      'left_temple',
      'right_temple',
    ]);
  });

  it('prefers hairline as the cover so set cards look consistent', () => {
    const sets = groupPhotosIntoSets(
      [photo('2026-08-01', 'right_temple'), photo('2026-08-01', 'hairline')],
      '2026-08-01'
    );
    expect(sets[0].coverPhoto.angle).toBe('hairline');
  });

  it('falls back to whatever angle exists when the preferred cover is missing', () => {
    const sets = groupPhotosIntoSets([photo('2026-08-01', 'right_temple')], '2026-08-01');
    expect(sets[0].coverPhoto.angle).toBe('right_temple');
  });

  it('handles a partial set without inventing missing angles', () => {
    const sets = groupPhotosIntoSets(
      [photo('2026-08-01', 'crown'), photo('2026-08-01', 'hairline')],
      '2026-08-01'
    );
    expect(sets[0].angles).toEqual(['crown', 'hairline']);
    expect(describeSetCoverage(sets[0])).toBe('2 of 4 angles');
  });

  it('returns nothing for no photos', () => {
    expect(groupPhotosIntoSets([], '2026-08-01')).toEqual([]);
  });
});

describe('describeSetTiming', () => {
  it('calls out the baseline set', () => {
    const [set] = groupPhotosIntoSets([photo('2026-08-01', 'crown')], '2026-08-01');
    expect(describeSetTiming(set)).toBe('Day 0 · baseline');
  });

  it('counts days for later sets', () => {
    const [set] = groupPhotosIntoSets([photo('2026-08-16', 'crown')], '2026-08-01');
    expect(describeSetTiming(set)).toBe('Day 15');
  });

  it('falls back to the raw date with no routine history', () => {
    const [set] = groupPhotosIntoSets([photo('2026-08-16', 'crown')], null);
    expect(describeSetTiming(set)).toBe('2026-08-16');
  });
});

describe('describePhotoTiming', () => {
  it('numbers days from the routine start, with the baseline reading Day 0', () => {
    expect(describePhotoTiming('2026-06-01', '2026-06-01')).toBe('Day 0 · baseline');
    expect(describePhotoTiming('2026-06-15', '2026-06-01')).toBe('Day 14');
    expect(describePhotoTiming('2026-09-01', '2026-06-01')).toBe('Day 92');
  });

  it('falls back to the raw date when there is no routine history', () => {
    expect(describePhotoTiming('2026-06-15', null)).toBe('2026-06-15');
  });

  it('falls back to the date for a photo predating the routine, rather than a negative day', () => {
    expect(describePhotoTiming('2026-05-20', '2026-06-01')).toBe('2026-05-20');
  });

  it('agrees with describeSetTiming for the same day', () => {
    // Both go through one helper; this pins that they can't drift apart.
    const set = { date: '2026-06-15', dayNumber: 14, angles: [], coverAngle: null } as never;
    expect(describeSetTiming(set)).toBe(describePhotoTiming('2026-06-15', '2026-06-01'));
  });
});
