import { create } from 'zustand';

/**
 * Profile answers only. The routine being built during onboarding lives in the shared
 * `useRoutineDraft` store instead, since onboarding and "Start new routine" build the same
 * thing — reminder times now come from each routine item's own schedule, not a global pair.
 */
interface OnboardingDraft {
  name: string;
  age: number | null;
  hairLossType: string | null;
  setProfile: (input: { name: string; age: number | null; hairLossType: string | null }) => void;
  reset: () => void;
}

export const useOnboardingDraft = create<OnboardingDraft>((set) => ({
  name: '',
  age: null,
  hairLossType: null,
  setProfile: ({ name, age, hairLossType }) => set({ name, age, hairLossType }),
  reset: () => set({ name: '', age: null, hairLossType: null }),
}));
