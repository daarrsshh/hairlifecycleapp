import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { DraftRoutineItem } from '@/features/routine/api';
import { draftStorage } from '@/lib/draft-storage';

interface RoutineDraft {
  items: DraftRoutineItem[];
  /** Index being edited, or null when adding a new item. */
  editingIndex: number | null;
  addItem: (item: DraftRoutineItem) => void;
  updateItem: (index: number, item: DraftRoutineItem) => void;
  removeItem: (index: number) => void;
  setEditingIndex: (index: number | null) => void;
  reset: () => void;
}

/**
 * Holds the in-progress routine while the user builds it across the multi-step flow. Shared by
 * onboarding and "Start new routine" — both build the same thing, they differ only in what
 * happens on save.
 *
 * **Persisted**, and this is the store where it matters most. Building a routine is the only
 * part of onboarding involving real work — three items, each with a name, dosage, weekdays and
 * times — which makes it both the longest screen and the one most likely to be interrupted. In
 * memory, that work vanished when Android reclaimed the app.
 *
 * `editingIndex` is deliberately **not** persisted: it points at a half-open editor screen, and
 * restoring it after a restart would drop someone into an editor for an item they've forgotten
 * they were changing.
 */
export const useRoutineDraft = create<RoutineDraft>()(
  persist(
    (set) => ({
      items: [],
      editingIndex: null,
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      updateItem: (index, item) =>
        set((s) => ({ items: s.items.map((existing, i) => (i === index ? item : existing)) })),
      removeItem: (index) => set((s) => ({ items: s.items.filter((_, i) => i !== index) })),
      setEditingIndex: (editingIndex) => set({ editingIndex }),
      reset: () => set({ items: [], editingIndex: null }),
    }),
    {
      name: 'routine-draft',
      storage: draftStorage,
      partialize: (s) => ({ items: s.items }),
    }
  )
);
