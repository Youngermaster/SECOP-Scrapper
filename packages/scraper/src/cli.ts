#!/usr/bin/env tsx
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Command, InvalidArgumentError } from 'commander';
import { config as loadEnv } from 'dotenv';
import { parseSocrataDate } from '@secop-radar/core';
import { stripLeadingDoubleDash } from './args';
import { logger } from './logger';
import { DEFAULT_CONTRACT_CATEGORIES, resolveOptions } from './options';
import { defaultDbPath, defaultExportDir, findRepoRoot } from './paths';
import { runScrape } from './run';

const root = findRepoRoot();
const envFile = path.join(root, '.env');
if (existsSync(envFile)) loadEnv({ path: envFile, quiet: true });

function isoDate(value: string): string {
  const parsed = parseSocrataDate(value);
  if (!parsed) throw new InvalidArgumentError(`Expected a date like 2026-09-01, got "${value}"`);
  return parsed;
}

function positiveInt(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0)
    throw new InvalidArgumentError(`Expected a positive integer, got "${value}"`);
  return n;
}

function collect(value: string, previous: string[] = []): string[] {
  return [
    ...previous,
    ...value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ];
}

const program = new Command()
  .name('secop-radar-scraper')
  .description(
    'Pull SECOP II processes/contracts from datos.gov.co into a local SQLite store and export JSON for the web app.',
  )
  .option('--db <path>', 'SQLite file', process.env.SECOP_RADAR_DB ?? defaultDbPath(root))
  .option(
    '--export-dir <path>',
    'where to write JSON artifacts',
    process.env.SECOP_RADAR_EXPORT_DIR ?? defaultExportDir(root),
  )
  .option('--no-export', 'skip writing JSON artifacts')
  .option(
    '--closing-window <days>',
    'fetch processes closing on/after today minus N days',
    positiveInt,
    30,
  )
  .option(
    '--since <date>',
    'also fetch processes whose last publication date is on/after this date',
    isoDate,
  )
  .option(
    '--published-from <date>',
    'fetch by publication date range instead of the closing window',
    isoDate,
  )
  .option('--published-to <date>', 'end of the publication date range', isoDate)
  .option(
    '-d, --department <name>',
    'department name as SECOP spells it (repeatable / comma-separated)',
    collect,
    [],
  )
  .option(
    '-k, --keyword <text>',
    'server-side keyword filter on title/description (repeatable)',
    collect,
    [],
  )
  .option('-m, --modality <name>', 'raw modality name (repeatable)', collect, [])
  .option('-c, --category <prefix>', 'UNSPSC prefix such as V1.43 (repeatable)', collect, [])
  .option('--no-drafts', 'exclude Borrador / En aprobación / Aprobado rows')
  .option('--no-contracts', 'skip the contracts dataset')
  .option('--contracts-months <n>', 'months of contract history to fetch', positiveInt, 24)
  .option('--contracts-category <prefix>', 'UNSPSC prefix for contracts (repeatable)', collect, [])
  .option('--contracts-keyword <text>', 'keyword filter for contracts (repeatable)', collect, [])
  .option('--refresh-geo', 'force re-download of DIVIPOLA geo tables')
  .option('--page-size <n>', 'rows per API page', positiveInt, 10_000)
  .option(
    '--export-window <days>',
    'export processes closing on/after today minus N days',
    positiveInt,
    45,
  )
  .option('--max-export <n>', 'max processes in the export', positiveInt, 60_000)
  .option('--dry-run', 'fetch and clean but do not write the database or artifacts')
  .option('-v, --verbose', 'debug logging (prints SoQL)')
  .addHelpText(
    'after',
    `
Examples:
  pnpm scraper                                   # default: open + recently closed processes, 24 months of IT contracts
  pnpm scraper --since 2026-09-01                # also everything updated since Sept 1
  pnpm scraper -d Antioquia -d "Valle del Cauca" # only two departments
  pnpm scraper -k software -k "aplicación"       # server-side keyword filter
  pnpm scraper --published-from 2026-06-01 --published-to 2026-06-30 --no-contracts
  pnpm scraper --dry-run -v                      # inspect what would be fetched

Environment:
  SOCRATA_APP_TOKEN       free app token (recommended; see README)
  SECOP_RADAR_DB          SQLite path (default data/secop-radar.db)
  SECOP_RADAR_EXPORT_DIR  export dir (default apps/web/public/data)
`,
  );

program.parse(stripLeadingDoubleDash(process.argv));

const flags = program.opts<{
  db: string;
  exportDir: string;
  export: boolean;
  closingWindow: number;
  since?: string;
  publishedFrom?: string;
  publishedTo?: string;
  department: string[];
  keyword: string[];
  modality: string[];
  category: string[];
  drafts: boolean;
  contracts: boolean;
  contractsMonths: number;
  contractsCategory: string[];
  contractsKeyword: string[];
  refreshGeo?: boolean;
  pageSize: number;
  exportWindow: number;
  maxExport: number;
  dryRun?: boolean;
  verbose?: boolean;
}>();

const options = resolveOptions({
  dbPath: path.resolve(root, flags.db),
  exportDir: path.resolve(root, flags.exportDir),
  export: flags.export,
  closingWindowDays: flags.closingWindow,
  since: flags.since ?? null,
  publishedFrom: flags.publishedFrom ?? null,
  publishedTo: flags.publishedTo ?? null,
  departments: flags.department,
  keywords: flags.keyword,
  modalities: flags.modality,
  categories: flags.category,
  includeDrafts: flags.drafts,
  contracts: flags.contracts,
  contractsMonths: flags.contractsMonths,
  contractsCategories: flags.contractsCategory.length
    ? flags.contractsCategory
    : DEFAULT_CONTRACT_CATEGORIES,
  contractsKeywords: flags.contractsKeyword,
  refreshGeo: Boolean(flags.refreshGeo),
  pageSize: flags.pageSize,
  exportWindowDays: flags.exportWindow,
  maxExport: flags.maxExport,
  dryRun: Boolean(flags.dryRun),
  verbose: Boolean(flags.verbose),
  appToken: process.env.SOCRATA_APP_TOKEN ?? null,
});

try {
  await runScrape(options);
} catch (e) {
  logger.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
}
