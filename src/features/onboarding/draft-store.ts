import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { draftStorage } from '@/lib/draft-storage';

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

/**
 * Persisted, because nothing in onboarding reaches the database until the final "Finish" tap.
 *
 * In memory these answers were lost the moment Android reclaimed the app — a phone call during
 * onboarding, or swiping it away from recents, sent someone back to the Welcome screen with
 * their work gone and no explanation. That happens at the point of *least* commitment, before
 * anyone has seen the app do anything useful, which is exactly when they uninstall instead of
 * starting over.
 */
export const useOnboardingDraft = create<OnboardingDraft>()(
  persist(
    (set) => ({
      name: '',
      age: null,
      hairLossType: null,
      setProfile: ({ name, age, hairLossType }) => set({ name, age, hairLossType }),
      reset: () => set({ name: '', age: null, hairLossType: null }),
    }),
    {
      name: 'onboarding-draft',
      storage: draftStorage,
      // Answers only — the actions are recreated on every load.
      partialize: (s) => ({ name: s.name, age: s.age, hairLossType: s.hairLossType }),
    }
  )
);
