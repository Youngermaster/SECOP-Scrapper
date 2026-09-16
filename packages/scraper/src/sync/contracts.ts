import { normalizeContract, type Contract, type RawContratoRow } from '@secop-radar/core';
import {
  CONTRATOS,
  contratoRowSchema,
  contratosQuery,
  type ContratosFilter,
  type SocrataClient,
} from '@secop-radar/secop-client';
import type { LocalStore } from '../db/database';
import { logger } from '../logger';
import { contractsSince, type ScrapeOptions } from '../options';
import type { PassSummary } from './processes';

export function buildContractsFilter(o: ScrapeOptions): ContratosFilter {
  return {
    signedSince: contractsSince(o),
    departments: o.departments,
    keywords: o.contractsKeywords,
    categoryPrefixes: o.contractsCategories,
  };
}

export function cleanContractRows(rows: readonly RawContratoRow[]): {
  items: Contract[];
  dropped: number;
  dropReasons: Record<string, number>;
  repaired: number;
  repairReasons: Record<string, number>;
  duplicates: number;
} {
  const dropReasons: Record<string, number> = {};
  const repairReasons: Record<string, number> = {};
  const byId = new Map<string, Contract>();
  let dropped = 0;
  let repaired = 0;
  let duplicates = 0;
  for (const raw of rows) {
    const r = normalizeContract(raw);
    if (!r.ok) {
      dropped += 1;
      dropReasons[r.reason] = (dropReasons[r.reason] ?? 0) + 1;
      continue;
    }
    if (r.repairs.length) {
      repaired += 1;
      for (const rep of r.repairs) repairReasons[rep] = (repairReasons[rep] ?? 0) + 1;
    }
    if (byId.has(r.value.id)) duplicates += 1;
    byId.set(r.value.id, r.value);
  }
  return { items: [...byId.values()], dropped, dropReasons, repaired, repairReasons, duplicates };
}

export async function syncContracts(
  client: SocrataClient,
  store: LocalStore,
  o: ScrapeOptions,
): Promise<PassSummary | null> {
  if (!o.contracts) {
    logger.info('Contratos — skipped (--no-contracts)');
    return null;
  }
  const filter = buildContractsFilter(o);
  const name = `signed since ${filter.signedSince} · categories ${o.contractsCategories.join(',') || '—'}${o.contractsKeywords.length ? ` · keywords ${o.contractsKeywords.join(',')}` : ''}`;
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  logger.start(`Contratos — ${name}`);
  const query = contratosQuery(filter);
  logger.debug(`SoQL: ${query.toString()}`);

  const raw: RawContratoRow[] = [];
  try {
    for await (const page of client.paginate(CONTRATOS.id, query, contratoRowSchema, {
      pageSize: o.pageSize,
      onPage: (p) => logger.info(`  page ${p.page}: ${p.rows} rows (${p.elapsedMs} ms)`),
    })) {
      raw.push(...page);
    }
  } catch (e) {
    store.recordRun(
      {
        dataset: CONTRATOS.id,
        args: filter,
        fetched: raw.length,
        inserted: 0,
        updated: 0,
        unchanged: 0,
        dropped: 0,
        repaired: 0,
        duplicates: 0,
        error: String(e),
      },
      startedAt,
    );
    throw e;
  }
  const cleaned = cleanContractRows(raw);
  let counts = { inserted: 0, updated: 0, unchanged: 0 };
  if (!o.dryRun) counts = store.upsertContracts(cleaned.items, new Date().toISOString());
  const summary: PassSummary = {
    name,
    fetched: raw.length,
    dropped: cleaned.dropped,
    dropReasons: cleaned.dropReasons,
    repaired: cleaned.repaired,
    repairReasons: cleaned.repairReasons,
    duplicates: cleaned.duplicates,
    withoutUrl: cleaned.items.filter((i) => i.urlStatus !== 'ok').length,
    ...counts,
    elapsedMs: Date.now() - t0,
  };
  if (!o.dryRun)
    store.recordRun({ dataset: CONTRATOS.id, args: filter, ...summary, error: null }, startedAt);
  logger.success(
    `  ${summary.fetched} rows → ${cleaned.items.length} unique (${summary.dropped} dropped, ${summary.repaired} repaired) → +${counts.inserted} / ~${counts.updated} / =${counts.unchanged}`,
  );
  return summary;
}
