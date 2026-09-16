const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const int = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export function formatCOP(value: number | null | undefined): string {
  if (value == null) return '—';
  return cop.format(value);
}

/** Compact COP: "$ 24,1 M", "$ 1,6 mil M". */
export function formatCOPCompact(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000)
    return `$ ${(value / 1_000_000_000_000).toFixed(1).replace('.', ',')} billones`;
  if (abs >= 1_000_000_000)
    return `$ ${(value / 1_000_000_000).toFixed(1).replace('.', ',')} mil M`;
  if (abs >= 1_000_000)
    return `$ ${(value / 1_000_000).toFixed(abs >= 100_000_000 ? 0 : 1).replace('.', ',')} M`;
  if (abs >= 1_000) return `$ ${Math.round(value / 1_000)} mil`;
  return cop.format(value);
}

export function formatInt(value: number | null | undefined): string {
  if (value == null) return '—';
  return int.format(value);
}

const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/** "2026-09-14" → "14 sep 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (iso == null) return '—';
  const [y, m, d] = iso.split('-');
  const mi = Number(m) - 1;
  if (!y || !d || mi < 0 || mi > 11) return iso;
  return `${Number(d)} ${MONTHS_ES[mi]} ${y}`;
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(digits)} %`;
}
