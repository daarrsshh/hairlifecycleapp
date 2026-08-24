import { buildMonthGrid, describeMonth, weekdayInitials } from './month-grid';

describe('buildMonthGrid', () => {
  it('lays every week out as exactly 7 cells', () => {
    for (const month of [1, 2, 6, 8, 12]) {
      for (const week of buildMonthGrid(2026, month)) {
        expect(week).toHaveLength(7);
      }
    }
  });

  it('includes every day of the month exactly once, in order', () => {
    const dates = buildMonthGrid(2026, 8).flat().filter(Boolean);
    expect(dates).toHaveLength(31);
    expect(dates[0]).toBe('2026-08-01');
    expect(dates[30]).toBe('2026-08-31');
  });

  it('puts the 1st in the right column — Aug 2026 starts on a Saturday', () => {
    // Monday-start: Sat is the 6th column (index 5), so five leading blanks.
    const [firstWeek] = buildMonthGrid(2026, 8, 1);
    expect(firstWeek.slice(0, 5).every((c) => c === null)).toBe(true);
    expect(firstWeek[5]).toBe('2026-08-01');
    expect(firstWeek[6]).toBe('2026-08-02');
  });

  it('shifts the same month correctly for a Sunday-start week', () => {
    // Sunday-start: Saturday is the last column, so six leading blanks.
    const [firstWeek] = buildMonthGrid(2026, 8, 0);
    expect(firstWeek.slice(0, 6).every((c) => c === null)).toBe(true);
    expect(firstWeek[6]).toBe('2026-08-01');
  });

  it('pads the final week rather than leaving it short', () => {
    const weeks = buildMonthGrid(2026, 8);
    const lastWeek = weeks[weeks.length - 1];
    expect(lastWeek).toHaveLength(7);
    expect(lastWeek.some((c) => c === null)).toBe(true);
  });

  it('handles a month that fills its weeks exactly (Feb 2027 starts Monday, 28 days)', () => {
    const weeks = buildMonthGrid(2027, 2, 1);
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((c) => c !== null)).toBe(true);
  });

  it('handles a leap February', () => {
    const dates = buildMonthGrid(2028, 2).flat().filter(Boolean);
    expect(dates).toHaveLength(29);
    expect(dates[28]).toBe('2028-02-29');
  });
});

describe('weekdayInitials', () => {
  it('starts on Monday by default', () => {
    expect(weekdayInitials()).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  });

  it('starts on Sunday when asked', () => {
    expect(weekdayInitials(0)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });
});

describe('describeMonth', () => {
  it('names the month and year', () => {
    expect(describeMonth(2026, 8)).toBe('August 2026');
    expect(describeMonth(2026, 1)).toBe('January 2026');
    expect(describeMonth(2026, 12)).toBe('December 2026');
  });
});
