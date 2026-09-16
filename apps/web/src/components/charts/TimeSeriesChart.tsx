import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDate } from '@/lib/format';
import { ChartTooltip } from './ChartPrimitives';
import { useChartColors } from './theme';

export interface SeriesRow {
  period: string;
  [series: string]: number | string;
}

export function TimeSeriesChart({
  rows,
  series,
  height = 260,
}: {
  rows: SeriesRow[];
  series: Array<{ key: string; label: string }>;
  height?: number;
}) {
  const c = useChartColors();
  const colors = [c.series1, c.series2];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="2 4" />
        <XAxis
          dataKey="period"
          tickFormatter={(v: string) => formatDate(v).replace(/ \d{4}$/, '')}
          tick={{ fill: c.textMuted, fontSize: 11 }}
          axisLine={{ stroke: c.grid }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: c.textMuted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: c.textMuted, strokeDasharray: '3 3' }}
          content={({ active, label, payload }) => (
            <ChartTooltip
              active={active}
              label={typeof label === 'string' ? `Semana del ${formatDate(label)}` : undefined}
              rows={(payload ?? []).map((p, i) => ({
                name: series.find((s) => s.key === p.dataKey)?.label ?? String(p.dataKey),
                value: Number(p.value).toLocaleString('es-CO'),
                color: colors[i],
              }))}
            />
          )}
        />
        {series.length > 1 ? (
          <Legend wrapperStyle={{ fontSize: 12, color: c.text }} iconType="circle" iconSize={8} />
        ) : null}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={colors[i] ?? c.series1}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
