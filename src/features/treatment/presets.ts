import type { DoseSlot } from '@/features/dose-log/doseState';

export interface PresetDrug {
  drugName: string;
  dosage: string;
  frequency: string;
  slot: DoseSlot | 'both';
}

export interface TreatmentPreset {
  id: string;
  label: string;
  description: string;
  drugs: PresetDrug[];
}

export const TREATMENT_PRESETS: TreatmentPreset[] = [
  {
    id: 'minoxidil-only',
    label: 'Minoxidil only',
    description: 'Applied to the scalp, usually twice a day.',
    drugs: [{ drugName: 'Minoxidil', dosage: 'Standard dose', frequency: 'Daily', slot: 'both' }],
  },
  {
    id: 'fin-min',
    label: 'Finasteride + Minoxidil',
    description: 'A pill once a day, plus Minoxidil applied twice a day.',
    drugs: [
      { drugName: 'Minoxidil', dosage: 'Standard dose', frequency: 'Daily', slot: 'both' },
      { drugName: 'Finasteride', dosage: 'Standard dose', frequency: 'Daily', slot: 'am' },
    ],
  },
  {
    id: 'dut-min',
    label: 'Dutasteride + Minoxidil',
    description: 'A pill once a day, plus Minoxidil applied twice a day.',
    drugs: [
      { drugName: 'Minoxidil', dosage: 'Standard dose', frequency: 'Daily', slot: 'both' },
      { drugName: 'Dutasteride', dosage: 'Standard dose', frequency: 'Daily', slot: 'am' },
    ],
  },
  {
    id: 'dut-min-fin',
    label: 'Dutasteride + Minoxidil + Finasteride',
    description: 'Two pills once a day, plus Minoxidil applied twice a day.',
    drugs: [
      { drugName: 'Minoxidil', dosage: 'Standard dose', frequency: 'Daily', slot: 'both' },
      { drugName: 'Dutasteride', dosage: 'Standard dose', frequency: 'Daily', slot: 'am' },
      { drugName: 'Finasteride', dosage: 'Standard dose', frequency: 'Daily', slot: 'am' },
    ],
  },
];
