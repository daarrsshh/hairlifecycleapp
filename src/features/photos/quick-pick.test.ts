import { findClosestPhoto } from './quick-pick';

describe('findClosestPhoto', () => {
  it('returns the photo nearest the target date', () => {
    const photos = [{ date: '2026-01-01' }, { date: '2026-02-15' }, { date: '2026-03-01' }];
    expect(findClosestPhoto(photos, '2026-02-20')).toEqual({ date: '2026-02-15' });
  });

  it('returns null for an empty list', () => {
    expect(findClosestPhoto([], '2026-01-01')).toBeNull();
  });
});
