import { addDays, todayISO } from '@secop-radar/core';

/** Fully resolved scraper options (CLI flags + env + defaults). */
export interface ScrapeOptions {
  dbPath: string;
  exportDir: string;
  export: boolean;
  /** Fetch processes whose closing date is >= today - closingWindowDays. */
  closingWindowDays: number;
  /** Also fetch processes whose last publication date is >= since (ISO date). */
  since: string | null;
  publishedFrom: string | null;
  publishedTo: string | null;
  departments: string[];
  keywords: string[];
  modalities: string[];
  categories: string[];
  includeDrafts: boolean;
  contracts: boolean;
  contractsMonths: number;
  contractsCategories: string[];
  contractsKeywords: string[];
  refreshGeo: boolean;
  pageSize: number;
  exportWindowDays: number;
  maxExport: number;
  maxContractsExport: number;
  dryRun: boolean;
  verbose: boolean;
  appToken: string | null;
  today: string;
}

export const DEFAULT_CONTRACT_CATEGORIES = ['V1.43', 'V1.8111', 'V1.8116'];

export function resolveOptions(
  partial: Partial<ScrapeOptions> & Pick<ScrapeOptions, 'dbPath' | 'exportDir'>,
): ScrapeOptions {
  const today = partial.today ?? todayISO();
  return {
    export: true,
    closingWindowDays: 30,
    since: null,
    publishedFrom: null,
    publishedTo: null,
    departments: [],
    keywords: [],
    modalities: [],
    categories: [],
    includeDrafts: true,
    contracts: true,
    contractsMonths: 24,
    contractsCategories: DEFAULT_CONTRACT_CATEGORIES,
    contractsKeywords: [],
    refreshGeo: false,
    pageSize: 10_000,
    exportWindowDays: 45,
    maxExport: 60_000,
    maxContractsExport: 40_000,
    dryRun: false,
    verbose: false,
    appToken: null,
    ...partial,
    today,
  };
}

export function closingSince(o: ScrapeOptions): string {
  return addDays(o.today, -o.closingWindowDays);
}

export function contractsSince(o: ScrapeOptions): string {
  const [y, m, d] = o.today.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1));
  dt.setUTCMonth(dt.getUTCMonth() - o.contractsMonths);
  return dt.toISOString().slice(0, 10);
}
