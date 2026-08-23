import type { RoutineItemType } from '@/features/dose-log/doseState';

export interface CatalogEntry {
  name: string;
  type: RoutineItemType;
  /** Suggested strengths offered as chips on the dosage step — never forced. */
  dosageSuggestions: string[];
  /** Sensible starting schedule, pre-filled in the builder so the common case is a few taps. */
  defaultDaysOfWeek: number[];
  defaultTimes: string[];
}

const DAILY = [0, 1, 2, 3, 4, 5, 6];
const MON_WED_FRI = [1, 3, 5];

/**
 * Seeds the "what are you taking?" autocomplete and pre-fills each item's default schedule.
 * Descriptive only — this is what people commonly *do*, not a recommendation of what to take
 * (PRD §3: no diagnosis or treatment advice). Users can always override every field, and add
 * anything not listed here via "Add your own".
 *
 * NOTE: this list is a reasonable first pass, pending the research in `knowledge/` — expect
 * the names, default frequencies and dosage suggestions to be revised against it.
 */
export const TREATMENT_CATALOG: CatalogEntry[] = [
  {
    name: 'Minoxidil',
    type: 'topical',
    dosageSuggestions: ['2%', '5%'],
    defaultDaysOfWeek: DAILY,
    defaultTimes: ['08:00', '20:00'],
  },
  {
    name: 'Finasteride',
    type: 'oral',
    dosageSuggestions: ['1mg', '0.5mg'],
    defaultDaysOfWeek: DAILY,
    defaultTimes: ['08:00'],
  },
  {
    name: 'Dutasteride',
    type: 'oral',
    dosageSuggestions: ['0.5mg'],
    defaultDaysOfWeek: DAILY,
    defaultTimes: ['08:00'],
  },
  {
    name: 'Oral minoxidil',
    type: 'oral',
    dosageSuggestions: ['1.25mg', '2.5mg', '5mg'],
    defaultDaysOfWeek: DAILY,
    defaultTimes: ['08:00'],
  },
  {
    name: 'Ketoconazole shampoo',
    type: 'topical',
    dosageSuggestions: ['1%', '2%'],
    defaultDaysOfWeek: MON_WED_FRI,
    defaultTimes: ['08:00'],
  },
  {
    name: 'LLLT cap',
    type: 'device',
    dosageSuggestions: ['10 min', '20 min'],
    defaultDaysOfWeek: MON_WED_FRI,
    defaultTimes: ['19:00'],
  },
  {
    name: 'Microneedling',
    type: 'device',
    dosageSuggestions: ['0.5mm', '1.0mm', '1.5mm'],
    defaultDaysOfWeek: [0],
    defaultTimes: ['19:00'],
  },
  {
    name: 'Derma roller',
    type: 'device',
    dosageSuggestions: ['0.5mm', '1.0mm'],
    defaultDaysOfWeek: [0],
    defaultTimes: ['19:00'],
  },
  {
    name: 'Biotin',
    type: 'oral',
    dosageSuggestions: ['5000mcg', '10000mcg'],
    defaultDaysOfWeek: DAILY,
    defaultTimes: ['08:00'],
  },
  {
    name: 'Vitamin D',
    type: 'oral',
    dosageSuggestions: ['1000 IU', '2000 IU'],
    defaultDaysOfWeek: DAILY,
    defaultTimes: ['08:00'],
  },
];

export const ITEM_TYPE_LABEL: Record<RoutineItemType, string> = {
  oral: 'Oral',
  topical: 'Topical',
  device: 'Device',
};

export function findCatalogEntry(name: string): CatalogEntry | undefined {
  const q = name.trim().toLowerCase();
  return TREATMENT_CATALOG.find((e) => e.name.toLowerCase() === q);
}

export function searchCatalog(query: string): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return TREATMENT_CATALOG;
  return TREATMENT_CATALOG.filter((e) => e.name.toLowerCase().includes(q));
}
