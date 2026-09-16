import { z } from 'zod';
import type { ScoredOpportunity } from './enrich';
import { LIFECYCLES } from './lifecycle';
import { MODALITIES } from './constants/modalities';
import { normalizeKey } from './normalize/text';
import type { RupRequirement } from './rup';
import type { Lifecycle, Modality } from './types';

export const regionModeSchema = z.enum(['all', 'only-mine', 'exclude-mine']);
export type RegionMode = z.infer<typeof regionModeSchema>;

export const rupFilterSchema = z.enum([
  'any',
  'not-required',
  'not-or-likely',
  'required',
  'unknown',
]);
export type RupFilter = z.infer<typeof rupFilterSchema>;

export const profileMatchSchema = z.enum(['any', 'keywords', 'keywords-or-category']);
export type ProfileMatch = z.infer<typeof profileMatchSchema>;

export const sortKeySchema = z.enum([
  'score',
  'closesAt',
  'publishedAt',
  'value',
  'entity',
  'title',
]);
export type SortKey = z.infer<typeof sortKeySchema>;

export const filterStateSchema = z.object({
  query: z.string().default(''),
  regionMode: regionModeSchema.default('all'),
  /** DANE department codes. Empty = all. */
  departments: z.array(z.string()).default([]),
  /** City names (as displayed). Empty = all. */
  cities: z.array(z.string()).default([]),
  valueMin: z.number().nullable().default(null),
  valueMax: z.number().nullable().default(null),
  includeUnknownValue: z.boolean().default(true),
  modalities: z.array(z.enum(MODALITIES as unknown as [Modality, ...Modality[]])).default([]),
  lifecycles: z
    .array(z.enum(LIFECYCLES as unknown as [Lifecycle, ...Lifecycle[]]))
    .default(['open']),
  rup: rupFilterSchema.default('any'),
  publishedFrom: z.string().nullable().default(null),
  publishedTo: z.string().nullable().default(null),
  closesFrom: z.string().nullable().default(null),
  closesTo: z.string().nullable().default(null),
  minScore: z.number().min(0).max(100).default(0),
  /** UNSPSC 2-digit segments. Empty = all. */
  segments: z.array(z.string()).default([]),
  contractTypes: z.array(z.string()).default([]),
  onlyWithUrl: z.boolean().default(false),
  onlyCompetitive: z.boolean().default(false),
  /** Require the opportunity to match the user's profile (keywords and/or tech UNSPSC category). */
  profileMatch: profileMatchSchema.default('any'),
  sortKey: sortKeySchema.default('score'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type FilterState = z.infer<typeof filterStateSchema>;

export const DEFAULT_FILTERS: FilterState = filterStateSchema.parse({});

export interface FilterContext {
  /** Ids matched by the full-text engine for `query`; null = no text filtering. */
  matchedIds: ReadonlySet<string> | null;
}

const RUP_MATCH: Record<RupFilter, (r: RupRequirement) => boolean> = {
  any: () => true,
  'not-required': (r) => r === 'not-required',
  'not-or-likely': (r) =>
    r === 'not-required' || r === 'likely-not-required' || r === 'not-applicable',
  required: (r) => r === 'required',
  unknown: (r) => r === 'unknown',
};

const COMPETITIVE = new Set([
  'licitacion-publica',
  'licitacion-obra',
  'acuerdo-marco',
  'seleccion-abreviada-menor-cuantia',
  'subasta-inversa',
  'concurso-meritos',
  'minima-cuantia',
]);

/** Pure predicate: does one scored opportunity pass the filter state? */
export function matchesFilters(
  item: ScoredOpportunity,
  f: FilterState,
  ctx: FilterContext,
): boolean {
  const o = item.opportunity;
  if (ctx.matchedIds != null && !ctx.matchedIds.has(o.id)) return false;
  if (f.regionMode === 'only-mine' && !item.isMyRegion) return false;
  if (f.regionMode === 'exclude-mine' && item.isMyRegion) return false;
  if (f.departments.length > 0) {
    if (o.entity.departmentCode == null || !f.departments.includes(o.entity.departmentCode))
      return false;
  }
  if (f.cities.length > 0) {
    if (o.entity.city == null) return false;
    const key = normalizeKey(o.entity.city);
    if (!f.cities.some((c) => normalizeKey(c) === key)) return false;
  }
  if (o.value == null) {
    if (!f.includeUnknownValue && (f.valueMin != null || f.valueMax != null)) return false;
  } else {
    if (f.valueMin != null && o.value < f.valueMin) return false;
    if (f.valueMax != null && o.value > f.valueMax) return false;
  }
  if (f.modalities.length > 0 && !f.modalities.includes(o.modality)) return false;
  if (f.lifecycles.length > 0 && !f.lifecycles.includes(item.lifecycle)) return false;
  if (!RUP_MATCH[f.rup](item.rup.requirement)) return false;
  if (f.publishedFrom != null && (o.publishedAt == null || o.publishedAt < f.publishedFrom))
    return false;
  if (f.publishedTo != null && (o.publishedAt == null || o.publishedAt > f.publishedTo))
    return false;
  if (f.closesFrom != null && (o.closesAt == null || o.closesAt < f.closesFrom)) return false;
  if (f.closesTo != null && (o.closesAt == null || o.closesAt > f.closesTo)) return false;
  if (f.minScore > 0 && item.score.score < f.minScore) return false;
  if (f.segments.length > 0) {
    if (o.unspscSegment == null || !f.segments.includes(o.unspscSegment)) return false;
  }
  if (f.contractTypes.length > 0) {
    if (o.contractType == null || !f.contractTypes.includes(o.contractType)) return false;
  }
  if (f.onlyWithUrl && o.urlStatus !== 'ok') return false;
  if (f.onlyCompetitive && !COMPETITIVE.has(o.modality)) return false;
  if (f.profileMatch !== 'any') {
    const hasKeywords = item.score.matchedKeywords.length > 0;
    const techCategory = item.score.flags.includes('tech-category');
    if (f.profileMatch === 'keywords' && !hasKeywords) return false;
    if (f.profileMatch === 'keywords-or-category' && !hasKeywords && !techCategory) return false;
  }
  return true;
}

export function applyFilters(
  items: readonly ScoredOpportunity[],
  f: FilterState,
  ctx: FilterContext = { matchedIds: null },
): ScoredOpportunity[] {
  return items.filter((it) => matchesFilters(it, f, ctx));
}

function cmpNullable<T>(a: T | null, b: T | null, cmp: (x: T, y: T) => number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls last regardless of direction
  if (b == null) return -1;
  return cmp(a, b);
}

const strCmp = (a: string, b: string): number => a.localeCompare(b, 'es');
const numCmp = (a: number, b: number): number => a - b;

export function sortOpportunities(
  items: readonly ScoredOpportunity[],
  key: SortKey,
  dir: 'asc' | 'desc',
): ScoredOpportunity[] {
  const sign = dir === 'asc' ? 1 : -1;
  const sorted = [...items];
  sorted.sort((x, y) => {
    let c: number;
    switch (key) {
      case 'score':
        c = numCmp(x.score.score, y.score.score) * sign;
        break;
      case 'closesAt':
        c = cmpNullable(x.opportunity.closesAt, y.opportunity.closesAt, strCmp);
        if (x.opportunity.closesAt != null && y.opportunity.closesAt != null) c *= sign;
        break;
      case 'publishedAt':
        c = cmpNullable(x.opportunity.publishedAt, y.opportunity.publishedAt, strCmp);
        if (x.opportunity.publishedAt != null && y.opportunity.publishedAt != null) c *= sign;
        break;
      case 'value':
        c = cmpNullable(x.opportunity.value, y.opportunity.value, numCmp);
        if (x.opportunity.value != null && y.opportunity.value != null) c *= sign;
        break;
      case 'entity':
        c = strCmp(x.opportunity.entity.name, y.opportunity.entity.name) * sign;
        break;
      case 'title':
        c = strCmp(x.opportunity.title, y.opportunity.title) * sign;
        break;
    }
    // Stable tie-breaker: higher score, then id.
    if (c === 0) c = y.score.score - x.score.score;
    if (c === 0) c = x.opportunity.id.localeCompare(y.opportunity.id);
    return c;
  });
  return sorted;
}

/** Count of active (non-default) filters, for the UI badge. */
export function countActiveFilters(f: FilterState): number {
  let n = 0;
  if (f.query.trim() !== '') n++;
  if (f.regionMode !== 'all') n++;
  if (f.departments.length > 0) n++;
  if (f.cities.length > 0) n++;
  if (f.valueMin != null || f.valueMax != null) n++;
  if (f.modalities.length > 0) n++;
  if (f.lifecycles.length !== 1 || f.lifecycles[0] !== 'open') n++;
  if (f.rup !== 'any') n++;
  if (f.publishedFrom != null || f.publishedTo != null) n++;
  if (f.closesFrom != null || f.closesTo != null) n++;
  if (f.minScore > 0) n++;
  if (f.segments.length > 0) n++;
  if (f.contractTypes.length > 0) n++;
  if (f.onlyWithUrl) n++;
  if (f.onlyCompetitive) n++;
  if (f.profileMatch !== 'any') n++;
  return n;
}
