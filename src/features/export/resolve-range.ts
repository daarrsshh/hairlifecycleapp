import { addDays, type DateString } from '@/lib/date';

export type ExportRangeOption = 'last-month' | 'last-3-months' | 'all-time' | 'custom';

export interface ResolvedRange {
  fromDate: DateString;
  toDate: DateString;
  rangeLabel: string;
}

export function resolveExportRange(
  option: ExportRangeOption,
  earliestStart: DateString | null,
  currentDate: DateString,
  custom?: { from: DateString; to: DateString }
): ResolvedRange {
  switch (option) {
    case 'last-month':
      return { fromDate: addDays(currentDate, -30), toDate: currentDate, rangeLabel: 'Last month' };
    case 'last-3-months':
      return { fromDate: addDays(currentDate, -90), toDate: currentDate, rangeLabel: 'Last 3 months' };
    case 'all-time':
      return { fromDate: earliestStart ?? currentDate, toDate: currentDate, rangeLabel: 'All time' };
    case 'custom':
      if (!custom) throw new Error('custom range requires from/to dates');
      return { fromDate: custom.from, toDate: custom.to, rangeLabel: `${custom.from} to ${custom.to}` };
  }
}
