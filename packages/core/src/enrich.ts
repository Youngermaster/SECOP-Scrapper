import { isMyRegion, type RegionProfile } from './geo';
import { daysLeft, deriveLifecycle } from './lifecycle';
import { assessRup, type RupAssessment } from './rup';
import {
  scoreOpportunity,
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
  const score = scoreOpportunity(o, {
    todayISO: ctx.todayISO,
    region: ctx.region,
    weights: ctx.weights,
    profile: ctx.profile,
    lifecycle,
    rup,
  });
  return {
    opportunity: o,
    lifecycle,
    daysLeft: daysLeft(o, ctx.todayISO),
    rup,
    score,
    isMyRegion: isMyRegion(o.entity, ctx.region),
  };
}

export function enrichAll(list: readonly Opportunity[], ctx: EnrichContext): ScoredOpportunity[] {
  return list.map((o) => enrichOpportunity(o, ctx));
}
