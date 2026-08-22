import { resolveExportRange } from './resolve-range';

describe('resolveExportRange', () => {
  it('last-month spans 30 days back from today', () => {
    expect(resolveExportRange('last-month', null, '2026-08-22')).toEqual({
      fromDate: '2026-07-23',
      toDate: '2026-08-22',
      rangeLabel: 'Last month',
    });
  });

  it('all-time falls back to today when there is no treatment history', () => {
    expect(resolveExportRange('all-time', null, '2026-08-22')).toEqual({
      fromDate: '2026-08-22',
      toDate: '2026-08-22',
      rangeLabel: 'All time',
    });
  });

  it('all-time starts from the earliest treatment period when one exists', () => {
    expect(resolveExportRange('all-time', '2026-01-01', '2026-08-22').fromDate).toBe('2026-01-01');
  });

  it('custom uses the given dates and throws without them', () => {
    expect(
      resolveExportRange('custom', null, '2026-08-22', { from: '2026-05-01', to: '2026-06-01' })
    ).toEqual({ fromDate: '2026-05-01', toDate: '2026-06-01', rangeLabel: '2026-05-01 to 2026-06-01' });
    expect(() => resolveExportRange('custom', null, '2026-08-22')).toThrow();
  });
});
