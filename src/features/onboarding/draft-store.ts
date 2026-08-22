import { create } from 'zustand';

import type { PresetDrug } from '@/features/treatment/presets';

interface OnboardingDraft {
  name: string;
  age: number | null;
  hairLossType: string | null;
  planType: string | null;
  drugs: PresetDrug[];
  reminderAmTime: string;
  reminderPmTime: string;
  setProfile: (input: { name: string; age: number | null; hairLossType: string | null }) => void;
  setTreatment: (input: { planType: string; drugs: PresetDrug[] }) => void;
  setReminderTimes: (am: string, pm: string) => void;
}

export const useOnboardingDraft = create<OnboardingDraft>((set) => ({
  name: '',
  age: null,
  hairLossType: null,
  planType: null,
  drugs: [],
  reminderAmTime: '08:00',
  reminderPmTime: '20:00',
  setProfile: ({ name, age, hairLossType }) => set({ name, age, hairLossType }),
  setTreatment: ({ planType, drugs }) => set({ planType, drugs }),
  setReminderTimes: (reminderAmTime, reminderPmTime) => set({ reminderAmTime, reminderPmTime }),
}));
