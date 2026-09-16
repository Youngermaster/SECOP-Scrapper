import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ShortlistStatus = 'interested' | 'applied' | 'discarded';

export interface ShortlistEntry {
  id: string;
  status: ShortlistStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  /** Snapshot for display if the opportunity leaves the dataset window. */
  snapshot: {
    title: string;
    entity: string;
    closesAt: string | null;
    value: number | null;
    url: string | null;
  };
}

export interface ShortlistState {
  entries: Record<string, ShortlistEntry>;
  add: (
    entry: Omit<ShortlistEntry, 'createdAt' | 'updatedAt' | 'status' | 'notes'> &
      Partial<Pick<ShortlistEntry, 'status' | 'notes'>>,
  ) => void;
  setStatus: (id: string, status: ShortlistStatus) => void;
  setNotes: (id: string, notes: string) => void;
  remove: (id: string) => void;
  importEntries: (entries: ShortlistEntry[]) => void;
  clear: () => void;
}

export const SHORTLIST_STATUS_LABELS: Record<ShortlistStatus, string> = {
  interested: 'Me interesa',
  applied: 'Apliqué',
  discarded: 'Descartada',
};

export const useShortlist = create<ShortlistState>()(
  persist(
    (set) => ({
      entries: {},
      add: (entry) =>
        set((s) => {
          const now = new Date().toISOString();
          const existing = s.entries[entry.id];
          return {
            entries: {
              ...s.entries,
              [entry.id]: {
                id: entry.id,
                snapshot: entry.snapshot,
                status: entry.status ?? existing?.status ?? 'interested',
                notes: entry.notes ?? existing?.notes ?? '',
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
              },
            },
          };
        }),
      setStatus: (id, status) =>
        set((s) => {
          const e = s.entries[id];
          if (!e) return s;
          return {
            entries: { ...s.entries, [id]: { ...e, status, updatedAt: new Date().toISOString() } },
          };
        }),
      setNotes: (id, notes) =>
        set((s) => {
          const e = s.entries[id];
          if (!e) return s;
          return {
            entries: { ...s.entries, [id]: { ...e, notes, updatedAt: new Date().toISOString() } },
          };
        }),
      remove: (id) =>
        set((s) => {
          const { [id]: _removed, ...rest } = s.entries;
          return { entries: rest };
        }),
      importEntries: (list) =>
        set((s) => ({
          entries: { ...s.entries, ...Object.fromEntries(list.map((e) => [e.id, e])) },
        })),
      clear: () => set({ entries: {} }),
    }),
    { name: 'secop-radar.shortlist', version: 1 },
  ),
);
