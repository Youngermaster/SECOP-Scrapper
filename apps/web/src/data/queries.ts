import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Contract, DatasetManifest, GeoData, Opportunity } from '@secop-radar/core';
import {
  loadContracts,
  loadDepartmentsGeoJson,
  loadGeo,
  loadManifest,
  loadOpportunities,
  MissingDatasetError,
  type DepartmentsGeoJson,
} from './artifacts';

const STATIC = { staleTime: Infinity, gcTime: Infinity, retry: false } as const;

export function useManifest(): UseQueryResult<DatasetManifest, Error> {
  return useQuery({ queryKey: ['manifest'], queryFn: loadManifest, ...STATIC });
}

export function useOpportunities(manifest: DatasetManifest | undefined): UseQueryResult<Opportunity[], Error> {
  return useQuery({
    queryKey: ['opportunities', manifest?.generatedAt],
    queryFn: () => loadOpportunities(manifest as DatasetManifest),
    enabled: manifest != null,
    ...STATIC,
  });
}

export function useContracts(manifest: DatasetManifest | undefined): UseQueryResult<Contract[], Error> {
  return useQuery({
    queryKey: ['contracts', manifest?.generatedAt],
    queryFn: () => loadContracts(manifest as DatasetManifest),
    enabled: manifest != null,
    ...STATIC,
  });
}

export function useGeo(manifest: DatasetManifest | undefined): UseQueryResult<GeoData, Error> {
  return useQuery({
    queryKey: ['geo', manifest?.generatedAt],
    queryFn: () => loadGeo(manifest as DatasetManifest),
    enabled: manifest != null,
    ...STATIC,
  });
}

export function useDepartmentsGeoJson(): UseQueryResult<DepartmentsGeoJson, Error> {
  return useQuery({ queryKey: ['departments-geojson'], queryFn: loadDepartmentsGeoJson, ...STATIC });
}

export function isMissingDataset(error: unknown): boolean {
  return error instanceof MissingDatasetError;
}
