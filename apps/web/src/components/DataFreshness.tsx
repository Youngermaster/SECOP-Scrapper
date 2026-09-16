import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useManifest } from '@/data/queries';
import { t } from '@/i18n/es';
import { relativeTime } from '@/lib/format';

export function DataFreshness() {
  const { data } = useManifest();
  if (!data) return null;
  const days = differenceInCalendarDays(new Date(), parseISO(data.generatedAt));
  const stale = days >= 2;
  return (
    <div className="space-y-1 text-2xs leading-snug text-sidebar-muted">
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={
            stale ? 'size-1.5 rounded-full bg-warning' : 'size-1.5 rounded-full bg-success'
          }
        />
        <span className="text-sidebar-fg">
          {t.freshness.updated(relativeTime(data.generatedAt))}
        </span>
      </div>
      <div className="font-mono">
        {data.counts.opportunities.toLocaleString('es-CO')} procesos ·{' '}
        {data.counts.contracts.toLocaleString('es-CO')} contratos
      </div>
      {stale ? <div className="text-warning">{t.freshness.stale(days)}</div> : null}
    </div>
  );
}
