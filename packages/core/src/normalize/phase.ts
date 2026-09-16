import { normalizeText } from './text';

/** Canonical Spanish labels for `fase`, which mixes languages and casing. */
const PHASE_MAP: ReadonlyArray<[RegExp, string]> = [
  [/presentacion de oferta \(precalificacion\)/, 'Presentación de oferta (precalificación)'],
  [
    /presentacion de observaciones \(precalificacion\)/,
    'Presentación de observaciones (precalificación)',
  ],
  [/presentacion de observaciones|clarification submission/, 'Presentación de observaciones'],
  [
    /presentacion de oferta|fase de ofertas|proceso de ofertas|fase de seleccion/,
    'Presentación de ofertas',
  ],
  [/manifestacion de interes/, 'Manifestación de interés'],
  [/seleccion de ofertas \(borrador\)|estimate phase/, 'Borrador'],
  [/pre-?calificacion|precalificacion/, 'Precalificación'],
  [/fase de concurso/, 'Concurso'],
];

export function canonicalPhase(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const v = normalizeText(raw);
  if (v === '' || v === 'no definido') return null;
  for (const [re, label] of PHASE_MAP) {
    if (re.test(v)) return label;
  }
  return raw.trim();
}
