import {
  DEPARTMENTS,
  LIFECYCLE_LABELS,
  LIFECYCLES,
  MODALITIES,
  MODALITY_LABELS,
  UNSPSC_SEGMENT_LABELS,
  type FilterState,
  type Lifecycle,
  type Modality,
  type RupFilter,
} from '@secop-radar/core';
import { Button, Checkbox, Input, Label, Slider, Switch } from '@secop-radar/ui';
import { RotateCcw } from 'lucide-react';
import { Link } from 'react-router';
import { MultiSelect } from '@/components/MultiSelect';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useFilters } from '@/stores/filters';
import { useSettings } from '@/stores/settings';
import type { FilteredResult } from './useFilteredOpportunities';

const RUP_OPTIONS: Array<{ value: RupFilter; label: string }> = [
  { value: 'any', label: 'Cualquiera' },
  { value: 'not-required', label: 'Sin RUP' },
  { value: 'not-or-likely', label: 'Sin RUP o probable' },
  { value: 'required', label: 'Requiere RUP' },
];

const VALUE_PRESETS: Array<{ label: string; min: number | null; max: number | null }> = [
  { label: '< 50 M', min: null, max: 50_000_000 },
  { label: '50–300 M', min: 50_000_000, max: 300_000_000 },
  { label: '> 300 M', min: 300_000_000, max: null },
];

function millions(v: number | null): string {
  return v == null ? '' : String(v / 1_000_000);
}

function fromMillions(s: string): number | null {
  const n = Number(s.replace(',', '.'));
  return s.trim() === '' || !Number.isFinite(n) ? null : Math.round(n * 1_000_000);
}

function Section({
  title,
  children,
  hint,
}: {
  title: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-muted-fg uppercase">{title}</h3>
        {hint}
      </div>
      {children}
    </section>
  );
}

export function FilterPanel({ facets }: { facets: FilteredResult['facets'] }) {
  const filters = useFilters((s) => s.filters);
  const set = useFilters((s) => s.set);
  const toggleIn = useFilters((s) => s.toggleIn);
  const reset = useFilters((s) => s.reset);
  const region = useSettings((s) => s.region);
  const regionName =
    DEPARTMENTS.find((d) => d.code === region.departmentCode)?.name ?? region.departmentCode;

  const deptOptions = DEPARTMENTS.map((d) => ({
    value: d.code,
    label: d.name,
    count: facets.departments.get(d.code) ?? 0,
  })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'));
  const cityOptions = [...facets.cities.entries()]
    .filter(([k]) => k !== '—')
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
    .slice(0, 300);
  const segmentOptions = [...facets.segments.entries()]
    .filter(([k]) => k !== '—')
    .map(([value, count]) => ({
      value,
      label: `${value} · ${UNSPSC_SEGMENT_LABELS[value] ?? 'Otro'}`,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const contractTypeOptions = [...facets.contractTypes.entries()]
    .filter(([k]) => k !== '—')
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <Section
        title="Región"
        hint={
          <Link to="/ajustes" className="text-[11px] text-primary hover:underline">
            Mi región: {regionName}
          </Link>
        }
      >
        <SegmentedControl<FilterState['regionMode']>
          label="Región"
          value={filters.regionMode}
          onChange={(regionMode) => set({ regionMode })}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'only-mine', label: 'Mi región' },
            { value: 'exclude-mine', label: 'Fuera' },
          ]}
        />
        <MultiSelect
          label="Departamento"
          options={deptOptions}
          selected={filters.departments}
          onToggle={(v) => toggleIn('departments', v)}
          onClear={() => set({ departments: [] })}
        />
        <MultiSelect
          label="Ciudad"
          options={cityOptions}
          selected={filters.cities}
          onToggle={(v) => toggleIn('cities', v)}
          onClear={() => set({ cities: [] })}
          placeholder="Todas las ciudades"
        />
      </Section>

      <Section title="Estado">
        <ul className="space-y-1">
          {LIFECYCLES.map((l: Lifecycle) => {
            const checked = filters.lifecycles.includes(l);
            return (
              <li key={l}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={checked} onCheckedChange={() => toggleIn('lifecycles', l)} />
                  <span className="flex-1">{LIFECYCLE_LABELS[l]}</span>
                  <span className="tabular text-xs text-muted-fg">
                    {(facets.lifecycles.get(l) ?? 0).toLocaleString('es-CO')}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Valor estimado (millones COP)">
        <div className="flex items-center gap-2">
          <Input
            inputMode="decimal"
            placeholder="mín"
            aria-label="Valor mínimo en millones"
            value={millions(filters.valueMin)}
            onChange={(e) => set({ valueMin: fromMillions(e.target.value) })}
            className="h-8"
          />
          <span className="text-muted-fg">–</span>
          <Input
            inputMode="decimal"
            placeholder="máx"
            aria-label="Valor máximo en millones"
            value={millions(filters.valueMax)}
            onChange={(e) => set({ valueMax: fromMillions(e.target.value) })}
            className="h-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {VALUE_PRESETS.map((p) => {
            const active = filters.valueMin === p.min && filters.valueMax === p.max;
            return (
              <Button
                key={p.label}
                size="sm"
                variant={active ? 'secondary' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() =>
                  set(
                    active
                      ? { valueMin: null, valueMax: null }
                      : { valueMin: p.min, valueMax: p.max },
                  )
                }
              >
                {p.label}
              </Button>
            );
          })}
        </div>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span>Incluir sin valor informado</span>
          <Switch
            checked={filters.includeUnknownValue}
            onCheckedChange={(v) => set({ includeUnknownValue: v })}
            aria-label="Incluir sin valor informado"
          />
        </label>
      </Section>

      <Section title="Modalidad">
        <ul className="space-y-1">
          {MODALITIES.map((m: Modality) => (
            <li key={m}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={filters.modalities.includes(m)}
                  onCheckedChange={() => toggleIn('modalities', m)}
                />
                <span className="flex-1 truncate">{MODALITY_LABELS[m]}</span>
                <span className="tabular text-xs text-muted-fg">
                  {(facets.modalities.get(m) ?? 0).toLocaleString('es-CO')}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span>Solo procesos competitivos</span>
          <Switch
            checked={filters.onlyCompetitive}
            onCheckedChange={(v) => set({ onlyCompetitive: v })}
            aria-label="Solo procesos competitivos"
          />
        </label>
      </Section>

      <Section title="RUP (inferido)">
        <div className="grid grid-cols-2 gap-1">
          {RUP_OPTIONS.map((o) => (
            <Button
              key={o.value}
              size="sm"
              variant={filters.rup === o.value ? 'secondary' : 'outline'}
              className="h-7 justify-start px-2 text-xs"
              onClick={() => set({ rup: o.value })}
              aria-pressed={filters.rup === o.value}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </Section>

      <Section title="Fechas">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="f-pub-from">Publicado desde</Label>
            <Input
              id="f-pub-from"
              type="date"
              className="h-8"
              value={filters.publishedFrom ?? ''}
              onChange={(e) => set({ publishedFrom: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-pub-to">hasta</Label>
            <Input
              id="f-pub-to"
              type="date"
              className="h-8"
              value={filters.publishedTo ?? ''}
              onChange={(e) => set({ publishedTo: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-close-from">Cierra desde</Label>
            <Input
              id="f-close-from"
              type="date"
              className="h-8"
              value={filters.closesFrom ?? ''}
              onChange={(e) => set({ closesFrom: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-close-to">hasta</Label>
            <Input
              id="f-close-to"
              type="date"
              className="h-8"
              value={filters.closesTo ?? ''}
              onChange={(e) => set({ closesTo: e.target.value || null })}
            />
          </div>
        </div>
      </Section>

      <Section title={`Puntaje mínimo · ${filters.minScore}`}>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[filters.minScore]}
          onValueChange={([v]) => set({ minScore: v ?? 0 })}
          aria-label="Puntaje mínimo"
        />
      </Section>

      <Section title="Categoría y tipo">
        <MultiSelect
          label="Categoría UNSPSC"
          options={segmentOptions}
          selected={filters.segments}
          onToggle={(v) => toggleIn('segments', v)}
          onClear={() => set({ segments: [] })}
          placeholder="Todas las categorías"
        />
        <MultiSelect
          label="Tipo de contrato"
          options={contractTypeOptions}
          selected={filters.contractTypes}
          onToggle={(v) => toggleIn('contractTypes', v)}
          onClear={() => set({ contractTypes: [] })}
          placeholder="Todos los tipos"
        />
        <label className="flex items-center justify-between gap-2 text-sm">
          <span>Solo con enlace a SECOP</span>
          <Switch
            checked={filters.onlyWithUrl}
            onCheckedChange={(v) => set({ onlyWithUrl: v })}
            aria-label="Solo con enlace a SECOP"
          />
        </label>
      </Section>

      <Button variant="outline" className="w-full" onClick={reset}>
        <RotateCcw /> Restablecer filtros
      </Button>
    </div>
  );
}
