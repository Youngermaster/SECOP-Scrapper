import type { Modality } from '../types';
import { normalizeText } from './text';

/** Map the ~18 raw `modalidad_de_contratacion` spellings to the canonical enum. */
export function canonicalModality(raw: string | null | undefined): Modality {
  if (raw == null) return 'otro';
  const v = normalizeText(raw);
  if (v === '' || v === 'no definido') return 'otro';
  if (v.includes('acuerdo marco')) return 'acuerdo-marco';
  if (v.includes('licitacion'))
    return v.includes('obra') ? 'licitacion-obra' : 'licitacion-publica';
  if (v.includes('subasta inversa')) return 'subasta-inversa';
  if (v.includes('menor cuantia')) return 'seleccion-abreviada-menor-cuantia';
  if (v.includes('concurso de meritos')) return 'concurso-meritos';
  if (v.includes('minima cuantia')) return 'minima-cuantia';
  if (v.includes('contratacion directa')) return 'contratacion-directa';
  if (v.includes('regimen especial')) return 'regimen-especial';
  if (v.includes('solicitud de informacion')) return 'solicitud-informacion';
  if (v.includes('enajenacion')) return 'enajenacion';
  if (v.includes('seleccion abreviada')) return 'seleccion-abreviada-menor-cuantia';
  return 'otro';
}

/** True for the "(con ofertas)" variants of direct / special-regime contracting. */
export function modalityAcceptsOffers(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  return normalizeText(raw).includes('con ofertas');
}
