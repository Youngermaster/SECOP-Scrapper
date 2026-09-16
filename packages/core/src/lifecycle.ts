import { daysBetween } from './normalize/date';
import type { Lifecycle, Opportunity } from './types';

/**
 * Derive where a process stands relative to a reference date. This is the signal the
 * dataset does not provide directly (`estado_de_apertura_del_proceso` is "Abierto" for
 * 87% of all rows and means "public", not "receiving offers").
 */
export function deriveLifecycle(o: Opportunity, todayISO: string): Lifecycle {
  if (o.status === 'cancelado') return 'cancelled';
  if (o.status === 'suspendido') return 'suspended';
  if (o.awarded || o.status === 'seleccionado') return 'awarded';
  if (o.status === 'borrador' || o.status === 'en-aprobacion' || o.status === 'aprobado') {
    return 'draft';
  }
  if (o.status === 'evaluacion') return 'evaluating';
  if (o.closesAt == null) {
    // Direct awards and special-regime processes often carry no closing date.
    return o.status === 'publicado' || o.status === 'abierto' ? 'open' : 'closed';
  }
  return o.closesAt >= todayISO ? 'open' : 'closed';
}

/** Days until the closing date (negative when past); null when unknown. */
export function daysLeft(o: Opportunity, todayISO: string): number | null {
  if (o.closesAt == null) return null;
  return daysBetween(todayISO, o.closesAt);
}

export const LIFECYCLE_LABELS: Record<Lifecycle, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  evaluating: 'En evaluación',
  awarded: 'Adjudicado',
  cancelled: 'Cancelado',
  suspended: 'Suspendido',
  closed: 'Cerrado',
};

export const LIFECYCLES: Lifecycle[] = Object.keys(LIFECYCLE_LABELS) as Lifecycle[];
