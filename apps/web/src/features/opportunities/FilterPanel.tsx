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
import { Button, Checkbox, cn, Input, Label, Slider, Switch } from '@secop-radar/ui';
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
  { label: '50-300 M', min: 50_000_000, max: 300_000_000 },
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
    <section className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold text-fg">{title}</h3>
        {hint}
      </div>
      {children}
    </section>
  );
}

function CheckRow({
  checked,
  onToggle,
  label,
  count,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  count: number;
}) {
  return (
    <label
      className={cn(
        'flex h-7 cursor-pointer items-center gap-2 rounded-sm px-1 text-[13px] hover:bg-muted/70',
        count === 0 && !checked && 'text-muted-fg',
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="flex-1 truncate">{label}</span>
      <span className="font-mono text-2xs text-muted-fg tabular-nums">
        {count.toLocaleString('es-CO')}
      </span>
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-0.5 text-[13px]">
      <span>
        {label}
        {hint ? <span className="block text-2xs text-muted-fg">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
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
    <div className="space-y-4">
      <Section
        title="Región"
        hint={
          <Link to="/ajustes" className="text-2xs text-primary hover:underline">
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
        <ul>
          {LIFECYCLES.map((l: Lifecycle) => (
            <li key={l}>
              <CheckRow
                checked={filters.lifecycles.includes(l)}
                onToggle={() => toggleIn('lifecycles', l)}
                label={LIFECYCLE_LABELS[l]}
                count={facets.lifecycles.get(l) ?? 0}
              />
            </li>
          ))}
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
            className="h-7 font-mono"
          />
          <span className="text-muted-fg">-</span>
          <Input
            inputMode="decimal"
            placeholder="máx"
            aria-label="Valor máximo en millones"
            value={millions(filters.valueMax)}
            onChange={(e) => set({ valueMax: fromMillions(e.target.value) })}
            className="h-7 font-mono"
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
                className="h-6 px-2 font-mono text-2xs"
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
        <Toggle
          label="Incluir sin valor informado"
          checked={filters.includeUnknownValue}
          onChange={(v) => set({ includeUnknownValue: v })}
        />
      </Section>

      <Section title="Modalidad">
        <ul>
          {MODALITIES.map((m: Modality) => (
            <li key={m}>
              <CheckRow
                checked={filters.modalities.includes(m)}
                onToggle={() => toggleIn('modalities', m)}
                label={MODALITY_LABELS[m]}
                count={facets.modalities.get(m) ?? 0}
              />
            </li>
          ))}
        </ul>
        <Toggle
          label="Solo procesos competitivos"
          checked={filters.onlyCompetitive}
          onChange={(v) => set({ onlyCompetitive: v })}
        />
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
              className="h-7 font-mono text-xs"
              value={filters.publishedFrom ?? ''}
              onChange={(e) => set({ publishedFrom: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-pub-to">hasta</Label>
            <Input
              id="f-pub-to"
              type="date"
              className="h-7 font-mono text-xs"
              value={filters.publishedTo ?? ''}
              onChange={(e) => set({ publishedTo: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-close-from">Cierra desde</Label>
            <Input
              id="f-close-from"
              type="date"
              className="h-7 font-mono text-xs"
              value={filters.closesFrom ?? ''}
              onChange={(e) => set({ closesFrom: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-close-to">hasta</Label>
            <Input
              id="f-close-to"
              type="date"
              className="h-7 font-mono text-xs"
              value={filters.closesTo ?? ''}
              onChange={(e) => set({ closesTo: e.target.value || null })}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Puntaje mínimo"
        hint={<span className="font-mono text-2xs text-muted-fg">{filters.minScore}</span>}
      >
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
        <Toggle
          label="Solo con enlace a SECOP"
          checked={filters.onlyWithUrl}
          onChange={(v) => set({ onlyWithUrl: v })}
        />
      </Section>

      <div className="border-t border-border pt-4">
        <Button variant="outline" className="w-full" onClick={reset}>
          <RotateCcw /> Restablecer filtros
        </Button>
      </div>
    </div>
  );
}
