import { describe, expect, it } from 'vitest';
import { bucketForValue, countBy, monthlySeries, weeklySeries } from '../buckets';
import { enrichAll } from '../enrich';
import {
  applyFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  filterStateSchema,
  sortOpportunities,
} from '../filters';
import { DEFAULT_REGION, findMunicipality, buildMunicipalityIndex, isMyRegion } from '../geo';
import {
  contractsForPortfolio,
  entityHistory,
  similarContracts,
  topEntities,
  topSuppliers,
  valueStats,
} from '../intel';
import { normalizeContract, normalizeMunicipality } from '../normalize';
import { opportunity, RAW_CONTRACT_ROW, TODAY } from './fixtures';

const ctx = { todayISO: TODAY, region: DEFAULT_REGION };

function items() {
  return enrichAll(
    [
      opportunity(), // Antioquia, open, software, 48M, mínima cuantía
      opportunity({
        id_del_proceso: 'B',
        departamento_entidad: 'Nariño',
        precio_base: '900000000',
      }),
      opportunity({ id_del_proceso: 'C', fecha_de_recepcion_de: '2026-09-01T00:00:00.000' }), // closed
      opportunity({
        id_del_proceso: 'D',
        modalidad_de_contratacion: 'Licitación pública',
        precio_base: undefined,
      }),
      opportunity({
        id_del_proceso: 'E',
        ciudad_entidad: 'Medellín',
        urlproceso: { url: 'https://community.secop.gov.co/STS/Users/Login/Index' },
      }),
    ],
    ctx,
  );
}

describe('filters', () => {
  it('defaults to open processes only', () => {
    const r = applyFilters(items(), DEFAULT_FILTERS);
    expect(r.map((x) => x.opportunity.id).sort()).toEqual(['B', 'CO1.REQ.11035678', 'D', 'E']);
  });
  it('region modes', () => {
    const all = items();
    expect(
      applyFilters(all, { ...DEFAULT_FILTERS, regionMode: 'exclude-mine' }).map(
        (x) => x.opportunity.id,
      ),
    ).toEqual(['B']);
    expect(applyFilters(all, { ...DEFAULT_FILTERS, regionMode: 'only-mine' })).toHaveLength(3);
  });
  it('value range with/without unknown values', () => {
    const all = items();
    const inRange = applyFilters(all, {
      ...DEFAULT_FILTERS,
      valueMin: 10_000_000,
      valueMax: 100_000_000,
    });
    expect(inRange.map((x) => x.opportunity.id).sort()).toEqual(['CO1.REQ.11035678', 'D', 'E']);
    const strict = applyFilters(all, {
      ...DEFAULT_FILTERS,
      valueMin: 10_000_000,
      valueMax: 100_000_000,
      includeUnknownValue: false,
    });
    expect(strict.map((x) => x.opportunity.id).sort()).toEqual(['CO1.REQ.11035678', 'E']);
  });
  it('rup, modality, url, text and score filters', () => {
    const all = items();
    expect(
      applyFilters(all, { ...DEFAULT_FILTERS, rup: 'required' }).map((x) => x.opportunity.id),
    ).toEqual(['D']);
    expect(
      applyFilters(all, { ...DEFAULT_FILTERS, modalities: ['licitacion-publica'] }),
    ).toHaveLength(1);
    expect(
      applyFilters(all, { ...DEFAULT_FILTERS, onlyWithUrl: true }).some(
        (x) => x.opportunity.id === 'E',
      ),
    ).toBe(false);
    expect(
      applyFilters(all, DEFAULT_FILTERS, { matchedIds: new Set(['B']) }).map(
        (x) => x.opportunity.id,
      ),
    ).toEqual(['B']);
    expect(applyFilters(all, { ...DEFAULT_FILTERS, minScore: 101 })).toHaveLength(0);
    expect(
      applyFilters(all, { ...DEFAULT_FILTERS, cities: ['medellin'] }).map((x) => x.opportunity.id),
    ).toEqual(['E']);
    expect(
      applyFilters(all, { ...DEFAULT_FILTERS, departments: ['52'] }).map((x) => x.opportunity.id),
    ).toEqual(['B']);
    expect(
      applyFilters(all, { ...DEFAULT_FILTERS, closesFrom: '2026-09-20', lifecycles: [] }),
    ).toHaveLength(4);
  });
  it('sorts with nulls last and stable ties', () => {
    const all = items();
    const byValueAsc = sortOpportunities(all, 'value', 'asc').map((x) => x.opportunity.value);
    expect(byValueAsc[byValueAsc.length - 1]).toBeNull();
    expect(byValueAsc[0]).toBe(48_000_000);
    const byValueDesc = sortOpportunities(all, 'value', 'desc').map((x) => x.opportunity.value);
    expect(byValueDesc[0]).toBe(900_000_000);
    expect(byValueDesc[byValueDesc.length - 1]).toBeNull();
    const byScore = sortOpportunities(all, 'score', 'desc');
    expect(byScore[0]!.score.score).toBeGreaterThanOrEqual(byScore[1]!.score.score);
  });
  it('parses and counts filter state', () => {
    expect(filterStateSchema.parse({ query: 'app' }).lifecycles).toEqual(['open']);
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    expect(
      countActiveFilters({ ...DEFAULT_FILTERS, query: 'x', rup: 'required', lifecycles: [] }),
    ).toBe(3);
  });
});

describe('geo', () => {
  it('detects my region by department or city', () => {
    expect(isMyRegion({ departmentCode: '05', city: 'Bello' }, DEFAULT_REGION)).toBe(true);
    expect(
      isMyRegion({ departmentCode: '05', city: 'Bello' }, { ...DEFAULT_REGION, cityOnly: true }),
    ).toBe(false);
    expect(
      isMyRegion({ departmentCode: '05', city: 'MEDELLIN' }, { ...DEFAULT_REGION, cityOnly: true }),
    ).toBe(true);
    expect(isMyRegion({ departmentCode: null, city: 'Medellín' }, DEFAULT_REGION)).toBe(false);
  });
  it('finds municipalities accent-insensitively', () => {
    const m = normalizeMunicipality({
      cod_dpto: '05',
      dpto: 'ANTIOQUIA',
      cod_mpio: '05360',
      nom_mpio: 'ITAGÜÍ',
      latitud: '6,184',
      longitud: '-75,6',
    });
    if (!m.ok) throw new Error('fixture');
    expect(m.value.name).toBe('Itagüí');
    const idx = buildMunicipalityIndex({ departments: [], municipalities: [m.value] });
    expect(findMunicipality(idx, '05', 'Itagui')?.code).toBe('05360');
    expect(findMunicipality(idx, '05', 'MUNICIPIO DE ITAGÜÍ')?.code).toBe('05360');
    expect(findMunicipality(idx, '11', 'Itagui')).toBeNull();
  });
});

describe('buckets', () => {
  it('buckets values and counts', () => {
    expect(bucketForValue(null).key).toBe('unknown');
    expect(bucketForValue(5_000_000).key).toBe('lt10m');
    expect(bucketForValue(10_000_000).key).toBe('10-50m');
    expect(bucketForValue(5_000_000_000).key).toBe('gt1b');
    const rows = countBy(items(), (x) => x.opportunity.entity.departmentCode);
    expect(rows[0]).toMatchObject({ key: '05', count: 4 });
  });
  it('builds weekly and monthly series', () => {
    const list = [{ d: '2026-09-14' }, { d: '2026-09-16' }, { d: '2026-09-22' }, { d: null }];
    expect(weeklySeries(list, (x) => x.d)).toEqual([
      { period: '2026-09-14', count: 2 },
      { period: '2026-09-21', count: 1 },
    ]);
    expect(monthlySeries(list, (x) => x.d)).toEqual([{ period: '2026-09', count: 3 }]);
  });
});

describe('intel', () => {
  const c1 = normalizeContract(RAW_CONTRACT_ROW);
  const c2 = normalizeContract({
    ...RAW_CONTRACT_ROW,
    id_contrato: 'K2',
    valor_del_contrato: '10000000',
    proveedor_adjudicado: 'ACME',
    documento_proveedor: '1',
    es_pyme: 'No',
  });
  const c3 = normalizeContract({
    ...RAW_CONTRACT_ROW,
    id_contrato: 'K3',
    nombre_entidad: 'OTRA',
    nit_entidad: '999',
    valor_del_contrato: '0',
  });
  if (!c1.ok || !c2.ok || !c3.ok) throw new Error('fixture');
  const contracts = [c1.value, c2.value, c3.value];

  it('computes value stats', () => {
    const s = valueStats([4_154_000, 10_000_000, null]);
    expect(s.count).toBe(3);
    expect(s.withValue).toBe(2);
    expect(s.median).toBeCloseTo(7_077_000);
    expect(s.mean).toBeCloseTo(7_077_000);
    expect(valueStats([]).median).toBeNull();
  });
  it('ranks suppliers and entities', () => {
    const s = topSuppliers(contracts);
    expect(s[0]?.label).toBe('MEGACAD');
    expect(s[0]?.count).toBe(2);
    expect(s[0]?.extra).toBe('PYME');
    const e = topEntities(contracts);
    expect(e[0]?.label).toBe('UNIDADES TECNOLOGICAS DE SANTANDER');
  });
  it('summarises an entity history by NIT', () => {
    const h = entityHistory(contracts, { nit: '890208727', name: 'x' });
    expect(h.contracts).toBe(2);
    expect(h.stats.total).toBe(14_154_000);
    expect(h.pymeShare).toBe(0.5);
    expect(h.modalityMix[0]).toEqual({ modality: 'minima-cuantia', count: 2 });
  });
  it('joins contracts by portfolio id and finds similar contracts', () => {
    expect(contractsForPortfolio(contracts, 'CO1.BDOS.10796096')).toHaveLength(3);
    expect(contractsForPortfolio(contracts, null)).toEqual([]);
    const sim = similarContracts(
      contracts,
      opportunity({ codigo_principal_de_categoria: 'V1.43232101' }),
    );
    expect(sim.length).toBeGreaterThan(0);
  });
});
