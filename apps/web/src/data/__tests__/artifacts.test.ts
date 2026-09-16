import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatasetFormatError, loadManifest, loadOpportunities, MissingDatasetError } from '../artifacts';

const manifest = {
  schemaVersion: 1,
  generatedAt: '2026-09-16T00:00:00.000Z',
  counts: { opportunities: 1, contracts: 0, municipalities: 0 },
  window: { closingSince: '2026-08-02', publishedFrom: null, publishedTo: null, contractsSince: '2024-09-16' },
  filters: { departments: [], keywords: [], modalities: [], categories: [] },
  source: { domain: 'www.datos.gov.co', processesDataset: 'p6dx-8zbt', contractsDataset: 'jbjy-vk9h' },
  files: { opportunities: 'opportunities.json.gz', contracts: 'contracts.json.gz', geo: 'geo.json' },
};

const opportunity = {
  id: 'CO1.REQ.1',
  portfolioId: null,
  reference: null,
  entity: { name: 'E', nit: null, code: null, order: 'territorial', centralized: null, department: 'Antioquia', departmentCode: '05', city: 'Medellín' },
  title: 'Desarrollo de software',
  description: 'Desarrollo de software',
  phase: null,
  status: 'publicado',
  statusRaw: 'Publicado',
  modality: 'minima-cuantia',
  modalityRaw: 'Mínima cuantía',
  modalityJustification: null,
  contractType: null,
  contractSubtype: null,
  unspscCode: null,
  unspscSegment: null,
  unspscFamily: null,
  additionalCategories: null,
  value: 1000,
  duration: null,
  publishedAt: '2026-09-10',
  lastPublishedAt: '2026-09-10',
  closesAt: '2026-09-20',
  responseOpensAt: null,
  awarded: false,
  award: null,
  url: null,
  urlStatus: 'missing',
  counters: { invited: 0, directInvites: 0, views: 0, interested: 0, responses: 0, uniqueBidders: 0 },
  lots: null,
  searchText: '',
};

function mockFetch(routes: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const key = Object.keys(routes).find((k) => url.endsWith(k));
      return key ? routes[key]!() : new Response('not found', { status: 404 });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('artifact loading', () => {
  it('throws MissingDatasetError on 404 or when the dev server answers index.html', async () => {
    mockFetch({});
    await expect(loadManifest()).rejects.toBeInstanceOf(MissingDatasetError);
    mockFetch({ 'manifest.json': () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) });
    await expect(loadManifest()).rejects.toBeInstanceOf(MissingDatasetError);
  });

  it('validates the manifest shape', async () => {
    mockFetch({ 'manifest.json': () => new Response(JSON.stringify({ nope: true }), { headers: { 'content-type': 'application/json' } }) });
    await expect(loadManifest()).rejects.toBeInstanceOf(DatasetFormatError);
    mockFetch({ 'manifest.json': () => new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } }) });
    await expect(loadManifest()).resolves.toMatchObject({ counts: { opportunities: 1 } });
  });

  it('reads raw gzip bytes and already-decoded bodies alike, and rebuilds searchText', async () => {
    const json = JSON.stringify([opportunity]);
    mockFetch({ 'opportunities.json.gz': () => new Response(gzipSync(Buffer.from(json)), { headers: { 'content-type': 'application/json' } }) });
    const fromGzip = await loadOpportunities(manifest);
    expect(fromGzip[0]?.id).toBe('CO1.REQ.1');
    expect(fromGzip[0]?.searchText).toContain('desarrollo de software');

    mockFetch({ 'opportunities.json.gz': () => new Response(json, { headers: { 'content-type': 'application/json', 'content-encoding': 'gzip' } }) });
    const decoded = await loadOpportunities(manifest);
    expect(decoded).toHaveLength(1);
  });

  it('rejects rows that do not match the schema with a helpful message', async () => {
    mockFetch({ 'opportunities.json.gz': () => new Response(JSON.stringify([{ id: 1 }]), { headers: { 'content-type': 'application/json' } }) });
    await expect(loadOpportunities(manifest)).rejects.toThrow(/pnpm scraper/);
  });
});
