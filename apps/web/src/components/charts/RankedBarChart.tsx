import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartColors } from './theme';
import { ChartTooltip } from './ChartPrimitives';

export interface RankedRow {
  key: string;
  label: string;
  count: number;
}

const MAX_LABEL = 28;

function truncate(label: string): string {
  return label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label;
}

/**
 * Horizontal single-series magnitude bars: one hue, thin marks, rounded data-ends,
 * per-bar tooltip. `ordinal` colors bars by their position (light → dark) for rows
 * that are an ordered scale (value buckets, score bins), never by count.
 */
export function RankedBarChart({
  rows,
  height,
  valueLabel = 'Oportunidades',
  formatValue = (v: number) => v.toLocaleString('es-CO'),
  ordinal = false,
}: {
  rows: RankedRow[];
  height?: number;
  valueLabel?: string;
  formatValue?: (v: number) => string;
  ordinal?: boolean;
}) {
  const c = useChartColors();
  const h = height ?? Math.max(160, rows.length * 26 + 24);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
        barCategoryGap={4}
      >
        <CartesianGrid horizontal={false} stroke={c.grid} strokeDasharray="2 4" />
        <XAxis type="number" hide domain={[0, max]} />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tickFormatter={truncate}
          tick={{ fill: c.text, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: c.grid, opacity: 0.4 }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as RankedRow | undefined;
            return (
              <ChartTooltip
                active={active}
                label={p?.label}
                rows={p ? [{ name: valueLabel, value: formatValue(p.count) }] : []}
              />
            );
          }}
        />
        <Bar
          dataKey="count"
          fill={c.series1}
          radius={[0, 4, 4, 0]}
          barSize={14}
          isAnimationActive={false}
        >
          {ordinal
            ? rows.map((r, i) => {
                const step =
                  rows.length > 1
                    ? Math.round((i / (rows.length - 1)) * (c.sequential.length - 1))
                    : c.sequential.length - 1;
                return <Cell key={r.key} fill={c.sequential[step] ?? c.series1} />;
              })
            : null}
          <LabelList
            dataKey="count"
            position="right"
            formatter={(v: unknown) => formatValue(Number(v))}
            style={{ fill: c.textMuted, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
