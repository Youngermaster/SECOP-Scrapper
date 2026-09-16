import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { normalizeProcess, type Opportunity, type RawProcesoRow } from '@secop-radar/core';
import { afterEach, describe, expect, it } from 'vitest';
import { stripLeadingDoubleDash } from '../args';
import { contentHash, LocalStore } from '../db/database';
import { exportArtifacts } from '../export/exporter';
import { resolveOptions } from '../options';
import { buildContractsFilter, cleanContractRows } from '../sync/contracts';
import { buildProcessPasses, cleanProcessRows, reconcileWithStored } from '../sync/processes';

const GOOD_URL =
  'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.1';
const BAD_URL = 'https://community.secop.gov.co/STS/Users/Login/Index';

function raw(over: Partial<RawProcesoRow> = {}): RawProcesoRow {
  return {
    id_del_proceso: 'CO1.REQ.1',
    entidad: 'ALCALDIA DE MEDELLIN',
    departamento_entidad: 'Antioquia',
    ciudad_entidad: 'Medellín',
    nombre_del_procedimiento: 'Desarrollo de software',
    descripci_n_del_procedimiento: 'Desarrollo de software para la alcaldía',
    modalidad_de_contratacion: 'Mínima cuantía',
    estado_del_procedimiento: 'Publicado',
    fecha_de_publicacion_del: '2026-09-10T00:00:00.000',
    fecha_de_ultima_publicaci: '2026-09-10T00:00:00.000',
    fecha_de_recepcion_de: '2026-09-20T00:00:00.000',
    precio_base: '50000000',
    adjudicado: 'No',
    urlproceso: { url: GOOD_URL },
    ...over,
  };
}

function opp(over: Partial<RawProcesoRow> = {}): Opportunity {
  const r = normalizeProcess(raw(over));
  if (!r.ok) throw new Error(r.reason);
  return r.value;
}

const tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('args', () => {
  it('drops a forwarded "--"', () => {
    expect(stripLeadingDoubleDash(['node', 'cli', '--', '--since', 'x'])).toEqual([
      'node',
      'cli',
      '--since',
      'x',
    ]);
    expect(stripLeadingDoubleDash(['node', 'cli', '--since', 'x'])).toEqual([
      'node',
      'cli',
      '--since',
      'x',
    ]);
  });
});

describe('cleanProcessRows', () => {
  it('normalises, dedupes and reports drop/repair reasons', () => {
    const rows = [
      raw(),
      raw({ urlproceso: { url: BAD_URL }, fase: undefined }),
      raw({
        id_del_proceso: 'CO1.REQ.2',
        fecha_de_recepcion_de: 'bad',
        urlproceso: { url: BAD_URL },
      }),
      { entidad: 'no id' },
      { id_del_proceso: 'CO1.REQ.3' },
    ];
    const r = cleanProcessRows(rows);
    expect(r.items).toHaveLength(2);
    expect(r.duplicates).toBe(1);
    expect(r.dropped).toBe(2);
    expect(r.dropReasons).toEqual({ 'missing-id': 1, 'missing-title': 1 });
    expect(r.repaired).toBe(2);
    expect(r.repairReasons).toEqual({ 'polluted-url': 2, 'invalid-date:fecha_de_recepcion_de': 1 });
    expect(r.items.find((i) => i.id === 'CO1.REQ.1')?.urlStatus).toBe('ok');
  });
});

describe('reconcileWithStored', () => {
  it('keeps a usable URL from the stored copy but takes current state from the API', () => {
    const stored = opp({ estado_del_procedimiento: 'Publicado' });
    const incoming = opp({
      estado_del_procedimiento: 'Cancelado',
      urlproceso: { url: BAD_URL },
      fase: undefined,
    });
    const merged = reconcileWithStored(stored, incoming);
    expect(merged.status).toBe('cancelado');
    expect(merged.urlStatus).toBe('ok');
    expect(merged.url).toBe(GOOD_URL);
    expect(merged.phase).toBe(stored.phase);
  });
  it('never downgrades a good incoming URL', () => {
    const stored = opp({ urlproceso: { url: BAD_URL } });
    const incoming = opp();
    expect(reconcileWithStored(stored, incoming).url).toBe(GOOD_URL);
  });
});

describe('LocalStore', () => {
  it('upserts idempotently with hash-based change detection', () => {
    const store = new LocalStore(':memory:');
    const now = '2026-09-16T00:00:00.000Z';
    const a = opp();
    const b = opp({ id_del_proceso: 'CO1.REQ.2' });
    expect(store.upsertProcesses([a, b], now)).toEqual({ inserted: 2, updated: 0, unchanged: 0 });
    expect(store.upsertProcesses([a, b], now)).toEqual({ inserted: 0, updated: 0, unchanged: 2 });
    const changed = opp({ estado_del_procedimiento: 'Evaluación' });
    expect(store.upsertProcesses([changed], now)).toEqual({
      inserted: 0,
      updated: 1,
      unchanged: 0,
    });
    expect(store.getProcess('CO1.REQ.1')?.status).toBe('evaluacion');
    expect(store.countProcesses()).toBe(2);
    expect(store.maxProcessLastPublished()).toBe('2026-09-10');
    store.setState('processes.watermark', '2026-09-10');
    expect(store.getState('processes.watermark')).toBe('2026-09-10');
    store.close();
  });

  it('applies the reconcile hook on update', () => {
    const store = new LocalStore(':memory:');
    const now = '2026-09-16T00:00:00.000Z';
    store.upsertProcesses([opp()], now);
    const polluted = opp({ urlproceso: { url: BAD_URL } });
    store.upsertProcesses([polluted], now, reconcileWithStored);
    expect(store.getProcess('CO1.REQ.1')?.url).toBe(GOOD_URL);
    store.close();
  });

  it('selects processes for export by closing window and caps rows', () => {
    const store = new LocalStore(':memory:');
    const now = '2026-09-16T00:00:00.000Z';
    store.upsertProcesses(
      [
        opp({ id_del_proceso: 'old', fecha_de_recepcion_de: '2026-01-01T00:00:00.000' }),
        opp({ id_del_proceso: 'recent', fecha_de_recepcion_de: '2026-09-10T00:00:00.000' }),
        opp({ id_del_proceso: 'future', fecha_de_recepcion_de: '2026-10-10T00:00:00.000' }),
        opp({
          id_del_proceso: 'noclose',
          fecha_de_recepcion_de: undefined,
          fecha_de_ultima_publicaci: '2026-09-15T00:00:00.000',
        }),
        opp({
          id_del_proceso: 'noclose-old',
          fecha_de_recepcion_de: undefined,
          fecha_de_ultima_publicaci: '2026-01-15T00:00:00.000',
        }),
      ],
      now,
    );
    const ids = store.selectProcessesForExport('2026-08-17', '2026-08-17', 100).map((o) => o.id);
    expect(ids.sort()).toEqual(['future', 'noclose', 'recent']);
    expect(store.selectProcessesForExport('2026-08-17', '2026-08-17', 1)).toHaveLength(1);
    store.close();
  });

  it('hashes stably regardless of key order', () => {
    expect(contentHash({ a: 1, b: [1, { c: 2 }] })).toBe(contentHash({ b: [1, { c: 2 }], a: 1 }));
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
  });
});

describe('passes and filters', () => {
  it('builds the default closing-window pass and extra passes', () => {
    const base = resolveOptions({ dbPath: 'x', exportDir: 'y', today: '2026-09-16' });
    expect(buildProcessPasses(base)).toHaveLength(1);
    expect(buildProcessPasses(base)[0]?.filter.closingSince).toBe('2026-08-17');
    const withSince = resolveOptions({
      dbPath: 'x',
      exportDir: 'y',
      today: '2026-09-16',
      since: '2026-09-01',
      includeDrafts: false,
      departments: ['Antioquia'],
    });
    const passes = buildProcessPasses(withSince);
    expect(passes).toHaveLength(2);
    expect(passes[1]?.filter.updatedSince).toBe('2026-09-01');
    expect(passes[1]?.filter.excludeStatuses).toEqual(['Borrador', 'En aprobación', 'Aprobado']);
    expect(passes[1]?.filter.departments).toEqual(['Antioquia']);
    const range = resolveOptions({
      dbPath: 'x',
      exportDir: 'y',
      today: '2026-09-16',
      publishedFrom: '2026-06-01',
      publishedTo: '2026-06-30',
    });
    expect(buildProcessPasses(range)[0]?.filter.publishedFrom).toBe('2026-06-01');
    expect(buildProcessPasses(range)[0]?.filter.closingSince).toBeUndefined();
  });
  it('derives the contracts window from months', () => {
    const o = resolveOptions({
      dbPath: 'x',
      exportDir: 'y',
      today: '2026-09-16',
      contractsMonths: 24,
    });
    expect(buildContractsFilter(o).signedSince).toBe('2024-09-16');
    expect(buildContractsFilter(o).categoryPrefixes).toEqual(['V1.43', 'V1.8111', 'V1.8116']);
  });
  it('cleans contract rows', () => {
    const r = cleanContractRows([
      {
        id_contrato: 'C1',
        objeto_del_contrato: 'Software',
        nombre_entidad: 'E',
        urlproceso: { url: BAD_URL },
      },
      { id_contrato: 'C1', objeto_del_contrato: 'Software', nombre_entidad: 'E' },
      { objeto_del_contrato: 'sin id' },
    ]);
    expect(r.items).toHaveLength(1);
    expect(r.duplicates).toBe(1);
    expect(r.dropped).toBe(1);
    expect(r.repairReasons).toEqual({ 'polluted-url': 1 });
  });
});

describe('exportArtifacts', () => {
  it('writes gzip JSON artifacts plus a manifest', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'secop-export-'));
    tmpDirs.push(dir);
    const store = new LocalStore(':memory:');
    store.upsertProcesses(
      [opp(), opp({ id_del_proceso: 'CO1.REQ.2' })],
      '2026-09-16T00:00:00.000Z',
    );
    const o = resolveOptions({
      dbPath: ':memory:',
      exportDir: dir,
      today: '2026-09-16',
      departments: ['Antioquia'],
    });
    const result = exportArtifacts(store, o);
    expect(result.manifest.counts.opportunities).toBe(2);
    expect(result.manifest.filters.departments).toEqual(['Antioquia']);
    expect(result.manifest.files.opportunities).toBe('opportunities.json.gz');
    expect(existsSync(path.join(dir, 'manifest.json'))).toBe(true);
    const opps = JSON.parse(
      gunzipSync(readFileSync(path.join(dir, 'opportunities.json.gz'))).toString(),
    ) as Opportunity[];
    expect(opps).toHaveLength(2);
    expect(opps[0]?.searchText).toBe('');
    const geo = JSON.parse(readFileSync(path.join(dir, 'geo.json'), 'utf8')) as {
      departments: unknown[];
    };
    expect(geo.departments.length).toBe(33); // fallback catalogue when DIVIPOLA not fetched
    store.close();
  });
});
