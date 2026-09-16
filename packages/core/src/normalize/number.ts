/**
 * Parse numbers coming from Socrata (always strings) or DIVIPOLA (comma decimals).
 * Handles "24082620", "6,246631", "1.234.567,89", "$ 1,234", "1 234".
 */
export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  let s = value.trim().replace(/[$\s\u00a0]/g, '');
  if (s === '' || s === '-') return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // Decide which is the decimal separator by whichever comes last.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // A single comma ("6,246631" coordinate, "12,5"): decimal separator.
    // Multiple commas ("1,234,567"): thousands separators.
    const commas = s.split(',').length - 1;
    s = commas > 1 ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (hasDot && s.split('.').length - 1 > 1) {
    // Multiple dots ("1.500.000"): Colombian thousands separators.
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Parse an integer-ish value; returns null when NaN. */
export function parseInteger(value: unknown): number | null {
  const n = parseNumber(value);
  if (n == null) return null;
  return Math.trunc(n);
}

/** Parse a non-negative money amount; zero and negatives become null (SECOP uses 0 for "unknown"). */
export function parseMoney(value: unknown): number | null {
  const n = parseNumber(value);
  if (n == null || n <= 0) return null;
  return Math.round(n);
}

/** Parse a counter (>= 0), defaulting to 0. */
export function parseCount(value: unknown): number {
  const n = parseInteger(value);
  return n == null || n < 0 ? 0 : n;
}
