import {
  bucketForValue,
  countBy,
  DEPARTMENTS,
  MODALITIES,
  MODALITY_LABELS,
  monthlySeries,
  normalizeText,
  topEntities,
  topSuppliers,
  UNKNOWN_VALUE_BUCKET,
  VALUE_BUCKETS,
  valueStats,
  type Contract,
  type Modality,
} from '@secop-radar/core';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  Switch,
} from '@secop-radar/ui';
import { ExternalLink, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ChartCard, StatTile } from '@/components/charts/ChartPrimitives';
import { RankedBarChart } from '@/components/charts/RankedBarChart';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { ErrorState } from '@/components/ErrorState';
import { MultiSelect } from '@/components/MultiSelect';
import { PageHeader } from '@/components/PageHeader';
import { useDataset } from '@/data/DatasetProvider';
import { useContracts } from '@/data/queries';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { formatCOP, formatCOPCompact, formatDate, formatPercent } from '@/lib/format';

const PAGE = 100;

export function MarketPage() {
  const { manifest } = useDataset();
  const contractsQ = useContracts(manifest);
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query, 150);
  const [departments, setDepartments] = useState<string[]>([]);
  const [modalities, setModalities] = useState<string[]>([]);
  const [onlyPyme, setOnlyPyme] = useState(false);
  const [supplier, setSupplier] = useState<{ key: string; label: string } | null>(null);
  const [entity, setEntity] = useState<{ key: string; label: string } | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const all = contractsQ.data;

  const filtered = useMemo(() => {
    if (!all) return [];
    const nq = normalizeText(q);
    const terms = nq.split(/\s+/).filter(Boolean);
    return all.filter((c) => {
      if (
        departments.length &&
        (c.entity.departmentCode == null || !departments.includes(c.entity.departmentCode))
      )
        return false;
      if (modalities.length && !modalities.includes(c.modality)) return false;
      if (onlyPyme && !c.supplier.isPyme) return false;
      if (supplier && (c.supplier.doc ?? normalizeText(c.supplier.name ?? '')) !== supplier.key)
        return false;
      if (entity && (c.entity.nit ?? normalizeText(c.entity.name)) !== entity.key) return false;
      if (terms.length && !terms.every((t) => c.searchText.includes(t))) return false;
      return true;
    });
  }, [all, q, departments, modalities, onlyPyme, supplier, entity]);

  const stats = useMemo(() => {
    const v = valueStats(filtered.map((c) => c.value));
    const pymeKnown = filtered.filter((c) => c.supplier.isPyme != null);
    return {
      value: v,
      pymeShare: pymeKnown.length
        ? pymeKnown.filter((c) => c.supplier.isPyme).length / pymeKnown.length
        : null,
      suppliers: new Set(filtered.map((c) => c.supplier.doc ?? c.supplier.name ?? '')).size,
      entities: new Set(filtered.map((c) => c.entity.nit ?? c.entity.name)).size,
    };
  }, [filtered]);

  const winners = useMemo(() => topSuppliers(filtered, 15), [filtered]);
  const entities = useMemo(() => topEntities(filtered, 15), [filtered]);
  const byMonth = useMemo(
    () =>
      monthlySeries(filtered, (c) => c.signedAt).map((p) => ({
        period: `${p.period}-01`,
        count: p.count,
      })),
    [filtered],
  );
  const byModality = useMemo(
    () =>
      countBy(
        filtered,
        (c) => c.modality,
        (k) => MODALITY_LABELS[k as Modality] ?? k,
      ),
    [filtered],
  );
  const byBucket = useMemo(() => {
    const counts = countBy(filtered, (c) => bucketForValue(c.value).key);
    return [...VALUE_BUCKETS, UNKNOWN_VALUE_BUCKET].map((b) => ({
      key: b.key,
      label: b.label,
      count: counts.find((x) => x.key === b.key)?.count ?? 0,
    }));
  }, [filtered]);
  const byDepartment = useMemo(
    () =>
      countBy(
        filtered,
        (c) => c.entity.departmentCode,
        (k) => DEPARTMENTS.find((d) => d.code === k)?.name ?? 'Sin departamento',
      ).slice(0, 12),
    [filtered],
  );
  const recent = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => (b.signedAt ?? '').localeCompare(a.signedAt ?? ''))
        .slice(0, limit),
    [filtered, limit],
  );

  const deptCounts = useMemo(
    () => (all ? countBy(all, (c) => c.entity.departmentCode) : []),
    [all],
  );
  const deptOptions = DEPARTMENTS.map((d) => ({
    value: d.code,
    label: d.name,
    count: deptCounts.find((x) => x.key === d.code)?.count ?? 0,
  })).sort((a, b) => b.count - a.count);

  if (contractsQ.isError)
    return <ErrorState error={contractsQ.error} onRetry={() => void contractsQ.refetch()} />;

  return (
    <div>
      <PageHeader
        title="Mercado de contratos de tecnología"
        description={`Contratos electrónicos SECOP II en categorías TI firmados desde ${formatDate(manifest.window.contractsSince)} · ${manifest.counts.contracts.toLocaleString('es-CO')} en el dataset local.`}
      />
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-fg" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en objeto, entidad o proveedor…"
              aria-label="Buscar contratos"
              className="pl-9"
            />
          </div>
          <div className="w-56">
            <MultiSelect
              label="Departamento"
              options={deptOptions}
              selected={departments}
              onToggle={(v) =>
                setDepartments((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))
              }
              onClear={() => setDepartments([])}
            />
          </div>
          <div className="w-56">
            <MultiSelect
              label="Modalidad"
              searchable={false}
              options={MODALITIES.map((m) => ({ value: m, label: MODALITY_LABELS[m] }))}
              selected={modalities}
              onToggle={(v) =>
                setModalities((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))
              }
              onClear={() => setModalities([])}
              placeholder="Todas las modalidades"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={onlyPyme} onCheckedChange={setOnlyPyme} aria-label="Solo PYME" /> Solo
            PYME
          </label>
          {supplier ? (
            <Badge tone="primary" className="h-7 gap-1 pr-1">
              Proveedor: {supplier.label}
              <button
                type="button"
                aria-label="Quitar proveedor"
                onClick={() => setSupplier(null)}
                className="rounded-full p-0.5 hover:bg-primary/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ) : null}
          {entity ? (
            <Badge tone="primary" className="h-7 gap-1 pr-1">
              Entidad: {entity.label}
              <button
                type="button"
                aria-label="Quitar entidad"
                onClick={() => setEntity(null)}
                className="rounded-full p-0.5 hover:bg-primary/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ) : null}
        </div>

        {!all ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <p className="text-sm text-muted-fg">Cargando contratos…</p>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <StatTile label="Contratos" value={filtered.length.toLocaleString('es-CO')} />
              <StatTile label="Valor total" value={formatCOPCompact(stats.value.total)} />
              <StatTile
                label="Valor mediano"
                value={formatCOPCompact(stats.value.median)}
                hint={`p25 ${formatCOPCompact(stats.value.p25)} · p75 ${formatCOPCompact(stats.value.p75)}`}
              />
              <StatTile label="Adjudicados a PYME" value={formatPercent(stats.pymeShare)} />
              <StatTile label="Proveedores" value={stats.suppliers.toLocaleString('es-CO')} />
              <StatTile label="Entidades" value={stats.entities.toLocaleString('es-CO')} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quién gana</CardTitle>
                  <CardDescription>
                    Proveedores con más contratos. Clic para ver solo sus contratos.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="divide-y divide-border">
                    {winners.map((w, i) => (
                      <li key={w.key}>
                        <button
                          type="button"
                          onClick={() => setSupplier({ key: w.key, label: w.label })}
                          className="flex w-full items-center gap-3 py-2 text-left text-sm hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <span className="tabular w-5 text-xs text-muted-fg">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate">
                            {w.label} {w.extra ? <Badge tone="info">{w.extra}</Badge> : null}
                          </span>
                          <span className="tabular text-xs text-muted-fg">
                            {w.count} · {formatCOPCompact(w.total)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Quién contrata</CardTitle>
                  <CardDescription>
                    Entidades con más contratos de tecnología. Clic para ver su historial.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="divide-y divide-border">
                    {entities.map((e, i) => (
                      <li key={e.key}>
                        <button
                          type="button"
                          onClick={() => setEntity({ key: e.key, label: e.label })}
                          className="flex w-full items-center gap-3 py-2 text-left text-sm hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <span className="tabular w-5 text-xs text-muted-fg">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate">
                            {e.label} <span className="text-xs text-muted-fg">{e.extra ?? ''}</span>
                          </span>
                          <span className="tabular text-xs text-muted-fg">
                            {e.count} · {formatCOPCompact(e.total)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
              <ChartCard title="Contratos firmados por mes" className="lg:col-span-2">
                {byMonth.length > 1 ? (
                  <TimeSeriesChart
                    rows={byMonth}
                    series={[{ key: 'count', label: 'Contratos' }]}
                    height={220}
                  />
                ) : (
                  <p className="text-sm text-muted-fg">Sin datos suficientes.</p>
                )}
              </ChartCard>
              <ChartCard title="Por modalidad">
                <RankedBarChart rows={byModality} valueLabel="Contratos" />
              </ChartCard>
              <ChartCard title="Por rango de valor" description="Millones de COP.">
                <RankedBarChart rows={byBucket} ordinal valueLabel="Contratos" />
              </ChartCard>
              <ChartCard title="Por departamento de la entidad" className="lg:col-span-2">
                <RankedBarChart rows={byDepartment} valueLabel="Contratos" />
              </ChartCard>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Contratos recientes</CardTitle>
                <CardDescription>
                  Ordenados por fecha de firma. {filtered.length.toLocaleString('es-CO')} coinciden
                  con los filtros.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {recent.map((c: Contract) => (
                    <li
                      key={c.id}
                      className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_14rem_8rem_2rem] md:items-start"
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-2 leading-snug">{c.object}</p>
                        <p className="mt-0.5 text-xs text-muted-fg">
                          {c.entity.name} · {c.entity.department ?? '—'} ·{' '}
                          {MODALITY_LABELS[c.modality]} · {formatDate(c.signedAt)}
                        </p>
                      </div>
                      <div className="truncate text-xs">
                        {c.supplier.name ?? '—'}{' '}
                        {c.supplier.isPyme ? <Badge tone="info">PYME</Badge> : null}
                      </div>
                      <div className="tabular text-sm font-medium" title={formatCOP(c.value)}>
                        {formatCOPCompact(c.value)}
                      </div>
                      <div>
                        {c.url ? (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label="Abrir en SECOP II"
                            className="text-muted-fg hover:text-fg"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                {filtered.length > limit ? (
                  <div className="mt-3">
                    <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                      Mostrar {Math.min(PAGE, filtered.length - limit)} más
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
