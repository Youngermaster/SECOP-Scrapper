import { describe, expect, it } from 'vitest';
import { DEFAULT_REGION } from '../geo';
import {
  DEFAULT_KEYWORDS,
  DEFAULT_PROFILE,
  DEFAULT_VALUE_PROFILE,
  scoreCategory,
  scoreKeywords,
  scoreOpportunity,
  scoreTiming,
  scoreValue,
} from '../scoring';
import { opportunity, TODAY } from './fixtures';

describe('scoreKeywords', () => {
  it('matches strong phrases with word boundaries', () => {
    const r = scoreKeywords('desarrollo de software para la entidad', DEFAULT_KEYWORDS);
    expect(r.raw).toBe(1);
    expect(r.matched).toContain('desarrollo de software');
  });
  it('does not match substrings ("api" inside "capital", "tic" inside "tico")', () => {
    expect(scoreKeywords('distrito capital tico', DEFAULT_KEYWORDS).matched).toEqual([]);
  });
  it('halves the score on negative keywords and zeroes it without positives', () => {
    const mixed = scoreKeywords('software para la vigilancia del parque', DEFAULT_KEYWORDS);
    expect(mixed.negative).toContain('vigilancia');
    expect(mixed.raw).toBe(0.5);
    const onlyNeg = scoreKeywords('construccion de un puente', DEFAULT_KEYWORDS);
    expect(onlyNeg.raw).toBe(0);
  });
  it('accumulates medium/weak matches up to 1', () => {
    const r = scoreKeywords('consultoria en tecnologia e innovacion', DEFAULT_KEYWORDS);
    expect(r.raw).toBeCloseTo(1); // 0.5 + 0.25 + 0.25
  });
});

describe('scoreCategory / scoreValue / scoreTiming', () => {
  it('rates UNSPSC families and segments', () => {
    expect(scoreCategory('4323', '43')).toBe(1);
    expect(scoreCategory('8111', '81')).toBe(1);
    expect(scoreCategory('4399', '43')).toBe(0.5);
    expect(scoreCategory('7210', '72')).toBe(0);
    expect(scoreCategory(null, null)).toBe(0.3);
  });
  it('shapes the value curve', () => {
    const vp = DEFAULT_VALUE_PROFILE;
    expect(scoreValue(null, vp)).toBe(0.5);
    expect(scoreValue(1_000_000, vp)).toBe(0.3);
    expect(scoreValue(50_000_000, vp)).toBe(1);
    expect(scoreValue(200_000_000, vp)).toBe(1);
    expect(scoreValue(350_000_000, vp)).toBeCloseTo(0.75);
    expect(scoreValue(1_000_000_000, vp)).toBeCloseTo(0.3);
    expect(scoreValue(2_000_000_000, vp)).toBe(0);
  });
  it('rewards enough time to apply', () => {
    expect(scoreTiming('open', 0)).toBe(0.1);
    expect(scoreTiming('open', 1)).toBe(0.25);
    expect(scoreTiming('open', 10)).toBe(1);
    expect(scoreTiming('open', 60)).toBe(0.9);
    expect(scoreTiming('closed', 10)).toBe(0);
    expect(scoreTiming('open', null)).toBe(0.4);
  });
});

describe('scoreOpportunity', () => {
  const ctx = { todayISO: TODAY, region: DEFAULT_REGION };

  it('ranks a perfect-fit software tender highly', () => {
    const r = scoreOpportunity(opportunity(), ctx);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.flags).toContain('no-rup');
    expect(r.flags).toContain('tech-category');
    expect(r.components).toHaveLength(7);
    expect(Math.round(r.components.reduce((a, c) => a + c.contribution, 0))).toBe(r.score);
  });

  it('flags contracts that are too big and scores them lower', () => {
    const big = scoreOpportunity(opportunity({ precio_base: '3149207473' }), ctx);
    expect(big.flags).toContain('too-big');
    expect(big.score).toBeLessThan(scoreOpportunity(opportunity(), ctx).score);
  });

  it('penalises closed processes and flags closing soon', () => {
    const closed = scoreOpportunity(
      opportunity({ fecha_de_recepcion_de: '2026-09-01T00:00:00.000' }),
      ctx,
    );
    expect(closed.flags).toContain('closed');
    const soon = scoreOpportunity(
      opportunity({ fecha_de_recepcion_de: '2026-09-17T00:00:00.000' }),
      ctx,
    );
    expect(soon.flags).toContain('closing-soon');
  });

  it('honours custom weights (zero weight removes the component)', () => {
    const base = scoreOpportunity(opportunity({ precio_base: '3149207473' }), ctx);
    const noValue = scoreOpportunity(opportunity({ precio_base: '3149207473' }), {
      ...ctx,
      weights: { value: 0 },
    });
    expect(noValue.score).toBeGreaterThan(base.score);
    expect(noValue.components.find((c) => c.key === 'value')?.contribution).toBe(0);
  });

  it('scores construction tenders near zero on keywords/category', () => {
    const r = scoreOpportunity(
      opportunity({
        nombre_del_procedimiento: 'Construcción de placa huella vía rural',
        descripci_n_del_procedimiento:
          'Construcción de placa huella en la vía rural vereda El Salto',
        codigo_principal_de_categoria: 'V1.72141000',
        modalidad_de_contratacion: 'Licitación pública Obra Publica',
      }),
      ctx,
    );
    expect(r.components.find((c) => c.key === 'keywords')?.raw).toBe(0);
    expect(r.components.find((c) => c.key === 'category')?.raw).toBe(0);
    expect(r.score).toBeLessThan(40);
  });

  it('applies region preference', () => {
    const local = opportunity(); // Antioquia
    const remote = opportunity({ departamento_entidad: 'Nariño' });
    const prefMine = {
      ...ctx,
      profile: { ...DEFAULT_PROFILE, regionPreference: 'prefer-mine' as const },
    };
    expect(scoreOpportunity(local, prefMine).score).toBeGreaterThan(
      scoreOpportunity(remote, prefMine).score,
    );
  });
});
