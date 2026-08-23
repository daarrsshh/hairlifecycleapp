import { create } from 'zustand';

import type { DraftRoutineItem } from '@/features/routine/api';

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
 */
export const useRoutineDraft = create<RoutineDraft>((set) => ({
  items: [],
  editingIndex: null,
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  updateItem: (index, item) =>
    set((s) => ({ items: s.items.map((existing, i) => (i === index ? item : existing)) })),
  removeItem: (index) => set((s) => ({ items: s.items.filter((_, i) => i !== index) })),
  setEditingIndex: (editingIndex) => set({ editingIndex }),
  reset: () => set({ items: [], editingIndex: null }),
}));
