import { normalizeKey, normalizeText } from './normalize/text';
import type { Contract, Modality, Opportunity } from './types';

export interface ValueStats {
  count: number;
  withValue: number;
  total: number;
  mean: number | null;
  median: number | null;
  p25: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
}

function quantile(sorted: readonly number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? a;
  return a + (b - a) * (pos - lo);
}

export function valueStats(values: ReadonlyArray<number | null>): ValueStats {
  const nums = values
    .filter((v): v is number => v != null && Number.isFinite(v))
    .sort((a, b) => a - b);
  const total = nums.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    withValue: nums.length,
    total,
    mean: nums.length ? total / nums.length : null,
    median: quantile(nums, 0.5),
    p25: quantile(nums, 0.25),
    p75: quantile(nums, 0.75),
    min: nums[0] ?? null,
    max: nums[nums.length - 1] ?? null,
  };
}

export interface RankedRow {
  key: string;
  label: string;
  count: number;
  total: number;
  /** Secondary attribute (e.g. PYME share for suppliers, department for entities). */
  extra: string | null;
}

export function topSuppliers(contracts: readonly Contract[], limit = 15): RankedRow[] {
  const m = new Map<string, RankedRow & { pyme: number }>();
  for (const c of contracts) {
    const name = c.supplier.name;
    if (name == null) continue;
    const key = c.supplier.doc ?? normalizeKey(name);
    const row = m.get(key) ?? { key, label: name, count: 0, total: 0, extra: null, pyme: 0 };
    row.count += 1;
    row.total += c.value ?? 0;
    if (c.supplier.isPyme) row.pyme += 1;
    m.set(key, row);
  }
  return [...m.values()]
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .slice(0, limit)
    .map(({ pyme, ...row }) => ({ ...row, extra: pyme > 0 ? 'PYME' : null }));
}

export function topEntities(contracts: readonly Contract[], limit = 15): RankedRow[] {
  const m = new Map<string, RankedRow>();
  for (const c of contracts) {
    const key = c.entity.nit ?? normalizeKey(c.entity.name);
    const row = m.get(key) ?? {
      key,
      label: c.entity.name,
      count: 0,
      total: 0,
      extra: c.entity.department,
    };
    row.count += 1;
    row.total += c.value ?? 0;
    m.set(key, row);
  }
  return [...m.values()].sort((a, b) => b.count - a.count || b.total - a.total).slice(0, limit);
}

export interface EntityHistory {
  nit: string | null;
  name: string;
  contracts: number;
  stats: ValueStats;
  pymeShare: number | null;
  topSuppliers: RankedRow[];
  modalityMix: Array<{ modality: Modality; count: number }>;
  recent: Contract[];
}

/** Everything the contracts dataset tells us about one contracting entity. */
export function entityHistory(
  contracts: readonly Contract[],
  entity: Pick<Opportunity['entity'], 'nit' | 'name'>,
  limit = 8,
): EntityHistory {
  const nameKey = normalizeKey(entity.name);
  const own = contracts.filter((c) =>
    entity.nit != null && c.entity.nit != null
      ? c.entity.nit === entity.nit
      : normalizeKey(c.entity.name) === nameKey,
  );
  const pymeKnown = own.filter((c) => c.supplier.isPyme != null);
  const mix = new Map<Modality, number>();
  for (const c of own) mix.set(c.modality, (mix.get(c.modality) ?? 0) + 1);
  return {
    nit: entity.nit,
    name: entity.name,
    contracts: own.length,
    stats: valueStats(own.map((c) => c.value)),
    pymeShare: pymeKnown.length
      ? pymeKnown.filter((c) => c.supplier.isPyme).length / pymeKnown.length
      : null,
    topSuppliers: topSuppliers(own, 5),
    modalityMix: [...mix.entries()]
      .map(([modality, count]) => ({ modality, count }))
      .sort((a, b) => b.count - a.count),
    recent: [...own]
      .sort((a, b) => (b.signedAt ?? '').localeCompare(a.signedAt ?? ''))
      .slice(0, limit),
  };
}

/** Contracts that belong to the same purchase process (portfolio id). */
export function contractsForPortfolio(
  contracts: readonly Contract[],
  portfolioId: string | null,
): Contract[] {
  if (portfolioId == null) return [];
  return contracts.filter((c) => c.processPortfolioId === portfolioId);
}

/**
 * Contracts similar to an opportunity: same UNSPSC family, or same segment plus a
 * shared significant word in the object text.
 */
export function similarContracts(
  contracts: readonly Contract[],
  o: Opportunity,
  limit = 10,
): Contract[] {
  const words = new Set(
    normalizeText(o.title)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 6),
  );
  const scored: Array<{ c: Contract; s: number }> = [];
  for (const c of contracts) {
    let s = 0;
    if (o.unspscFamily != null && c.unspscFamily === o.unspscFamily) s += 3;
    else if (o.unspscSegment != null && c.unspscSegment === o.unspscSegment) s += 1;
    if (words.size > 0) {
      const cw = c.searchText.split(/[^a-z0-9]+/);
      let hits = 0;
      for (const w of cw) if (words.has(w)) hits++;
      s += Math.min(hits, 4) * 0.5;
    }
    if (o.entity.nit != null && c.entity.nit === o.entity.nit) s += 1;
    if (s >= 2) scored.push({ c, s });
  }
  return scored
    .sort((a, b) => b.s - a.s || (b.c.signedAt ?? '').localeCompare(a.c.signedAt ?? ''))
    .slice(0, limit)
    .map((x) => x.c);
}
