import { normalizeText } from './normalize/text';
import type { Opportunity } from './types';

export type RupRequirement =
  'not-required' | 'likely-not-required' | 'required' | 'not-applicable' | 'unknown';

export interface RupAssessment {
  requirement: RupRequirement;
  /** `rule` = follows directly from the legal exception list; `inference` = heuristic. */
  basis: 'rule' | 'inference';
  /** Short Spanish explanation for the UI. */
  reason: string;
  legalBasis: string | null;
  /** Extra caveats, e.g. acuerdo marco membership. */
  notes: string[];
}

const LEY_1150 = 'Ley 1150 de 2007, art. 6 (mod. Decreto-Ley 019 de 2012, art. 221)';
const DECRETO_1082 = 'Decreto 1082 de 2015, art. 2.2.1.1.1.5.1';

const HEALTH_SERVICE_RE = /servicios? de salud|prestacion de servicios de salud|atencion en salud/;

/**
 * Infer whether the Registro Único de Proponentes (RUP) is required to bid.
 *
 * The dataset has no RUP column, so this is derived from the contracting modality and
 * a few contract-type/category rules that mirror the legal exception list. Always
 * presented in the UI as an inference, never a guarantee: entities under "régimen
 * especial" follow their own manuals and may still ask for the RUP.
 */
export function assessRup(o: Opportunity): RupAssessment {
  const notes: string[] = [];
  const contractType = normalizeText(o.contractType ?? '');
  const haystack = normalizeText(`${o.title} ${o.description}`);

  if (o.modality === 'solicitud-informacion') {
    return {
      requirement: 'not-applicable',
      basis: 'rule',
      reason: 'Es una solicitud de información (RFI), no un proceso de selección.',
      legalBasis: null,
      notes,
    };
  }
  if (o.modality === 'contratacion-directa') {
    return {
      requirement: 'not-required',
      basis: 'rule',
      reason: 'La contratación directa está exceptuada del RUP.',
      legalBasis: LEY_1150,
      notes,
    };
  }
  if (o.modality === 'minima-cuantia') {
    return {
      requirement: 'not-required',
      basis: 'rule',
      reason: 'Los procesos de mínima cuantía no exigen RUP.',
      legalBasis: LEY_1150,
      notes,
    };
  }
  if (o.modality === 'enajenacion') {
    return {
      requirement: 'not-required',
      basis: 'rule',
      reason: 'La enajenación de bienes del Estado está exceptuada del RUP.',
      legalBasis: LEY_1150,
      notes,
    };
  }
  if (contractType.includes('concesion') || contractType.includes('asociacion publico privada')) {
    return {
      requirement: 'not-required',
      basis: 'rule',
      reason: 'Los contratos de concesión están exceptuados del RUP.',
      legalBasis: LEY_1150,
      notes,
    };
  }
  if (o.unspscSegment === '85' && HEALTH_SERVICE_RE.test(haystack)) {
    return {
      requirement: 'not-required',
      basis: 'inference',
      reason: 'Parece un contrato de prestación de servicios de salud, exceptuado del RUP.',
      legalBasis: LEY_1150,
      notes,
    };
  }
  if (o.modality === 'regimen-especial') {
    return {
      requirement: 'likely-not-required',
      basis: 'inference',
      reason:
        'La entidad contrata bajo régimen especial (fuera del Estatuto General); usualmente no exige RUP, pero su manual puede pedirlo.',
      legalBasis: DECRETO_1082,
      notes,
    };
  }
  if (o.modality === 'acuerdo-marco') {
    notes.push('Además del RUP, solo pueden ofertar proveedores vinculados al acuerdo marco.');
    return {
      requirement: 'required',
      basis: 'rule',
      reason: 'Las licitaciones bajo acuerdo marco exigen RUP y estar vinculado al acuerdo.',
      legalBasis: LEY_1150,
      notes,
    };
  }
  if (
    o.modality === 'licitacion-publica' ||
    o.modality === 'licitacion-obra' ||
    o.modality === 'seleccion-abreviada-menor-cuantia' ||
    o.modality === 'subasta-inversa' ||
    o.modality === 'concurso-meritos'
  ) {
    return {
      requirement: 'required',
      basis: 'rule',
      reason:
        'Licitación, selección abreviada y concurso de méritos exigen RUP vigente y en firme.',
      legalBasis: LEY_1150,
      notes,
    };
  }
  return {
    requirement: 'unknown',
    basis: 'inference',
    reason: 'La modalidad no permite inferir si se exige RUP; verifica el pliego.',
    legalBasis: null,
    notes,
  };
}

export const RUP_LABELS: Record<RupRequirement, string> = {
  'not-required': 'Sin RUP',
  'likely-not-required': 'Probablemente sin RUP',
  required: 'Requiere RUP',
  'not-applicable': 'No aplica',
  unknown: 'RUP desconocido',
};
