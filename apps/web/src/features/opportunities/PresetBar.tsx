import { activePresetKey, FILTER_PRESETS } from '@secop-radar/core';
import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@secop-radar/ui';
import { Sparkles } from 'lucide-react';
import { useDataset } from '@/data/DatasetProvider';
import { useFilters } from '@/stores/filters';
import { useSettings } from '@/stores/settings';

/** One-click views: "Para mí", "Sin RUP", "Cierran esta semana", "Todo"… */
export function PresetBar() {
  const filters = useFilters((s) => s.filters);
  const setAll = useFilters((s) => s.set);
  const value = useSettings((s) => s.value);
  const { today } = useDataset();
  const ctx = { todayISO: today, value };
  const active = activePresetKey(filters, ctx);

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Vistas rápidas">
      {FILTER_PRESETS.map((p) => {
        const isActive = active === p.key;
        return (
          <Tooltip key={p.key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => setAll(p.apply(ctx))}
                className={cn(
                  'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  isActive
                    ? 'border-primary bg-primary text-primary-fg'
                    : 'border-border bg-card text-muted-fg hover:bg-muted hover:text-fg',
                  p.key === 'for-me' && !isActive && 'border-primary/40 text-primary',
                )}
              >
                {p.key === 'for-me' ? <Sparkles className="size-3.5" /> : null}
                {p.label}
              </button>
            </TooltipTrigger>
            <TooltipContent>{p.description}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
