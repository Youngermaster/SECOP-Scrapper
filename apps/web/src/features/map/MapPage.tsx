import { DEPARTMENTS } from '@secop-radar/core';
import { Badge, Button, Card, CardContent, Skeleton } from '@secop-radar/ui';
import type { Layer, PathOptions } from 'leaflet';
import { Crosshair, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip as LeafletTooltip,
} from 'react-leaflet';
import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useDepartmentsGeoJson } from '@/data/queries';
import { formatCOPCompact } from '@/lib/format';
import { useFilters } from '@/stores/filters';
import { useSettings } from '@/stores/settings';
import { useFilteredOpportunities } from '../opportunities/useFilteredOpportunities';
import { useMapData, type MapMetric } from './useMapData';

const COLOMBIA_CENTER: [number, number] = [4.8, -73.6];

/** Leaflet paints on Canvas/SVG attributes, which cannot resolve CSS variables. */
const MAP_COLORS = {
  fill: '#6366f1',
  stroke: '#64748b',
  selected: '#0f172a',
  mine: '#f59e0b',
  municipality: '#0ea5e9',
} as const;

const METRIC_LABEL: Record<MapMetric, string> = {
  count: 'Cantidad',
  avgScore: 'Puntaje promedio',
  totalValue: 'Valor total',
};

function formatMetric(metric: MapMetric, v: number): string {
  if (metric === 'count') return v.toLocaleString('es-CO');
  if (metric === 'avgScore') return `${Math.round(v)} / 100`;
  return formatCOPCompact(v);
}

export function MapPage() {
  const { items, filters } = useFilteredOpportunities();
  const [metric, setMetric] = useState<MapMetric>('count');
  const geojsonQ = useDepartmentsGeoJson();
  const region = useSettings((s) => s.region);
  const toggleIn = useFilters((s) => s.toggleIn);
  const set = useFilters((s) => s.set);
  const data = useMapData(items, metric);

  const styleFor = useMemo(
    () =>
      (feature?: { properties?: { code?: string } }): PathOptions => {
        const code = feature?.properties?.code ?? '';
        const stat = data.departments.get(code);
        const ratio = stat && data.maxDept > 0 ? Math.sqrt(stat.metric / data.maxDept) : 0;
        const mine = code === region.departmentCode;
        const selected = filters.departments.includes(code);
        return {
          fillColor: MAP_COLORS.fill,
          fillOpacity: stat ? 0.12 + ratio * 0.6 : 0.03,
          color: mine ? MAP_COLORS.mine : selected ? MAP_COLORS.selected : MAP_COLORS.stroke,
          weight: mine || selected ? 2.5 : 0.8,
          dashArray: mine ? '4 3' : undefined,
          opacity: 0.9,
        };
      },
    [data, region.departmentCode, filters.departments],
  );

  const onEachFeature = (feature: { properties: { code: string; name: string } }, layer: Layer) => {
    const stat = data.departments.get(feature.properties.code);
    const name =
      DEPARTMENTS.find((d) => d.code === feature.properties.code)?.name ?? feature.properties.name;
    layer.bindTooltip(
      `<strong>${name}</strong><br/>${stat ? `${stat.count.toLocaleString('es-CO')} oportunidades · puntaje ${Math.round(stat.avgScore)} · ${formatCOPCompact(stat.totalValue)}` : 'Sin oportunidades con estos filtros'}`,
      { sticky: true, direction: 'top', opacity: 0.95 },
    );
    layer.on('click', () => toggleIn('departments', feature.properties.code));
  };

  const legendSteps = [0.05, 0.25, 0.5, 0.75, 1];

  return (
    <div className="flex h-dvh flex-col">
      <PageHeader
        title="Mapa de oportunidades"
        description={
          <>
            {items.length.toLocaleString('es-CO')} oportunidades con los filtros actuales
            {data.unlocated > 0 ? ` · ${data.unlocated} sin departamento` : ''}. Clic en un
            departamento para filtrarlo.
          </>
        }
        actions={
          <>
            <div className="w-72">
              <SegmentedControl<MapMetric>
                label="Métrica"
                value={metric}
                onChange={setMetric}
                options={(Object.keys(METRIC_LABEL) as MapMetric[]).map((k) => ({
                  value: k,
                  label: METRIC_LABEL[k],
                }))}
              />
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <SlidersHorizontal className="size-4" /> Ajustar filtros
            </Link>
          </>
        }
      />
      <div className="relative min-h-0 flex-1 p-4">
        {geojsonQ.isLoading ? <Skeleton className="h-full w-full" /> : null}
        {geojsonQ.data ? (
          <MapContainer
            center={COLOMBIA_CENTER}
            zoom={6}
            minZoom={5}
            maxZoom={13}
            className="h-full w-full"
            scrollWheelZoom
            preferCanvas
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON
              key={`${metric}-${items.length}-${filters.departments.join(',')}`}
              data={geojsonQ.data}
              style={styleFor}
              onEachFeature={onEachFeature}
            />
            {data.municipalities.map((m) => {
              const v = data.metricOf(m);
              const ratio = data.maxMun > 0 ? Math.sqrt(v / data.maxMun) : 0;
              const mine = m.departmentCode === region.departmentCode;
              return (
                <CircleMarker
                  key={m.key}
                  center={[m.lat, m.lon]}
                  radius={4 + ratio * 22}
                  pathOptions={{
                    color: mine ? MAP_COLORS.mine : MAP_COLORS.municipality,
                    weight: 1.5,
                    fillColor: mine ? MAP_COLORS.mine : MAP_COLORS.municipality,
                    fillOpacity: 0.45,
                  }}
                >
                  <LeafletTooltip direction="top" opacity={0.95}>
                    <strong>{m.name}</strong> · {m.count.toLocaleString('es-CO')} ·{' '}
                    {formatMetric(metric, v)}
                  </LeafletTooltip>
                  <Popup>
                    <div className="min-w-56 space-y-2">
                      <div className="font-semibold">
                        {m.name}{' '}
                        <span className="text-muted-fg">· {m.count.toLocaleString('es-CO')}</span>
                      </div>
                      <ul className="space-y-1">
                        {m.top.map((it) => (
                          <li key={it.opportunity.id} className="flex gap-2 text-xs">
                            <Badge
                              tone={
                                it.score.score >= 70
                                  ? 'success'
                                  : it.score.score >= 45
                                    ? 'warning'
                                    : 'neutral'
                              }
                            >
                              {it.score.score}
                            </Badge>
                            <Link
                              to={`/oportunidad/${encodeURIComponent(it.opportunity.id)}`}
                              className="line-clamp-2 text-primary hover:underline"
                            >
                              {it.opportunity.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to="/"
                        onClick={() => set({ cities: [m.city], departments: [m.departmentCode] })}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Crosshair className="size-3" /> Ver todas en la lista
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        ) : null}
        <Card className="absolute right-6 bottom-6 z-[1000] w-56">
          <CardContent className="space-y-2 p-3 text-xs">
            <div className="font-semibold">{METRIC_LABEL[metric]} por departamento</div>
            <div className="flex h-3 overflow-hidden rounded">
              {legendSteps.map((s) => (
                <div
                  key={s}
                  className="flex-1"
                  style={{ background: MAP_COLORS.fill, opacity: 0.12 + Math.sqrt(s) * 0.6 }}
                />
              ))}
            </div>
            <div className="flex justify-between text-muted-fg">
              <span>0</span>
              <span>{formatMetric(metric, data.maxDept)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-fg">
              <span className="inline-block size-3 rounded-full border-2 border-dashed border-warning" />{' '}
              Tu región
              <span className="ml-2 inline-block size-3 rounded-full bg-info/60" /> Municipio
            </div>
            {filters.departments.length > 0 ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-full text-xs"
                onClick={() => set({ departments: [] })}
              >
                Quitar filtro de departamento
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
