import { describe, expect, it } from 'vitest';
import {
  dedupeOpportunities,
  mergeOpportunities,
  normalizeContract,
  normalizeProcess,
} from '../normalize';
import {
  RAW_CONTRACT_ROW,
  RAW_DRAFT_ROW,
  RAW_PUBLISHED_DUPLICATE,
  RAW_PUBLISHED_ROW,
} from './fixtures';

describe('normalizeProcess', () => {
  it('normalises a real draft row with placeholders and a polluted URL', () => {
    const r = normalizeProcess(RAW_DRAFT_ROW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const o = r.value;
    expect(o.id).toBe('CO1.REQ.11035536');
    expect(o.entity.department).toBe('Bogotá D.C.');
    expect(o.entity.departmentCode).toBe('11');
    expect(o.entity.order).toBe('nacional');
    expect(o.entity.centralized).toBe(true);
    expect(o.status).toBe('borrador');
    expect(o.modality).toBe('minima-cuantia');
    expect(o.value).toBe(110500000);
    expect(o.duration).toEqual({ amount: 2, unit: 'meses' });
    expect(o.closesAt).toBe('2026-09-18');
    expect(o.publishedAt).toBeNull();
    expect(o.awarded).toBe(false);
    expect(o.award).toBeNull();
    expect(o.contractSubtype).toBeNull();
    expect(o.additionalCategories).toBeNull();
    expect(o.unspscSegment).toBe('46');
    expect(o.urlStatus).toBe('polluted');
    expect(o.url).toBeNull();
    expect(r.repairs).toContain('polluted-url');
    expect(o.searchText).toContain('reconocimiento facial');
  });

  it('drops rows without id or without any text', () => {
    expect(normalizeProcess({}).ok).toBe(false);
    const r = normalizeProcess({ id_del_proceso: 'X' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing-title');
  });

  it('records invalid dates as repairs instead of dropping', () => {
    const r = normalizeProcess({ ...RAW_PUBLISHED_ROW, fecha_de_recepcion_de: '31/31/2026' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.closesAt).toBeNull();
    expect(r.repairs).toContain('invalid-date:fecha_de_recepcion_de');
  });
});

describe('mergeOpportunities / dedupe', () => {
  it('keeps the usable URL and phase from whichever duplicate has them', () => {
    const a = normalizeProcess(RAW_PUBLISHED_DUPLICATE);
    const b = normalizeProcess(RAW_PUBLISHED_ROW);
    if (!a.ok || !b.ok) throw new Error('fixture');
    const merged = mergeOpportunities(a.value, b.value);
    expect(merged.urlStatus).toBe('ok');
    expect(merged.url).toContain('noticeUID=CO1.NTC.10889582');
    expect(merged.phase).toBe('Presentación de ofertas');
    expect(merged.counters.invited).toBe(3);
    expect(merged.counters.views).toBe(20);
    // symmetric
    const merged2 = mergeOpportunities(b.value, a.value);
    expect(merged2.url).toBe(merged.url);
    expect(merged2.phase).toBe(merged.phase);
  });

  it('prefers the more recent / more advanced row as base', () => {
    const older = normalizeProcess({
      ...RAW_PUBLISHED_ROW,
      fecha_de_ultima_publicaci: '2026-09-10T00:00:00.000',
    });
    const newer = normalizeProcess({
      ...RAW_PUBLISHED_ROW,
      fecha_de_ultima_publicaci: '2026-09-15T00:00:00.000',
      estado_del_procedimiento: 'Evaluación',
    });
    if (!older.ok || !newer.ok) throw new Error('fixture');
    expect(mergeOpportunities(older.value, newer.value).status).toBe('evaluacion');
    expect(mergeOpportunities(newer.value, older.value).status).toBe('evaluacion');
  });

  it('dedupes a list and counts duplicates', () => {
    const rows = [RAW_PUBLISHED_ROW, RAW_PUBLISHED_DUPLICATE, RAW_DRAFT_ROW]
      .map(normalizeProcess)
      .flatMap((r) => (r.ok ? [r.value] : []));
    const { items, duplicates } = dedupeOpportunities(rows);
    expect(items).toHaveLength(2);
    expect(duplicates).toBe(1);
    expect(items.find((o) => o.id === 'CO1.REQ.11035678')?.urlStatus).toBe('ok');
  });
});

describe('normalizeContract', () => {
  it('normalises a real contract row', () => {
    const r = normalizeContract(RAW_CONTRACT_ROW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = r.value;
    expect(c.id).toBe('CO1.PCCNTR.9941325');
    expect(c.processPortfolioId).toBe('CO1.BDOS.10796096');
    expect(c.entity.departmentCode).toBe('68');
    expect(c.entity.centralized).toBe(false);
    expect(c.unspscFamily).toBe('4323');
    expect(c.modality).toBe('minima-cuantia');
    expect(c.signedAt).toBe('2026-09-14');
    expect(c.supplier).toEqual({ name: 'MEGACAD', docType: 'NIT', doc: '805008189', isPyme: true });
    expect(c.value).toBe(4154000);
    expect(c.urlStatus).toBe('ok');
    expect(c.searchText).toContain('rhinoceros');
  });
});
