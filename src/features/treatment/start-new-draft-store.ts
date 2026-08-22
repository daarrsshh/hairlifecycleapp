import { create } from 'zustand';

import type { PresetDrug } from '@/features/treatment/presets';

interface StartNewTreatmentDraft {
  planType: string | null;
  drugs: PresetDrug[];
  set: (input: { planType: string; drugs: PresetDrug[] }) => void;
  clear: () => void;
}

export const useStartNewTreatmentDraft = create<StartNewTreatmentDraft>((set) => ({
  planType: null,
  drugs: [],
  set: ({ planType, drugs }) => set({ planType, drugs }),
  clear: () => set({ planType: null, drugs: [] }),
}));
