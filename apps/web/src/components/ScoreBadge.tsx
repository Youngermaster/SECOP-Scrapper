import { SCORE_COMPONENT_LABELS, type ScoreResult } from '@secop-radar/core';
import { cn, Popover, PopoverContent, PopoverTrigger } from '@secop-radar/ui';

export function scoreTone(score: number): 'success' | 'warning' | 'neutral' {
  if (score >= 70) return 'success';
  if (score >= 45) return 'warning';
  return 'neutral';
}

const TONE_CLASS = {
  success: 'bg-success/15 text-success ring-success/30',
  warning: 'bg-warning/15 text-warning ring-warning/40',
  neutral: 'bg-muted text-muted-fg ring-border',
} as const;

export function ScoreChip({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        'tabular inline-grid size-10 place-items-center rounded-lg text-sm font-semibold ring-1 ring-inset',
        TONE_CLASS[scoreTone(score)],
        className,
      )}
      aria-label={`Puntaje ${score} de 100`}
    >
      {score}
    </span>
  );
}

/** Score chip that opens a breakdown of every component on click. */
export function ScoreBadge({ result }: { result: ScoreResult }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`Puntaje ${result.score} de 100. Ver desglose`}
          onClick={(e) => e.stopPropagation()}
        >
          <ScoreChip score={result.score} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
        <ScoreBreakdown result={result} />
      </PopoverContent>
    </Popover>
  );
}

export function ScoreBreakdown({ result }: { result: ScoreResult }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">¿Puedo competir?</span>
        <span className="tabular text-sm font-semibold">{result.score} / 100</span>
      </div>
      <ul className="space-y-1.5">
        {result.components.map((c) => (
          <li key={c.key} className="text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{SCORE_COMPONENT_LABELS[c.key]}</span>
              <span className="tabular text-muted-fg">
                {c.contribution.toFixed(0)} /{' '}
                {c.weight > 0 ? ((c.weight * 100) / totalWeight(result)).toFixed(0) : 0}
              </span>
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full',
                  c.raw >= 0.7 ? 'bg-success' : c.raw >= 0.4 ? 'bg-warning' : 'bg-danger/70',
                )}
                style={{ width: `${Math.round(c.raw * 100)}%` }}
              />
            </div>
            <div className="mt-0.5 truncate text-muted-fg" title={c.detail}>
              {c.detail}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function totalWeight(r: ScoreResult): number {
  const t = r.components.reduce((a, c) => a + c.weight, 0);
  return t > 0 ? t : 1;
}
