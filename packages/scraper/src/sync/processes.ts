import {
  dedupeOpportunities,
  normalizeProcess,
  type Opportunity,
  type RawProcesoRow,
} from '@secop-radar/core';
import {
  PROCESOS,
  procesoRowSchema,
  procesosQuery,
  type ProcesosFilter,
  type SocrataClient,
} from '@secop-radar/secop-client';
import type { LocalStore } from '../db/database';
import { logger } from '../logger';
import { closingSince, type ScrapeOptions } from '../options';

export interface PassSummary {
  name: string;
  fetched: number;
  dropped: number;
  dropReasons: Record<string, number>;
  repaired: number;
  repairReasons: Record<string, number>;
  duplicates: number;
  /** Unique rows that still have no usable SECOP link after merging duplicates. */
  withoutUrl: number;
  inserted: number;
  updated: number;
  unchanged: number;
  elapsedMs: number;
}

const DRAFT_STATUSES = ['Borrador', 'En aprobación', 'Aprobado'];

function baseFilter(o: ScrapeOptions): ProcesosFilter {
  return {
    departments: o.departments,
    keywords: o.keywords,
    modalities: o.modalities,
    categoryPrefixes: o.categories,
    excludeStatuses: o.includeDrafts ? [] : DRAFT_STATUSES,
  };
}

/** The list of fetch passes implied by the options. */
export function buildProcessPasses(
  o: ScrapeOptions,
): Array<{ name: string; filter: ProcesosFilter }> {
  const passes: Array<{ name: string; filter: ProcesosFilter }> = [];
  const base = baseFilter(o);
  if (o.publishedFrom || o.publishedTo) {
    passes.push({
      name: `published ${o.publishedFrom ?? '…'} → ${o.publishedTo ?? '…'}`,
      filter: { ...base, publishedFrom: o.publishedFrom, publishedTo: o.publishedTo },
    });
  } else {
    passes.push({
      name: `closing since ${closingSince(o)} (${o.closingWindowDays}d window)`,
      filter: { ...base, closingSince: closingSince(o) },
    });
  }
  if (o.since) {
    passes.push({ name: `updated since ${o.since}`, filter: { ...base, updatedSince: o.since } });
  }
  return passes;
}

/**
 * Merge a freshly fetched row with what is already stored. The API is the source of
 * truth for current state; the stored copy only fills gaps (notably a usable URL that
 * a later snapshot replaced with the login page).
 */
export function reconcileWithStored(existing: Opportunity, incoming: Opportunity): Opportunity {
  const merged: Opportunity = { ...incoming };
  if (incoming.urlStatus !== 'ok' && existing.urlStatus === 'ok') {
    merged.url = existing.url;
    merged.urlStatus = existing.urlStatus;
  }
  if (merged.phase == null) merged.phase = existing.phase;
  if (merged.publishedAt == null) merged.publishedAt = existing.publishedAt;
  if (merged.portfolioId == null) merged.portfolioId = existing.portfolioId;
  if (merged.reference == null) merged.reference = existing.reference;
  if (merged.value == null) merged.value = existing.value;
  if (merged.description.length < existing.description.length)
    merged.description = existing.description;
  if (merged.entity.city == null && existing.entity.city != null) {
    merged.entity = { ...merged.entity, city: existing.entity.city };
  }
  return merged;
}

/** Normalise + dedupe a batch of raw rows, collecting drop/repair statistics. */
export function cleanProcessRows(rows: readonly RawProcesoRow[]): {
  items: Opportunity[];
  dropped: number;
  dropReasons: Record<string, number>;
  repaired: number;
  repairReasons: Record<string, number>;
  duplicates: number;
} {
  const dropReasons: Record<string, number> = {};
  const repairReasons: Record<string, number> = {};
  let dropped = 0;
  let repaired = 0;
  const ok: Opportunity[] = [];
  for (const raw of rows) {
    const r = normalizeProcess(raw);
    if (!r.ok) {
      dropped += 1;
      dropReasons[r.reason] = (dropReasons[r.reason] ?? 0) + 1;
      continue;
    }
    if (r.repairs.length) {
      repaired += 1;
      for (const rep of r.repairs) {
        const key = rep.startsWith('unknown-department') ? 'unknown-department' : rep;
        repairReasons[key] = (repairReasons[key] ?? 0) + 1;
      }
    }
    ok.push(r.value);
  }
  const { items, duplicates } = dedupeOpportunities(ok);
  return { items, dropped, dropReasons, repaired, repairReasons, duplicates };
}

export async function syncProcesses(
  client: SocrataClient,
  store: LocalStore,
  o: ScrapeOptions,
): Promise<PassSummary[]> {
  const summaries: PassSummary[] = [];
  for (const pass of buildProcessPasses(o)) {
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    logger.start(`Procesos — ${pass.name}`);
    const query = procesosQuery(pass.filter);
    logger.debug(`SoQL: ${query.toString()}`);

    const raw: RawProcesoRow[] = [];
    try {
      for await (const page of client.paginate(PROCESOS.id, query, procesoRowSchema, {
        pageSize: o.pageSize,
        onPage: (p) => logger.info(`  page ${p.page}: ${p.rows} rows (${p.elapsedMs} ms)`),
      })) {
        raw.push(...page);
      }
    } catch (e) {
      store.recordRun(
        {
          dataset: PROCESOS.id,
          args: pass,
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

    const cleaned = cleanProcessRows(raw);
    let counts = { inserted: 0, updated: 0, unchanged: 0 };
    if (!o.dryRun) {
      counts = store.upsertProcesses(cleaned.items, new Date().toISOString(), reconcileWithStored);
    }
    const summary: PassSummary = {
      name: pass.name,
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
    summaries.push(summary);
    if (!o.dryRun) {
      store.recordRun({ dataset: PROCESOS.id, args: pass, ...summary, error: null }, startedAt);
      const watermark = store.maxProcessLastPublished();
      if (watermark) store.setState('processes.watermark', watermark);
    }
    logger.success(
      `  ${summary.fetched} rows → ${cleaned.items.length} unique (${summary.duplicates} dup, ${summary.dropped} dropped, ${summary.repaired} repaired, ${summary.withoutUrl} sin enlace) → +${counts.inserted} / ~${counts.updated} / =${counts.unchanged}`,
    );
  }
  return summaries;
}
