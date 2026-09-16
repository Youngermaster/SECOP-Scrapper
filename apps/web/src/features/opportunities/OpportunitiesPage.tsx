import {
  countActiveFilters,
  DEFAULT_FILTERS,
  DEPARTMENTS,
  LIFECYCLE_LABELS,
  MODALITY_LABELS,
  type SortKey,
} from '@secop-radar/core';
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@secop-radar/ui';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/i18n/es';
import { useFilters } from '@/stores/filters';
import { FilterPanel } from './FilterPanel';
import { OpportunityTable } from './OpportunityTable';
import { useFilteredOpportunities } from './useFilteredOpportunities';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'score', label: 'Puntaje' },
  { value: 'closesAt', label: 'Fecha de cierre' },
  { value: 'publishedAt', label: 'Fecha de publicación' },
  { value: 'value', label: 'Valor' },
  { value: 'entity', label: 'Entidad' },
  { value: 'title', label: 'Título' },
];

export function OpportunitiesPage() {
  const { items, total, filters, facets } = useFilteredOpportunities();
  const set = useFilters((s) => s.set);
  const reset = useFilters((s) => s.reset);
  const toggleIn = useFilters((s) => s.toggleIn);
  const [panelOpen, setPanelOpen] = useState(false);
  const active = countActiveFilters(filters);

  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  if (filters.regionMode !== 'all')
    chips.push({
      key: 'region',
      label: filters.regionMode === 'only-mine' ? 'Mi región' : 'Fuera de mi región',
      onRemove: () => set({ regionMode: 'all' }),
    });
  for (const d of filters.departments)
    chips.push({
      key: `d-${d}`,
      label: DEPARTMENTS.find((x) => x.code === d)?.name ?? d,
      onRemove: () => toggleIn('departments', d),
    });
  for (const c of filters.cities)
    chips.push({ key: `c-${c}`, label: c, onRemove: () => toggleIn('cities', c) });
  for (const m of filters.modalities)
    chips.push({
      key: `m-${m}`,
      label: MODALITY_LABELS[m],
      onRemove: () => toggleIn('modalities', m),
    });
  if (filters.lifecycles.join() !== DEFAULT_FILTERS.lifecycles.join())
    chips.push({
      key: 'life',
      label: `Estado: ${filters.lifecycles.map((l) => LIFECYCLE_LABELS[l]).join(', ') || 'todos'}`,
      onRemove: () => set({ lifecycles: DEFAULT_FILTERS.lifecycles }),
    });
  if (filters.rup !== 'any')
    chips.push({
      key: 'rup',
      label: `RUP: ${filters.rup === 'required' ? 'requerido' : 'sin RUP'}`,
      onRemove: () => set({ rup: 'any' }),
    });
  if (filters.valueMin != null || filters.valueMax != null)
    chips.push({
      key: 'value',
      label:
        `Valor ${filters.valueMin != null ? `≥ ${filters.valueMin / 1e6} M` : ''} ${filters.valueMax != null ? `≤ ${filters.valueMax / 1e6} M` : ''}`.trim(),
      onRemove: () => set({ valueMin: null, valueMax: null }),
    });
  if (filters.minScore > 0)
    chips.push({
      key: 'score',
      label: `Puntaje ≥ ${filters.minScore}`,
      onRemove: () => set({ minScore: 0 }),
    });
  if (filters.publishedFrom || filters.publishedTo)
    chips.push({
      key: 'pub',
      label: 'Publicación',
      onRemove: () => set({ publishedFrom: null, publishedTo: null }),
    });
  if (filters.closesFrom || filters.closesTo)
    chips.push({
      key: 'close',
      label: 'Cierre',
      onRemove: () => set({ closesFrom: null, closesTo: null }),
    });
  for (const s of filters.segments)
    chips.push({ key: `s-${s}`, label: `UNSPSC ${s}`, onRemove: () => toggleIn('segments', s) });
  for (const c of filters.contractTypes)
    chips.push({ key: `t-${c}`, label: c, onRemove: () => toggleIn('contractTypes', c) });
  if (filters.onlyWithUrl)
    chips.push({ key: 'url', label: 'Con enlace', onRemove: () => set({ onlyWithUrl: false }) });
  if (filters.onlyCompetitive)
    chips.push({
      key: 'comp',
      label: 'Competitivos',
      onRemove: () => set({ onlyCompetitive: false }),
    });

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-2.5 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-fg" />
            <Input
              type="search"
              value={filters.query}
              onChange={(e) => set({ query: e.target.value })}
              placeholder="Buscar: software, aplicación, robótica, prestación de servicios"
              aria-label="Buscar oportunidades"
              className="h-9 pl-8 text-sm md:text-[13px]"
            />
          </div>
          <Select value={filters.sortKey} onValueChange={(v) => set({ sortKey: v as SortKey })}>
            <SelectTrigger className="h-9 w-44" aria-label="Ordenar por">
              <span className="text-muted-fg">Orden:&nbsp;</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            aria-label={filters.sortDir === 'desc' ? 'Orden descendente' : 'Orden ascendente'}
            onClick={() => set({ sortDir: filters.sortDir === 'desc' ? 'asc' : 'desc' })}
          >
            {filters.sortDir === 'desc' ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
          </Button>
          <Button
            variant="outline"
            className="h-9 md:hidden"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
          >
            <SlidersHorizontal /> Filtros{' '}
            {active > 0 ? (
              <Badge tone="primary" className="font-mono">
                {active}
              </Badge>
            ) : null}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-fg">
          <span className="mr-1 font-mono tabular-nums">
            <strong className="font-semibold text-fg">{t.common.results(items.length)}</strong>{' '}
            {t.common.of} {total.toLocaleString('es-CO')}
          </span>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onRemove}
              className="inline-flex h-5 cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-1.5 text-2xs text-fg-2 transition-colors hover:border-border-strong hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Quitar filtro ${c.label}`}
            >
              {c.label}
              <X className="size-3" />
            </button>
          ))}
          {active > 0 ? (
            <Button variant="link" size="sm" className="h-auto px-1 text-xs" onClick={reset}>
              Limpiar todo
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside
          className={`${panelOpen ? 'block' : 'hidden'} w-full shrink-0 scrollbar-thin overflow-y-auto border-r border-border bg-sidebar/60 px-4 py-4 md:block md:w-[272px]`}
          aria-label="Filtros"
        >
          <FilterPanel facets={facets} />
        </aside>
        <div className={`${panelOpen ? 'hidden md:block' : 'block'} min-w-0 flex-1`}>
          <OpportunityTable items={items} />
        </div>
      </div>
    </div>
  );
}
