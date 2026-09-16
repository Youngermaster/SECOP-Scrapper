import type { Modality } from '../types';

/** Spanish labels for the canonical modalities (UI). */
export const MODALITY_LABELS: Record<Modality, string> = {
  'licitacion-publica': 'Licitación pública',
  'licitacion-obra': 'Licitación pública (obra)',
  'acuerdo-marco': 'Acuerdo marco de precios',
  'seleccion-abreviada-menor-cuantia': 'Selección abreviada (menor cuantía)',
  'subasta-inversa': 'Subasta inversa',
  'concurso-meritos': 'Concurso de méritos',
  'minima-cuantia': 'Mínima cuantía',
  'contratacion-directa': 'Contratación directa',
  'regimen-especial': 'Régimen especial',
  'solicitud-informacion': 'Solicitud de información (RFI)',
  enajenacion: 'Enajenación de bienes',
  otro: 'Otra / no definida',
};

export const MODALITIES: Modality[] = Object.keys(MODALITY_LABELS) as Modality[];

/**
 * Modalities where suppliers actually submit offers (competitive), as opposed to
 * direct awards or information requests.
 */
export const COMPETITIVE_MODALITIES: ReadonlySet<Modality> = new Set<Modality>([
  'licitacion-publica',
  'licitacion-obra',
  'acuerdo-marco',
  'seleccion-abreviada-menor-cuantia',
  'subasta-inversa',
  'concurso-meritos',
  'minima-cuantia',
]);
