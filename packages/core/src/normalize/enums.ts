import type { DurationUnit, EntityOrder, ProcessStatus } from '../types';
import { normalizeText } from './text';

export function canonicalStatus(raw: string | null | undefined): ProcessStatus {
  if (raw == null) return 'desconocido';
  const v = normalizeText(raw);
  switch (v) {
    case 'publicado':
      return 'publicado';
    case 'abierto':
      return 'abierto';
    case 'evaluacion':
    case 'en evaluacion':
      return 'evaluacion';
    case 'seleccionado':
    case 'adjudicado':
      return 'seleccionado';
    case 'cancelado':
      return 'cancelado';
    case 'suspendido':
      return 'suspendido';
    case 'borrador':
      return 'borrador';
    case 'en aprobacion':
      return 'en-aprobacion';
    case 'aprobado':
      return 'aprobado';
    default:
      return 'desconocido';
  }
}

export function canonicalEntityOrder(raw: string | null | undefined): EntityOrder {
  if (raw == null) return 'desconocido';
  const v = normalizeText(raw);
  if (v.startsWith('nacional')) return 'nacional';
  if (v.startsWith('territorial')) return 'territorial';
  if (v.includes('corporacion')) return 'corporacion-autonoma';
  return 'desconocido';
}

export function canonicalDurationUnit(raw: string | null | undefined): DurationUnit {
  if (raw == null) return 'desconocido';
  const v = normalizeText(raw);
  if (v.startsWith('dia')) return 'dias';
  if (v.startsWith('semana')) return 'semanas';
  if (v.startsWith('mes')) return 'meses';
  if (v.startsWith('ano') || v.startsWith('año')) return 'anios';
  if (v.startsWith('hora')) return 'horas';
  return 'desconocido';
}

/** Parse "V1.43233200" → { code, segment: "43", family: "4323" }. Non-numeric codes → nulls. */
export function parseUnspsc(raw: string | null | undefined): {
  code: string | null;
  segment: string | null;
  family: string | null;
} {
  if (raw == null) return { code: null, segment: null, family: null };
  const trimmed = raw.trim();
  if (trimmed === '') return { code: null, segment: null, family: null };
  const digits = trimmed.replace(/^V\d+\./i, '');
  if (!/^\d{4,}$/.test(digits)) return { code: trimmed, segment: null, family: null };
  return { code: trimmed, segment: digits.slice(0, 2), family: digits.slice(0, 4) };
}
