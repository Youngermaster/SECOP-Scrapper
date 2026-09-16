import { buildOpportunitySearchText, buildSearchText, type Contract, type DatasetManifest, type GeoData, type Opportunity } from '@secop-radar/core';
import type { z } from 'zod';
import { contractSchema, geoSchema, manifestSchema, opportunitySchema } from './schemas';

export const DATA_BASE = '/data';

export class MissingDatasetError extends Error {
  constructor() {
    super('No local dataset found');
    this.name = 'MissingDatasetError';
  }
}

export class DatasetFormatError extends Error {
  constructor(
    message: string,
    public readonly file: string,
  ) {
    super(message);
    this.name = 'DatasetFormatError';
  }
}

async function fetchBytes(file: string): Promise<Response> {
  const res = await fetch(`${DATA_BASE}/${file}`, { cache: 'no-cache' });
  if (res.status === 404) throw new MissingDatasetError();
  if (!res.ok) throw new DatasetFormatError(`HTTP ${res.status} al cargar ${file}`, file);
  return res;
}

/**
 * Read a JSON artifact. `.gz` files may arrive either already decoded (servers such as
 * Vite/sirv send `Content-Encoding: gzip`, so the browser inflates transparently) or as
 * raw gzip bytes (plain static hosts). Sniff the magic bytes and inflate only when needed.
 */
async function readJson(file: string): Promise<unknown> {
  const res = await fetchBytes(file);
  // Dev servers often serve `index.html` for unknown paths with 200; guard on content type.
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('text/html')) throw new MissingDatasetError();
  const bytes = new Uint8Array(await res.arrayBuffer());
  const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  let text: string;
  if (isGzip) {
    if (typeof DecompressionStream === 'undefined') {
      throw new DatasetFormatError('Este navegador no soporta DecompressionStream', file);
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    text = await new Response(stream).text();
  } else {
    text = new TextDecoder().decode(bytes);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new DatasetFormatError(`El archivo ${file} no es JSON válido`, file);
  }
}

function validate<T>(schema: z.ZodType<T>, data: unknown, file: string): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    const first = r.error.issues[0];
    throw new DatasetFormatError(
      `El archivo ${file} no tiene el formato esperado (${first?.path.join('.') ?? '?'}: ${first?.message ?? 'inválido'}). Vuelve a ejecutar pnpm scraper.`,
      file,
    );
  }
  return r.data;
}

export async function loadManifest(): Promise<DatasetManifest> {
  return validate(manifestSchema, await readJson('manifest.json'), 'manifest.json');
}

export async function loadOpportunities(manifest: DatasetManifest): Promise<Opportunity[]> {
  const file = manifest.files.opportunities;
  const raw = await readJson(file);
  if (!Array.isArray(raw)) throw new DatasetFormatError('Se esperaba una lista', file);
  const arraySchema = opportunitySchema.array();
  const items = validate(arraySchema, raw, file);
  // The search haystack is stripped from the export to keep it small.
  for (const o of items) if (o.searchText === '') o.searchText = buildOpportunitySearchText(o);
  return items;
}

export async function loadContracts(manifest: DatasetManifest): Promise<Contract[]> {
  const file = manifest.files.contracts;
  const raw = await readJson(file);
  if (!Array.isArray(raw)) throw new DatasetFormatError('Se esperaba una lista', file);
  const items = validate(contractSchema.array(), raw, file);
  for (const c of items) {
    if (c.searchText === '') {
      c.searchText = buildSearchText([c.object, c.description, c.entity.name, c.supplier.name, c.entity.city, c.entity.department, c.id]);
    }
  }
  return items;
}

export async function loadGeo(manifest: DatasetManifest): Promise<GeoData> {
  return validate(geoSchema, await readJson(manifest.files.geo), manifest.files.geo);
}

export interface DepartmentsGeoJson {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: { code: string; name: string };
    geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  }>;
}

export async function loadDepartmentsGeoJson(): Promise<DepartmentsGeoJson> {
  const res = await fetch('/geo/departamentos.geojson');
  if (!res.ok) throw new DatasetFormatError('No se pudo cargar el mapa de departamentos', 'departamentos.geojson');
  return (await res.json()) as DepartmentsGeoJson;
}
