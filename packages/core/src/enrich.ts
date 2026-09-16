import { isMyRegion, type RegionProfile } from './geo';
import { daysLeft, deriveLifecycle } from './lifecycle';
import { assessRup, type RupAssessment } from './rup';
import {
  analyzeOpportunity,
  scoreFromAnalysis,
  type OpportunityAnalysis,
  type ScoreResult,
  type ScoringProfile,
  type ScoringWeights,
} from './scoring';
import type { Lifecycle, Opportunity } from './types';

/** An opportunity plus everything derived from it for a given day and user profile. */
export interface ScoredOpportunity {
  opportunity: Opportunity;
  lifecycle: Lifecycle;
  daysLeft: number | null;
  rup: RupAssessment;
  score: ScoreResult;
  isMyRegion: boolean;
  /** Weight-independent analysis; keep it to re-score cheaply when weights change. */
  analysis: OpportunityAnalysis;
}

export interface EnrichContext {
  todayISO: string;
  region: RegionProfile;
  weights?: Partial<ScoringWeights>;
  profile?: ScoringProfile;
}

export function enrichOpportunity(o: Opportunity, ctx: EnrichContext): ScoredOpportunity {
  const lifecycle = deriveLifecycle(o, ctx.todayISO);
  const rup = assessRup(o);
  const analysis = analyzeOpportunity(o, {
    todayISO: ctx.todayISO,
    region: ctx.region,
    profile: ctx.profile,
    lifecycle,
    rup,
  });
  return {
    opportunity: o,
    lifecycle,
    daysLeft: daysLeft(o, ctx.todayISO),
    rup,
    score: scoreFromAnalysis(analysis, ctx.weights),
    isMyRegion: isMyRegion(o.entity, ctx.region),
    analysis,
  };
}

export function enrichAll(list: readonly Opportunity[], ctx: EnrichContext): ScoredOpportunity[] {
  return list.map((o) => enrichOpportunity(o, ctx));
}

/** Re-apply weights to already-analysed items (fast path for weight sliders). */
export function rescoreAll(
  items: readonly ScoredOpportunity[],
  weights?: Partial<ScoringWeights>,
): ScoredOpportunity[] {
  return items.map((it) => ({ ...it, score: scoreFromAnalysis(it.analysis, weights) }));
}
