import { computeNextPhotoReminderDate, isPhotoReminderDue } from './photo-reminder';

describe('isPhotoReminderDue', () => {
  it('is never due before a first photo set exists', () => {
    expect(isPhotoReminderDue(null, '2026-08-22', 15)).toBe(false);
  });

  it('is not due before the interval has elapsed', () => {
    expect(isPhotoReminderDue('2026-08-10', '2026-08-22', 15)).toBe(false);
  });

  it('is due once the interval has elapsed', () => {
    expect(isPhotoReminderDue('2026-08-01', '2026-08-16', 15)).toBe(true);
  });
});

describe('computeNextPhotoReminderDate', () => {
  it('adds the interval to the last photo set date', () => {
    expect(computeNextPhotoReminderDate('2026-08-01', 15)).toBe('2026-08-16');
  });
});
