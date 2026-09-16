/** Remove diacritics (á → a, ñ → n, ü → u). */
export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Collapse whitespace and trim. */
export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/** Lower-case, accent-stripped, whitespace-collapsed text for matching/search. */
export function normalizeText(input: string): string {
  return collapseWhitespace(stripAccents(input).toLowerCase());
}

/** Upper-case alphanumeric key ("Itagüí" → "ITAGUI", "Bogotá, D.C." → "BOGOTA D C"). */
export function normalizeKey(input: string): string {
  return collapseWhitespace(
    stripAccents(input)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' '),
  );
}

/**
 * Values SECOP uses instead of null. Compared after `normalizeText`.
 * "no" is included because `tipo_de_contrato` literally contains "No" as a placeholder;
 * callers that need a real yes/no value must use `parseYesNo` instead.
 */
export const PLACEHOLDER_VALUES: ReadonlySet<string> = new Set([
  '',
  '-',
  '--',
  '—',
  'n/a',
  'na',
  'nd',
  'n.d.',
  'null',
  'undefined',
  'no',
  'no definido',
  'no definida',
  'no defindo',
  'no aplica',
  'no especificado',
  'no especificada',
  'no adjudicado',
  'sin definir',
  'sin informacion',
  'sin información',
  'no registra',
  'no reporta',
]);

export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUES.has(normalizeText(value));
}

/**
 * Trim and collapse a raw string; return null for empty values and known placeholders.
 * Non-string input is coerced (numbers) or rejected (objects → null).
 */
export function cleanString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value !== 'string') return null;
  const collapsed = collapseWhitespace(value);
  if (collapsed === '' || isPlaceholder(collapsed)) return null;
  return collapsed;
}

/** Like `cleanString` but keeps placeholders (for free text such as descriptions). */
export function cleanText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const collapsed = collapseWhitespace(value);
  return collapsed === '' ? null : collapsed;
}

/** Parse SECOP yes/no strings ("Si", "Sí", "No", "true"). */
export function parseYesNo(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;
  const v = normalizeText(value);
  if (v === 'si' || v === 's' || v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'no' || v === 'n' || v === 'false' || v === '0') return false;
  return null;
}

/** Build the lower-cased, accent-stripped search haystack from several fields. */
export function buildSearchText(parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    .map((p) => normalizeText(p))
    .join(' | ');
}

/**
 * Supplier names in SECOP often carry contact junk: "ACME SAS (ventas@acme.co - 3155551234)".
 * Strip parentheticals/suffixes that contain an e-mail or a long digit run.
 */
export function cleanSupplierName(value: unknown): string | null {
  const name = cleanString(value);
  if (name == null) return null;
  let out = name.replace(/\s*[([][^)\]]*(?:@|\d{7,})[^)\]]*[)\]]/g, '');
  out = out.replace(/\s*[-–|,;]\s*(?:[\w.+-]+@[\w.-]+|\+?\d[\d\s-]{6,})\s*$/g, '');
  out = collapseWhitespace(out);
  return out === '' ? name : out;
}
