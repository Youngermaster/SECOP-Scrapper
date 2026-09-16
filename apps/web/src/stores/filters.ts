import { DEFAULT_FILTERS, filterStateSchema, type FilterState } from '@secop-radar/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FiltersStore {
  filters: FilterState;
  set: (patch: Partial<FilterState>) => void;
  toggleIn: <
    K extends 'departments' | 'cities' | 'modalities' | 'lifecycles' | 'segments' | 'contractTypes',
  >(
    key: K,
    value: FilterState[K][number],
  ) => void;
  reset: () => void;
}

export const useFilters = create<FiltersStore>()(
  persist(
    (set) => ({
      filters: DEFAULT_FILTERS,
      set: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      toggleIn: (key, value) =>
        set((s) => {
          const list = s.filters[key] as string[];
          const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
          return { filters: { ...s.filters, [key]: next } };
        }),
      reset: () => set({ filters: DEFAULT_FILTERS }),
    }),
    {
      name: 'secop-radar.filters',
      version: 1,
      // Validate persisted state so a stale shape never crashes the app.
      merge: (persisted, current) => {
        const parsed = filterStateSchema.safeParse(
          (persisted as { filters?: unknown } | undefined)?.filters,
        );
        return { ...current, filters: parsed.success ? parsed.data : DEFAULT_FILTERS };
      },
    },
  ),
);
