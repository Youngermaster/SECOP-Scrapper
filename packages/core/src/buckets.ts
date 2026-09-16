import { monthKey, startOfWeekISO } from './normalize/date';

export interface ValueBucket {
  key: string;
  label: string;
  min: number;
  /** Exclusive upper bound; Infinity for the last bucket. */
  max: number;
}

export const VALUE_BUCKETS: readonly ValueBucket[] = [
  { key: 'lt10m', label: '< 10 M', min: 0, max: 10_000_000 },
  { key: '10-50m', label: '10–50 M', min: 10_000_000, max: 50_000_000 },
  { key: '50-100m', label: '50–100 M', min: 50_000_000, max: 100_000_000 },
  { key: '100-300m', label: '100–300 M', min: 100_000_000, max: 300_000_000 },
  { key: '300m-1b', label: '300 M – 1.000 M', min: 300_000_000, max: 1_000_000_000 },
  { key: 'gt1b', label: '> 1.000 M', min: 1_000_000_000, max: Infinity },
];

export const UNKNOWN_VALUE_BUCKET: ValueBucket = {
  key: 'unknown',
  label: 'Sin valor',
  min: -1,
  max: -1,
};

export function bucketForValue(value: number | null): ValueBucket {
  if (value == null) return UNKNOWN_VALUE_BUCKET;
  for (const b of VALUE_BUCKETS) if (value >= b.min && value < b.max) return b;
  return UNKNOWN_VALUE_BUCKET;
}

export interface CountRow<K extends string = string> {
  key: K;
  label: string;
  count: number;
}

/** Group items by a key and count them, sorted by count desc (or by custom order). */
export function countBy<T>(
  items: readonly T[],
  keyFn: (item: T) => string | null,
  labelFn: (key: string) => string = (k) => k,
): CountRow[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it) ?? '—';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: labelFn(key), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'));
}

export interface SeriesPoint {
  /** ISO date for weeks, "YYYY-MM" for months. */
  period: string;
  count: number;
}

/** Count items per ISO week (Monday-based) using a date accessor; fills gaps with 0. */
export function weeklySeries<T>(
  items: readonly T[],
  dateFn: (item: T) => string | null,
): SeriesPoint[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    const d = dateFn(it);
    if (d == null) continue;
    const w = startOfWeekISO(d);
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({ period, count }));
}

export function monthlySeries<T>(
  items: readonly T[],
  dateFn: (item: T) => string | null,
): SeriesPoint[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    const d = dateFn(it);
    if (d == null) continue;
    const m = monthKey(d);
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({ period, count }));
}
