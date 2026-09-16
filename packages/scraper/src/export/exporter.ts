import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  addDays,
  fallbackGeoData,
  type Contract,
  type DatasetManifest,
  type Opportunity,
} from '@secop-radar/core';
import { CONTRATOS, PROCESOS, SECOP_DOMAIN } from '@secop-radar/secop-client';
import type { LocalStore } from '../db/database';
import { logger } from '../logger';
import { contractsSince, type ScrapeOptions } from '../options';

export const MANIFEST_SCHEMA_VERSION = 1;

export const ARTIFACT_FILES = {
  opportunities: 'opportunities.json.gz',
  contracts: 'contracts.json.gz',
  geo: 'geo.json',
  manifest: 'manifest.json',
} as const;

export interface ExportResult {
  dir: string;
  files: Array<{ name: string; bytes: number; rows: number }>;
  manifest: DatasetManifest;
}

function writeAtomic(dir: string, name: string, data: Buffer | string): number {
  const tmp = path.join(dir, `.${name}.tmp`);
  writeFileSync(tmp, data);
  renameSync(tmp, path.join(dir, name));
  return Buffer.byteLength(data);
}

function writeJson(dir: string, name: string, value: unknown): number {
  return writeAtomic(dir, name, JSON.stringify(value));
}

function writeJsonGz(dir: string, name: string, value: unknown): number {
  return writeAtomic(dir, name, gzipSync(Buffer.from(JSON.stringify(value)), { level: 6 }));
}

/** The search haystack is derivable from the other fields; the SPA rebuilds it on load. */
function slimOpportunity(o: Opportunity): Opportunity {
  return { ...o, searchText: '' };
}

function slimContract(c: Contract): Contract {
  return { ...c, searchText: '' };
}

/** Write the static artifacts the SPA reads from `public/data/`. */
export function exportArtifacts(store: LocalStore, o: ScrapeOptions): ExportResult {
  mkdirSync(o.exportDir, { recursive: true });
  const closingSince = addDays(o.today, -o.exportWindowDays);
  const opportunities = store
    .selectProcessesForExport(closingSince, closingSince, o.maxExport)
    .map(slimOpportunity);
  const contracts = store
    .selectContractsForExport(contractsSince(o), o.maxContractsExport)
    .map(slimContract);
  const stored = store.selectGeo();
  const geo = stored.municipalities.length > 0 ? stored : fallbackGeoData();

  const manifest: DatasetManifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    counts: {
      opportunities: opportunities.length,
      contracts: contracts.length,
      municipalities: geo.municipalities.length,
    },
    window: {
      closingSince,
      publishedFrom: o.publishedFrom,
      publishedTo: o.publishedTo,
      contractsSince: contractsSince(o),
    },
    filters: {
      departments: o.departments,
      keywords: o.keywords,
      modalities: o.modalities,
      categories: o.categories,
    },
    source: { domain: SECOP_DOMAIN, processesDataset: PROCESOS.id, contractsDataset: CONTRATOS.id },
    files: {
      opportunities: ARTIFACT_FILES.opportunities,
      contracts: ARTIFACT_FILES.contracts,
      geo: ARTIFACT_FILES.geo,
    },
  };

  const files = [
    {
      name: ARTIFACT_FILES.opportunities,
      bytes: writeJsonGz(o.exportDir, ARTIFACT_FILES.opportunities, opportunities),
      rows: opportunities.length,
    },
    {
      name: ARTIFACT_FILES.contracts,
      bytes: writeJsonGz(o.exportDir, ARTIFACT_FILES.contracts, contracts),
      rows: contracts.length,
    },
    {
      name: ARTIFACT_FILES.geo,
      bytes: writeJson(o.exportDir, ARTIFACT_FILES.geo, geo),
      rows: geo.municipalities.length,
    },
    {
      name: ARTIFACT_FILES.manifest,
      bytes: writeJson(o.exportDir, ARTIFACT_FILES.manifest, manifest),
      rows: 1,
    },
  ];
  for (const f of files) {
    logger.info(
      `  ${f.name.padEnd(24)} ${String(f.rows).padStart(7)} rows  ${(f.bytes / 1024 / 1024).toFixed(2)} MB`,
    );
  }
  return { dir: o.exportDir, files, manifest };
}
