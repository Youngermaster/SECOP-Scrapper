import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export {
  formatCOP,
  formatCOPCompact,
  formatDate,
  formatInt,
  formatPercent,
} from '@secop-radar/core';

/** "hace 3 horas" / "en 2 días". */
export function relativeTime(iso: string): string {
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true, locale: es });
  } catch {
    return iso;
  }
}

/** "hoy", "mañana", "en 5 días", "hace 2 días". */
export function daysLeftLabel(days: number | null): string {
  if (days == null) return 'sin fecha';
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days === -1) return 'ayer';
  if (days > 0) return `en ${days} días`;
  return `hace ${-days} días`;
}

export function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}
