import { SCORE_COMPONENT_LABELS, type ScoreResult } from '@secop-radar/core';
import { cn, Popover, PopoverContent, PopoverTrigger } from '@secop-radar/ui';

export function scoreTone(score: number): 'success' | 'warning' | 'neutral' {
  if (score >= 70) return 'success';
  if (score >= 45) return 'warning';
  return 'neutral';
}

const TONE_CLASS = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  neutral: 'bg-muted text-fg-2',
} as const;

const BAR_CLASS = {
  success: 'bg-success',
  warning: 'bg-warning',
  neutral: 'bg-border-strong',
} as const;

/** Mono numeral in a 6px tile. Colour is the only decoration and it is semantic. */
export function ScoreChip({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-grid size-9 place-items-center rounded-md font-mono text-[15px] font-semibold tabular-nums',
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
          className="cursor-pointer rounded-md transition-transform hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-100"
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
  const total = totalWeight(result);
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold">¿Puedo competir?</span>
        <span className="font-mono text-[13px] font-semibold tabular-nums">
          {result.score} / 100
        </span>
      </div>
      <ul className="space-y-2">
        {result.components.map((c) => {
          const tone = c.raw >= 0.7 ? 'success' : c.raw >= 0.4 ? 'warning' : 'neutral';
          const maxPts = c.weight > 0 ? (c.weight * 100) / total : 0;
          return (
            <li key={c.key} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-fg">{SCORE_COMPONENT_LABELS[c.key]}</span>
                <span className="font-mono text-muted-fg tabular-nums">
                  {c.contribution.toFixed(0)}
                  <span className="text-border-strong"> / </span>
                  {maxPts.toFixed(0)}
                </span>
              </div>
              <div className="mt-1 flex h-1 gap-px">
                <div
                  className={cn('h-full rounded-full', BAR_CLASS[tone])}
                  style={{ width: `${Math.max(2, Math.round(c.raw * 100))}%` }}
                />
              </div>
              <div className="mt-0.5 truncate text-muted-fg" title={c.detail}>
                {c.detail}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function totalWeight(r: ScoreResult): number {
  const t = r.components.reduce((a, c) => a + c.weight, 0);
  return t > 0 ? t : 1;
}
