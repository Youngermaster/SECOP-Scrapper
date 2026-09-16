import {
  applyFilters,
  countBy,
  sortOpportunities,
  type FilterState,
  type ScoredOpportunity,
} from '@secop-radar/core';
import { useMemo } from 'react';
import { useDataset } from '@/data/DatasetProvider';
import { searchIds } from '@/data/search';
import { useFilters } from '@/stores/filters';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

export interface FilteredResult {
  items: ScoredOpportunity[];
  total: number;
  filters: FilterState;
  /** Facet counts computed with every filter applied except the facet itself. */
  facets: {
    departments: Map<string, number>;
    cities: Map<string, number>;
    modalities: Map<string, number>;
    lifecycles: Map<string, number>;
    segments: Map<string, number>;
    contractTypes: Map<string, number>;
  };
}

function toMap(rows: Array<{ key: string; count: number }>): Map<string, number> {
  return new Map(rows.map((r) => [r.key, r.count]));
}

export function useFilteredOpportunities(): FilteredResult {
  const { scored, searchIndex } = useDataset();
  const filters = useFilters((s) => s.filters);
  const query = useDebouncedValue(filters.query, 150);

  const matchedIds = useMemo(() => searchIds(searchIndex, query), [searchIndex, query]);
  const ctx = useMemo(() => ({ matchedIds }), [matchedIds]);

  const items = useMemo(() => {
    const filtered = applyFilters(scored, filters, ctx);
    return sortOpportunities(filtered, filters.sortKey, filters.sortDir);
  }, [scored, filters, ctx]);

  const facets = useMemo(() => {
    const without = <K extends keyof FilterState>(key: K, empty: FilterState[K]) =>
      applyFilters(scored, { ...filters, [key]: empty }, ctx);
    const depts = without('departments', []);
    return {
      departments: toMap(countBy(depts, (x) => x.opportunity.entity.departmentCode)),
      cities: toMap(countBy(without('cities', []), (x) => x.opportunity.entity.city)),
      modalities: toMap(countBy(without('modalities', []), (x) => x.opportunity.modality)),
      lifecycles: toMap(countBy(without('lifecycles', []), (x) => x.lifecycle)),
      segments: toMap(countBy(without('segments', []), (x) => x.opportunity.unspscSegment)),
      contractTypes: toMap(
        countBy(without('contractTypes', []), (x) => x.opportunity.contractType),
      ),
    };
  }, [scored, filters, ctx]);

  return { items, total: scored.length, filters, facets };
}
