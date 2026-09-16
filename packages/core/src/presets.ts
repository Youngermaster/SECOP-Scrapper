import { DEFAULT_FILTERS, type FilterState } from './filters';
import { addDays } from './normalize/date';
import type { ValueProfile } from './scoring';

export interface PresetContext {
  todayISO: string;
  value: ValueProfile;
}

export interface FilterPreset {
  key: string;
  label: string;
  /** One-line Spanish explanation shown as a tooltip. */
  description: string;
  apply: (ctx: PresetContext) => FilterState;
}

/**
 * One-click views over the opportunity list. Every preset starts from the defaults so
 * they compose predictably; "Todo" is the escape hatch that hides nothing.
 */
export const FILTER_PRESETS: readonly FilterPreset[] = [
  {
    key: 'for-me',
    label: 'Para mí',
    description:
      'Abiertas, que mencionan tus palabras clave o tienen categoría tecnológica, sin RUP (o probablemente sin RUP) y con valor dentro de tu rango aceptable.',
    apply: ({ value }) => ({
      ...DEFAULT_FILTERS,
      profileMatch: 'keywords-or-category',
      rup: 'not-or-likely',
      valueMax: value.acceptableMax,
      includeUnknownValue: true,
      sortKey: 'score',
      sortDir: 'desc',
    }),
  },
  {
    key: 'tech',
    label: 'Tecnología',
    description:
      'Abiertas con palabras clave o categoría UNSPSC tecnológica, cualquier RUP y valor.',
    apply: () => ({ ...DEFAULT_FILTERS, profileMatch: 'keywords-or-category' }),
  },
  {
    key: 'no-rup',
    label: 'Sin RUP',
    description: 'Abiertas donde inferimos que no exigen Registro Único de Proponentes.',
    apply: () => ({ ...DEFAULT_FILTERS, rup: 'not-or-likely' }),
  },
  {
    key: 'closing-week',
    label: 'Cierran esta semana',
    description: 'Abiertas que reciben respuestas hasta dentro de 7 días, ordenadas por cierre.',
    apply: ({ todayISO }) => ({
      ...DEFAULT_FILTERS,
      closesFrom: todayISO,
      closesTo: addDays(todayISO, 7),
      sortKey: 'closesAt',
      sortDir: 'asc',
    }),
  },
  {
    key: 'new',
    label: 'Nuevas (7 días)',
    description: 'Publicadas en los últimos 7 días, en cualquier estado.',
    apply: ({ todayISO }) => ({
      ...DEFAULT_FILTERS,
      lifecycles: [],
      publishedFrom: addDays(todayISO, -7),
      sortKey: 'publishedAt',
      sortDir: 'desc',
    }),
  },
  {
    key: 'rfi',
    label: 'Solicitudes de información',
    description:
      'RFIs abiertas: no son convocatorias, pero sirven para posicionarte antes del proceso real.',
    apply: () => ({ ...DEFAULT_FILTERS, modalities: ['solicitud-informacion'] }),
  },
  {
    key: 'my-region',
    label: 'Mi región',
    description: 'Abiertas en tu región configurada.',
    apply: () => ({ ...DEFAULT_FILTERS, regionMode: 'only-mine' }),
  },
  {
    key: 'outside-region',
    label: 'Fuera de mi región',
    description: 'Abiertas fuera de tu región (trabajo remoto o viajes).',
    apply: () => ({ ...DEFAULT_FILTERS, regionMode: 'exclude-mine' }),
  },
  {
    key: 'all',
    label: 'Todo',
    description: 'Todos los procesos descargados, en cualquier estado y sin filtros.',
    apply: () => ({ ...DEFAULT_FILTERS, lifecycles: [] }),
  },
];

/** Which preset (if any) exactly matches the current filter state. */
export function activePresetKey(filters: FilterState, ctx: PresetContext): string | null {
  const current = JSON.stringify(filters);
  for (const p of FILTER_PRESETS) {
    if (JSON.stringify(p.apply(ctx)) === current) return p.key;
  }
  return null;
}
