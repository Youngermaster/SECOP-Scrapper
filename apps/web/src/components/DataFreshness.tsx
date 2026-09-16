import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Database } from 'lucide-react';
import { useManifest } from '@/data/queries';
import { t } from '@/i18n/es';
import { relativeTime } from '@/lib/format';

export function DataFreshness() {
  const { data } = useManifest();
  if (!data) return null;
  const days = differenceInCalendarDays(new Date(), parseISO(data.generatedAt));
  const stale = days >= 2;
  return (
    <div className="flex items-start gap-2 text-[11px] leading-snug text-sidebar-muted">
      <Database
        className={stale ? 'mt-0.5 size-3.5 text-warning' : 'mt-0.5 size-3.5 text-success'}
      />
      <div>
        <div>{t.freshness.updated(relativeTime(data.generatedAt))}</div>
        <div>
          {data.counts.opportunities.toLocaleString('es-CO')} procesos ·{' '}
          {data.counts.contracts.toLocaleString('es-CO')} contratos
        </div>
        {stale ? <div className="mt-1 text-warning">{t.freshness.stale(days)}</div> : null}
      </div>
    </div>
  );
}
