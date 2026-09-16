import {
  enrichAll,
  rescoreAll,
  todayISO,
  type DatasetManifest,
  type GeoData,
  type Opportunity,
  type ScoredOpportunity,
} from '@secop-radar/core';
import type MiniSearch from 'minisearch';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ErrorState } from '@/components/ErrorState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { FirstRunScreen } from '@/features/onboarding/FirstRunScreen';
import { selectScoringProfile, useSettings } from '@/stores/settings';
import { isMissingDataset, useGeo, useManifest, useOpportunities } from './queries';
import { buildSearchIndex } from './search';

export interface DatasetContextValue {
  manifest: DatasetManifest;
  opportunities: Opportunity[];
  byId: Map<string, Opportunity>;
  scored: ScoredOpportunity[];
  scoredById: Map<string, ScoredOpportunity>;
  geo: GeoData;
  searchIndex: MiniSearch<{ id: string; text: string }>;
  today: string;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function useDataset(): DatasetContextValue {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error('useDataset must be used inside DatasetProvider');
  return ctx;
}

/**
 * Loads the static artifacts once, derives scores for the current settings, and gates
 * the UI on the three states that matter: no data yet, loading, error.
 */
export function DatasetProvider({ children }: { children: ReactNode }) {
  const manifestQ = useManifest();
  const oppsQ = useOpportunities(manifestQ.data);
  const geoQ = useGeo(manifestQ.data);

  const region = useSettings((s) => s.region);
  const weights = useSettings((s) => s.weights);
  const profile = useSettings(useShallow(selectScoringProfile));
  const today = todayISO();

  const opportunities = oppsQ.data;
  // Expensive analysis (keywords, RUP, lifecycle) only re-runs when the profile changes;
  // weight sliders take the cheap re-scoring path.
  const analysed = useMemo(
    () => (opportunities ? enrichAll(opportunities, { todayISO: today, region, profile }) : null),
    [opportunities, today, region, profile],
  );
  const scored = useMemo(() => (analysed ? rescoreAll(analysed, weights) : null), [analysed, weights]);
  const searchIndex = useMemo(() => (opportunities ? buildSearchIndex(opportunities) : null), [opportunities]);
  const byId = useMemo(() => new Map((opportunities ?? []).map((o) => [o.id, o])), [opportunities]);
  const scoredById = useMemo(() => new Map((scored ?? []).map((s) => [s.opportunity.id, s])), [scored]);

  if (manifestQ.isError) {
    if (isMissingDataset(manifestQ.error)) return <FirstRunScreen onRetry={() => void manifestQ.refetch()} />;
    return <ErrorState error={manifestQ.error} onRetry={() => void manifestQ.refetch()} />;
  }
  if (oppsQ.isError) return <ErrorState error={oppsQ.error} onRetry={() => void oppsQ.refetch()} />;
  if (geoQ.isError) return <ErrorState error={geoQ.error} onRetry={() => void geoQ.refetch()} />;
  if (!manifestQ.data || !opportunities || !geoQ.data || !scored || !searchIndex) {
    return <LoadingScreen label={oppsQ.isFetching ? 'Cargando oportunidades…' : 'Leyendo el manifiesto…'} />;
  }

  const value: DatasetContextValue = {
    manifest: manifestQ.data,
    opportunities,
    byId,
    scored,
    scoredById,
    geo: geoQ.data,
    searchIndex,
    today,
  };
  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}
