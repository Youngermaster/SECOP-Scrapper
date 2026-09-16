import {
  UNSPSC_FAMILY_AFFINITY,
  UNSPSC_SEGMENT_AFFINITY,
  UNSPSC_UNKNOWN_AFFINITY,
  UNSPSC_UNRELATED_AFFINITY,
} from './constants/unspsc';
import { isMyRegion, type RegionProfile } from './geo';
import { daysLeft as computeDaysLeft, deriveLifecycle } from './lifecycle';
import { normalizeText, stripAccents } from './normalize/text';
import { assessRup, type RupAssessment, type RupRequirement } from './rup';
import type { Lifecycle, Modality, Opportunity } from './types';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

export type ScoreComponentKey =
  'keywords' | 'category' | 'value' | 'modality' | 'rup' | 'timing' | 'region';

export type ScoringWeights = Record<ScoreComponentKey, number>;

export type RegionPreference = 'prefer-mine' | 'neutral' | 'prefer-others';

export interface KeywordProfile {
  /** Exact-fit phrases (e.g. "desarrollo de software"). Each match contributes 1.0. */
  strong: string[];
  /** Related phrases. Each match contributes 0.5. */
  medium: string[];
  /** Weak signals. Each match contributes 0.25. */
  weak: string[];
  /** Phrases that indicate work outside the profile. Halve the keyword score. */
  negative: string[];
}

export interface ValueProfile {
  /** Below this the contract is hardly worth the paperwork. */
  tooSmall: number;
  idealMin: number;
  idealMax: number;
  acceptableMax: number;
  /** At or above this the opportunity is flagged `too-big`. */
  tooBig: number;
}

export interface ScoringProfile {
  keywords: KeywordProfile;
  value: ValueProfile;
  regionPreference: RegionPreference;
  /** Days-left threshold under which an opportunity is flagged `closing-soon`. */
  closingSoonDays: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  keywords: 30,
  category: 20,
  value: 15,
  modality: 10,
  rup: 10,
  timing: 10,
  region: 5,
};

export const DEFAULT_KEYWORDS: KeywordProfile = {
  strong: [
    'desarrollo de software',
    'desarrollo de aplicaciones',
    'desarrollo de aplicativo',
    'desarrollo de una aplicacion',
    'desarrollo de la aplicacion',
    'aplicacion movil',
    'aplicacion web',
    'app movil',
    'pagina web',
    'sitio web',
    'portal web',
    'desarrollo web',
    'software',
    'plataforma digital',
    'plataforma tecnologica',
    'plataforma web',
    'sistema de informacion',
    'sistemas de informacion',
    'robotica',
    'robot',
    'automatizacion',
    'inteligencia artificial',
    'machine learning',
    'aprendizaje automatico',
    'internet de las cosas',
    'iot',
    'transformacion digital',
    'ciencia de datos',
    'analitica de datos',
    'chatbot',
    'aplicativo',
    'api',
  ],
  medium: [
    'tecnologia',
    'tecnologico',
    'tecnologica',
    'tic',
    'informatica',
    'digital',
    'sistemas',
    'soporte tecnico',
    'mantenimiento de software',
    'mantenimiento del software',
    'actualizacion del sistema',
    'nube',
    'cloud',
    'ciberseguridad',
    'seguridad informatica',
    'dron',
    'drones',
    'electronica',
    'arduino',
    'raspberry',
    'stem',
    'programacion',
    'ingenieria de sistemas',
    'ingeniero de sistemas',
    'mecatronica',
    'impresion 3d',
    'base de datos',
    'bases de datos',
    'dashboard',
    'tablero de control',
    'georreferenciacion',
    'sig',
  ],
  weak: [
    'prestacion de servicios profesionales',
    'servicios profesionales',
    'consultoria',
    'capacitacion',
    'innovacion',
    'investigacion',
    'diseno',
    'multimedia',
    'audiovisual',
    'licencia',
    'licenciamiento',
  ],
  negative: [
    'obra civil',
    'obras civiles',
    'construccion de',
    'pavimentacion',
    'pavimento',
    'vigilancia',
    'seguridad privada',
    'alimentacion',
    'alimentos',
    'refrigerios',
    'aseo',
    'cafeteria',
    'medicamentos',
    'combustible',
    'transporte escolar',
    'transporte de',
    'papeleria',
    'ferreteria',
    'mantenimiento de vehiculos',
    'interventoria',
    'arrendamiento',
    'seguros',
    'poliza',
    'uniformes',
    'dotacion',
    'equipos de computo',
    'computadores',
    'impresoras',
    'toner',
    'renovacion de licencias',
    'adquisicion de licencias',
    'suministro de',
    'compra de',
  ],
};

export const DEFAULT_VALUE_PROFILE: ValueProfile = {
  tooSmall: 2_000_000,
  idealMin: 10_000_000,
  idealMax: 200_000_000,
  acceptableMax: 500_000_000,
  tooBig: 1_500_000_000,
};

export const DEFAULT_PROFILE: ScoringProfile = {
  keywords: DEFAULT_KEYWORDS,
  value: DEFAULT_VALUE_PROFILE,
  regionPreference: 'neutral',
  closingSoonDays: 3,
};

/* ------------------------------------------------------------------ */
/* Result                                                              */
/* ------------------------------------------------------------------ */

export type ScoreFlag =
  | 'too-big'
  | 'too-small'
  | 'closing-soon'
  | 'closed'
  | 'no-rup'
  | 'rfi'
  | 'negative-keyword'
  | 'tech-category'
  | 'url-missing'
  | 'unknown-value';

export interface ScoreComponent {
  key: ScoreComponentKey;
  /** 0–1 sub-score. */
  raw: number;
  weight: number;
  /** Points contributed to the final 0–100 score. */
  contribution: number;
  /** Short Spanish explanation. */
  detail: string;
}

export interface ScoreResult {
  /** 0–100. */
  score: number;
  components: ScoreComponent[];
  flags: ScoreFlag[];
  matchedKeywords: string[];
  negativeKeywords: string[];
}

export interface ScoringContext {
  todayISO: string;
  weights?: Partial<ScoringWeights>;
  profile?: ScoringProfile;
  region: RegionProfile;
  /** Pre-computed values (avoid recomputation when the caller already has them). */
  lifecycle?: Lifecycle;
  rup?: RupAssessment;
}

/* ------------------------------------------------------------------ */
/* Component scorers (exported for tests)                              */
/* ------------------------------------------------------------------ */

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * One alternation regex per phrase list, cached by list identity. Longer phrases first so
 * "desarrollo de software" wins over "software" at the same position. Word-ish boundaries
 * so "api" does not match "capital" and "tic" does not match "tico".
 */
const listRegexCache = new WeakMap<readonly string[], RegExp | null>();

function listRegex(phrases: readonly string[]): RegExp | null {
  const cached = listRegexCache.get(phrases);
  if (cached !== undefined) return cached;
  const normalized = [
    ...new Set(phrases.map((p) => normalizeText(stripAccents(p))).filter(Boolean)),
  ].sort((a, b) => b.length - a.length);
  const re =
    normalized.length === 0
      ? null
      : new RegExp(`(?:^|[^a-z0-9])(${normalized.map(escapeRegex).join('|')})(?=$|[^a-z0-9])`, 'g');
  listRegexCache.set(phrases, re);
  return re;
}

function matchPhrases(text: string, phrases: readonly string[]): string[] {
  const re = listRegex(phrases);
  if (!re) return [];
  const found = new Set<string>();
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1] !== undefined) found.add(m[1]);
    // Allow overlapping matches that start right after the boundary character.
    if (m[0].length === 0) re.lastIndex += 1;
    else re.lastIndex = m.index + 1;
  }
  return [...found];
}

export interface KeywordMatch {
  raw: number;
  matched: string[];
  negative: string[];
}

/** Keyword sub-score over the normalized search text. */
export function scoreKeywords(searchText: string, kw: KeywordProfile): KeywordMatch {
  const strong = matchPhrases(searchText, kw.strong);
  const medium = matchPhrases(searchText, kw.medium);
  const weak = matchPhrases(searchText, kw.weak);
  const negative = matchPhrases(searchText, kw.negative);
  const matched = [...strong, ...medium, ...weak];
  const sum = strong.length * 1 + medium.length * 0.5 + weak.length * 0.25;
  let raw = clamp01(sum);
  if (negative.length > 0) raw = matched.length === 0 ? 0 : raw * 0.5;
  return { raw, matched, negative };
}

export function scoreCategory(family: string | null, segment: string | null): number {
  if (family != null) {
    const f = UNSPSC_FAMILY_AFFINITY[family];
    if (f != null) return f;
  }
  if (segment != null) {
    const s = UNSPSC_SEGMENT_AFFINITY[segment];
    return s ?? UNSPSC_UNRELATED_AFFINITY;
  }
  return UNSPSC_UNKNOWN_AFFINITY;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

export function scoreValue(value: number | null, vp: ValueProfile): number {
  if (value == null) return 0.5;
  if (value >= vp.tooBig) return 0;
  if (value < vp.tooSmall) return 0.3;
  if (value < vp.idealMin) return lerp(0.3, 1, (value - vp.tooSmall) / (vp.idealMin - vp.tooSmall));
  if (value <= vp.idealMax) return 1;
  if (value <= vp.acceptableMax) {
    return lerp(1, 0.5, (value - vp.idealMax) / (vp.acceptableMax - vp.idealMax));
  }
  return lerp(0.5, 0.1, (value - vp.acceptableMax) / (vp.tooBig - vp.acceptableMax));
}

const MODALITY_SCORE: Record<Modality, number> = {
  'minima-cuantia': 1,
  'contratacion-directa': 0.8,
  'regimen-especial': 0.7,
  'seleccion-abreviada-menor-cuantia': 0.6,
  'concurso-meritos': 0.5,
  'solicitud-informacion': 0.4,
  'subasta-inversa': 0.3,
  'licitacion-publica': 0.2,
  'licitacion-obra': 0.05,
  enajenacion: 0,
  'acuerdo-marco': 0,
  otro: 0.4,
};

export function scoreModality(m: Modality): number {
  return MODALITY_SCORE[m];
}

const RUP_SCORE: Record<RupRequirement, number> = {
  'not-required': 1,
  'likely-not-required': 0.7,
  'not-applicable': 0.6,
  unknown: 0.4,
  required: 0.2,
};

export function scoreRup(r: RupRequirement): number {
  return RUP_SCORE[r];
}

export function scoreTiming(lifecycle: Lifecycle, days: number | null): number {
  if (lifecycle !== 'open' && lifecycle !== 'draft') return 0;
  if (days == null) return lifecycle === 'open' ? 0.4 : 0.3;
  if (days < 0) return 0;
  if (days === 0) return 0.1;
  if (days === 1) return 0.25;
  if (days <= 3) return 0.5;
  if (days <= 6) return 0.8;
  if (days <= 30) return 1;
  return 0.9;
}

export function scoreRegion(inMyRegion: boolean, pref: RegionPreference): number {
  if (pref === 'neutral') return 0.7;
  if (pref === 'prefer-mine') return inMyRegion ? 1 : 0.4;
  return inMyRegion ? 0.4 : 1;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function formatCOPShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} mil M`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} M`;
  return `${Math.round(n / 1000)} mil`;
}

/** Everything about an opportunity that does not depend on the weights. */
export interface OpportunityAnalysis {
  lifecycle: Lifecycle;
  daysLeft: number | null;
  rup: RupAssessment;
  inRegion: boolean;
  keywords: KeywordMatch;
  raws: Record<ScoreComponentKey, { raw: number; detail: string }>;
  flags: ScoreFlag[];
}

/** The expensive half of scoring: keyword matching, RUP, lifecycle, category, value curves. */
export function analyzeOpportunity(
  o: Opportunity,
  ctx: Omit<ScoringContext, 'weights'>,
): OpportunityAnalysis {
  const profile = ctx.profile ?? DEFAULT_PROFILE;
  const lifecycle = ctx.lifecycle ?? deriveLifecycle(o, ctx.todayISO);
  const rup = ctx.rup ?? assessRup(o);
  const days = computeDaysLeft(o, ctx.todayISO);
  const inRegion = isMyRegion(o.entity, ctx.region);

  const kw = scoreKeywords(o.searchText, profile.keywords);
  const category = scoreCategory(o.unspscFamily, o.unspscSegment);
  const value = scoreValue(o.value, profile.value);
  const modality = scoreModality(o.modality);
  const rupScore = scoreRup(rup.requirement);
  const timing = scoreTiming(lifecycle, days);
  const region = scoreRegion(inRegion, profile.regionPreference);

  const raws: Record<ScoreComponentKey, { raw: number; detail: string }> = {
    keywords: {
      raw: kw.raw,
      detail:
        kw.matched.length > 0
          ? `Coincide con: ${kw.matched.slice(0, 4).join(', ')}${kw.negative.length ? ` (penalizado por: ${kw.negative.slice(0, 2).join(', ')})` : ''}`
          : kw.negative.length > 0
            ? `Sin palabras clave; menciona ${kw.negative.slice(0, 2).join(', ')}`
            : 'Sin coincidencias de palabras clave',
    },
    category: {
      raw: category,
      detail:
        o.unspscFamily != null
          ? `Familia UNSPSC ${o.unspscFamily}`
          : o.unspscSegment != null
            ? `Segmento UNSPSC ${o.unspscSegment}`
            : 'Sin categoría UNSPSC',
    },
    value: {
      raw: value,
      detail:
        o.value == null
          ? 'Valor no informado'
          : o.value >= profile.value.tooBig
            ? `Valor ${formatCOPShort(o.value)} supera el máximo realista`
            : `Valor estimado ${formatCOPShort(o.value)}`,
    },
    modality: { raw: modality, detail: o.modalityRaw ?? 'Modalidad no definida' },
    rup: { raw: rupScore, detail: rup.reason },
    timing: {
      raw: timing,
      detail:
        days == null
          ? 'Sin fecha de cierre'
          : days < 0
            ? `Cerró hace ${-days} día(s)`
            : days === 0
              ? 'Cierra hoy'
              : `Cierra en ${days} día(s)`,
    },
    region: { raw: region, detail: inRegion ? 'En tu región' : 'Fuera de tu región' },
  };

  const flags: ScoreFlag[] = [];
  if (o.value != null && o.value >= profile.value.tooBig) flags.push('too-big');
  if (o.value != null && o.value < profile.value.tooSmall) flags.push('too-small');
  if (o.value == null) flags.push('unknown-value');
  if (lifecycle === 'open' && days != null && days >= 0 && days <= profile.closingSoonDays) {
    flags.push('closing-soon');
  }
  if (lifecycle !== 'open' && lifecycle !== 'draft') flags.push('closed');
  if (rup.requirement === 'not-required' || rup.requirement === 'likely-not-required') {
    flags.push('no-rup');
  }
  if (o.modality === 'solicitud-informacion') flags.push('rfi');
  if (kw.negative.length > 0) flags.push('negative-keyword');
  if (category >= 0.9) flags.push('tech-category');
  if (o.urlStatus !== 'ok') flags.push('url-missing');

  return { lifecycle, daysLeft: days, rup, inRegion, keywords: kw, raws, flags };
}

const COMPONENT_KEYS = Object.keys(DEFAULT_WEIGHTS) as ScoreComponentKey[];

/** The cheap half: combine the analysis with weights into a 0–100 score. */
export function scoreFromAnalysis(
  a: OpportunityAnalysis,
  partial?: Partial<ScoringWeights>,
): ScoreResult {
  const weights: ScoringWeights = { ...DEFAULT_WEIGHTS, ...partial };
  const totalWeight = COMPONENT_KEYS.reduce((acc, k) => acc + Math.max(0, weights[k]), 0);
  const components: ScoreComponent[] = COMPONENT_KEYS.map((key) => {
    const w = Math.max(0, weights[key]);
    const r = a.raws[key];
    return {
      key,
      raw: r.raw,
      weight: w,
      contribution: totalWeight > 0 ? (r.raw * w * 100) / totalWeight : 0,
      detail: r.detail,
    };
  });
  const score = Math.round(components.reduce((acc, c) => acc + c.contribution, 0));
  return {
    score,
    components,
    flags: a.flags,
    matchedKeywords: a.keywords.matched,
    negativeKeywords: a.keywords.negative,
  };
}

export function scoreOpportunity(o: Opportunity, ctx: ScoringContext): ScoreResult {
  return scoreFromAnalysis(analyzeOpportunity(o, ctx), ctx.weights);
}

export const SCORE_COMPONENT_LABELS: Record<ScoreComponentKey, string> = {
  keywords: 'Palabras clave',
  category: 'Categoría UNSPSC',
  value: 'Valor del contrato',
  modality: 'Modalidad',
  rup: 'RUP',
  timing: 'Tiempo para aplicar',
  region: 'Región',
};

export const SCORE_FLAG_LABELS: Record<ScoreFlag, string> = {
  'too-big': 'Demasiado grande',
  'too-small': 'Muy pequeño',
  'closing-soon': 'Cierra pronto',
  closed: 'No abierto',
  'no-rup': 'Sin RUP',
  rfi: 'Solo información',
  'negative-keyword': 'Fuera de perfil',
  'tech-category': 'Categoría tecnológica',
  'url-missing': 'Sin enlace',
  'unknown-value': 'Valor desconocido',
};
