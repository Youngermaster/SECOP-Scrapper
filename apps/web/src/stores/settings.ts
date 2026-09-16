import {
  DEFAULT_KEYWORDS,
  DEFAULT_REGION,
  DEFAULT_VALUE_PROFILE,
  DEFAULT_WEIGHTS,
  type KeywordProfile,
  type RegionPreference,
  type RegionProfile,
  type ScoringProfile,
  type ScoringWeights,
  type ValueProfile,
} from '@secop-radar/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'system' | 'light' | 'dark';

export interface SettingsState {
  theme: Theme;
  region: RegionProfile;
  weights: ScoringWeights;
  keywords: KeywordProfile;
  value: ValueProfile;
  regionPreference: RegionPreference;
  closingSoonDays: number;
  setTheme: (theme: Theme) => void;
  setRegion: (region: Partial<RegionProfile>) => void;
  setWeight: (key: keyof ScoringWeights, value: number) => void;
  setWeights: (weights: ScoringWeights) => void;
  setKeywords: (keywords: KeywordProfile) => void;
  setValueProfile: (value: Partial<ValueProfile>) => void;
  setRegionPreference: (pref: RegionPreference) => void;
  setClosingSoonDays: (days: number) => void;
  resetScoring: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      region: DEFAULT_REGION,
      weights: DEFAULT_WEIGHTS,
      keywords: DEFAULT_KEYWORDS,
      value: DEFAULT_VALUE_PROFILE,
      regionPreference: 'neutral',
      closingSoonDays: 3,
      setTheme: (theme) => set({ theme }),
      setRegion: (region) => set((s) => ({ region: { ...s.region, ...region } })),
      setWeight: (key, value) => set((s) => ({ weights: { ...s.weights, [key]: value } })),
      setWeights: (weights) => set({ weights }),
      setKeywords: (keywords) => set({ keywords }),
      setValueProfile: (value) => set((s) => ({ value: { ...s.value, ...value } })),
      setRegionPreference: (regionPreference) => set({ regionPreference }),
      setClosingSoonDays: (closingSoonDays) => set({ closingSoonDays }),
      resetScoring: () =>
        set({
          weights: DEFAULT_WEIGHTS,
          keywords: DEFAULT_KEYWORDS,
          value: DEFAULT_VALUE_PROFILE,
          regionPreference: 'neutral',
          closingSoonDays: 3,
        }),
    }),
    { name: 'secop-radar.settings', version: 1 },
  ),
);

/** Assemble the scoring profile the core expects from the settings slice. */
export function selectScoringProfile(s: SettingsState): ScoringProfile {
  return {
    keywords: s.keywords,
    value: s.value,
    regionPreference: s.regionPreference,
    closingSoonDays: s.closingSoonDays,
  };
}
