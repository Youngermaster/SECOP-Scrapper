import {
  RUP_LABELS,
  SCORE_FLAG_LABELS,
  type RupAssessment,
  type ScoreFlag,
  type Lifecycle,
  LIFECYCLE_LABELS,
} from '@secop-radar/core';
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@secop-radar/ui';
import {
  AlertTriangle,
  Clock,
  FileQuestion,
  Link2Off,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
} from 'lucide-react';

const RUP_TONE = {
  'not-required': 'success',
  'likely-not-required': 'info',
  required: 'warning',
  'not-applicable': 'neutral',
  unknown: 'neutral',
} as const;

export function RupBadge({ rup, compact = false }: { rup: RupAssessment; compact?: boolean }) {
  const label = RUP_LABELS[rup.requirement];
  const Icon = rup.requirement === 'required' ? ShieldQuestion : ShieldCheck;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge tone={RUP_TONE[rup.requirement]} className="cursor-help">
          <Icon />
          {compact ? label.replace('Probablemente ', 'Prob. ') : label}
          {rup.basis === 'inference' ? <span aria-hidden="true">*</span> : null}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{rup.reason}</p>
        {rup.basis === 'inference' ? (
          <p className="mt-1 text-muted-fg">* Inferencia, no garantía: verifica el pliego.</p>
        ) : null}
        {rup.legalBasis ? <p className="mt-1 text-muted-fg">{rup.legalBasis}</p> : null}
      </TooltipContent>
    </Tooltip>
  );
}

const FLAG_META: Partial<
  Record<
    ScoreFlag,
    { tone: 'danger' | 'warning' | 'success' | 'info' | 'neutral'; icon: typeof AlertTriangle }
  >
> = {
  'too-big': { tone: 'danger', icon: AlertTriangle },
  'closing-soon': { tone: 'warning', icon: Clock },
  'tech-category': { tone: 'success', icon: Sparkles },
  rfi: { tone: 'info', icon: FileQuestion },
  'url-missing': { tone: 'neutral', icon: Link2Off },
  'negative-keyword': { tone: 'warning', icon: AlertTriangle },
};

/** Only the flags worth a glance in a table row. */
export function FlagBadges({ flags, max = 3 }: { flags: ScoreFlag[]; max?: number }) {
  const shown = flags.filter((f) => FLAG_META[f]).slice(0, max);
  if (shown.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {shown.map((f) => {
        const meta = FLAG_META[f];
        if (!meta) return null;
        return (
          <Badge key={f} tone={meta.tone}>
            <meta.icon />
            {SCORE_FLAG_LABELS[f]}
          </Badge>
        );
      })}
    </span>
  );
}

const LIFECYCLE_TONE: Record<Lifecycle, 'success' | 'warning' | 'neutral' | 'info' | 'danger'> = {
  open: 'success',
  draft: 'info',
  evaluating: 'warning',
  awarded: 'neutral',
  closed: 'neutral',
  cancelled: 'danger',
  suspended: 'danger',
};

export function LifecycleBadge({ lifecycle }: { lifecycle: Lifecycle }) {
  return <Badge tone={LIFECYCLE_TONE[lifecycle]}>{LIFECYCLE_LABELS[lifecycle]}</Badge>;
}
