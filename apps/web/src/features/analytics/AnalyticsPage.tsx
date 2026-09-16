import {
  addDays,
  applyFilters,
  countBy,
  DEPARTMENTS,
  MODALITY_LABELS,
  UNSPSC_SEGMENT_LABELS,
  VALUE_BUCKETS,
  UNKNOWN_VALUE_BUCKET,
  bucketForValue,
  valueStats,
  weeklySeries,
  type Modality,
} from '@secop-radar/core';
import { SlidersHorizontal } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { ChartCard, StatStrip, StatTile } from '@/components/charts/ChartPrimitives';
import { RankedBarChart } from '@/components/charts/RankedBarChart';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { PageHeader } from '@/components/PageHeader';
import { useDataset } from '@/data/DatasetProvider';
import { searchIds } from '@/data/search';
import { formatCOPCompact, formatPercent } from '@/lib/format';
import { useFilteredOpportunities } from '../opportunities/useFilteredOpportunities';

export function AnalyticsPage() {
  const { items, filters } = useFilteredOpportunities();
  const { scored, searchIndex, manifest, today } = useDataset();

  // Time series ignore the lifecycle filter so the trend is visible even when only "open" is selected.
  const trendItems = useMemo(() => {
    const matchedIds = searchIds(searchIndex, filters.query);
    return applyFilters(scored, { ...filters, lifecycles: [] }, { matchedIds });
  }, [scored, searchIndex, filters]);

  const stats = useMemo(() => {
    const open = items.filter((i) => i.lifecycle === 'open');
    const noRup = items.filter(
      (i) => i.rup.requirement === 'not-required' || i.rup.requirement === 'likely-not-required',
    );
    const closingWeek = open.filter(
      (i) => i.daysLeft != null && i.daysLeft >= 0 && i.daysLeft <= 7,
    );
    const avgScore = items.length ? items.reduce((a, i) => a + i.score.score, 0) / items.length : 0;
    return {
      open: open.length,
      noRupShare: items.length ? noRup.length / items.length : null,
      closingWeek: closingWeek.length,
      avgScore,
      value: valueStats(items.map((i) => i.opportunity.value)),
    };
  }, [items]);

  const byDepartment = useMemo(
    () =>
      countBy(
        items,
        (i) => i.opportunity.entity.departmentCode,
        (k) => DEPARTMENTS.find((d) => d.code === k)?.name ?? (k === '—' ? 'Sin departamento' : k),
      ).slice(0, 15),
    [items],
  );
  const byModality = useMemo(
    () =>
      countBy(
        items,
        (i) => i.opportunity.modality,
        (k) => MODALITY_LABELS[k as Modality] ?? k,
      ),
    [items],
  );
  const byBucket = useMemo(() => {
    const counts = countBy(items, (i) => bucketForValue(i.opportunity.value).key);
    const order = [...VALUE_BUCKETS, UNKNOWN_VALUE_BUCKET];
    return order.map((b) => ({
      key: b.key,
      label: b.label,
      count: counts.find((c) => c.key === b.key)?.count ?? 0,
    }));
  }, [items]);
  const bySegment = useMemo(
    () =>
      countBy(
        items,
        (i) => i.opportunity.unspscSegment,
        (k) => (k === '—' ? 'Sin categoría' : (UNSPSC_SEGMENT_LABELS[k] ?? `Segmento ${k}`)),
      ).slice(0, 12),
    [items],
  );
  const byScore = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      key: String(i),
      label: `${i * 10}–${i * 10 + 9}`,
      count: 0,
    }));
    for (const i of items) {
      const b = Math.min(9, Math.floor(i.score.score / 10));
      const bin = bins[b];
      if (bin) bin.count += 1;
    }
    return bins;
  }, [items]);
  const timeline = useMemo(() => {
    const published = weeklySeries(trendItems, (i) => i.opportunity.publishedAt);
    const closing = weeklySeries(trendItems, (i) => i.opportunity.closesAt);
    // Clamp to the downloaded window plus a horizon; stray dates far in the past/future would flatten the chart.
    const from = addDays(manifest.window.closingSince ?? today, -56);
    const to = addDays(today, 84);
    const periods = [
      ...new Set([...published.map((p) => p.period), ...closing.map((p) => p.period)]),
    ]
      .filter((p) => p >= from && p <= to)
      .sort();
    const pm = new Map(published.map((p) => [p.period, p.count]));
    const cm = new Map(closing.map((p) => [p.period, p.count]));
    return periods.map((period) => ({
      period,
      published: pm.get(period) ?? 0,
      closing: cm.get(period) ?? 0,
    }));
  }, [trendItems, manifest.window.closingSince, today]);

  return (
    <div>
      <PageHeader
        title="Analítica"
        description={`${items.length.toLocaleString('es-CO')} oportunidades con los filtros actuales.`}
        actions={
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <SlidersHorizontal className="size-4" /> Ajustar filtros
          </Link>
        }
      />
      <div className="space-y-4 p-4 md:p-5">
        <StatStrip>
          <StatTile label="Oportunidades" value={items.length.toLocaleString('es-CO')} />
          <StatTile label="Abiertas" value={stats.open.toLocaleString('es-CO')} />
          <StatTile
            label="Cierran esta semana"
            value={stats.closingWeek.toLocaleString('es-CO')}
            hint="≤ 7 días"
          />
          <StatTile
            label="Puntaje promedio"
            value={Math.round(stats.avgScore).toString()}
            hint="de 100"
          />
          <StatTile label="Sin RUP (inferido)" value={formatPercent(stats.noRupShare)} />
          <StatTile
            label="Valor mediano"
            value={formatCOPCompact(stats.value.median)}
            hint={`${stats.value.withValue.toLocaleString('es-CO')} con valor`}
          />
        </StatStrip>

        <ChartCard
          title="Publicaciones y cierres por semana"
          description="Todas las etapas (ignora el filtro de estado) para ver la tendencia de la ventana descargada."
        >
          {timeline.length > 1 ? (
            <TimeSeriesChart
              rows={timeline}
              series={[
                { key: 'published', label: 'Publicadas' },
                { key: 'closing', label: 'Cierran' },
              ]}
            />
          ) : (
            <p className="text-sm text-muted-fg">
              No hay suficientes semanas para dibujar la serie.
            </p>
          )}
        </ChartCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Por departamento" description="Top 15 por cantidad de oportunidades.">
            <RankedBarChart rows={byDepartment} />
          </ChartCard>
          <ChartCard title="Por modalidad">
            <RankedBarChart rows={byModality} />
          </ChartCard>
          <ChartCard title="Por rango de valor" description="Valor estimado en millones de COP.">
            <RankedBarChart rows={byBucket} ordinal />
          </ChartCard>
          <ChartCard
            title="Por categoría UNSPSC"
            description="Segmento principal declarado por la entidad."
          >
            <RankedBarChart rows={bySegment} />
          </ChartCard>
          <ChartCard
            title="Distribución del puntaje"
            description="Cuántas oportunidades caen en cada franja de compatibilidad."
            className="lg:col-span-2"
          >
            <RankedBarChart rows={byScore} height={300} ordinal />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
