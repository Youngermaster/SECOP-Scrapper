import { LIFECYCLES, MODALITIES, type Contract, type DatasetManifest, type GeoData, type Opportunity } from '@secop-radar/core';
import { z } from 'zod';

/** Zod schemas for the JSON artifacts. Kept in sync with `@secop-radar/core` types. */

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const entitySchema = z.object({
  name: z.string(),
  nit: nullableString,
  code: nullableString,
  order: z.enum(['nacional', 'territorial', 'corporacion-autonoma', 'desconocido']),
  centralized: z.boolean().nullable(),
  department: nullableString,
  departmentCode: nullableString,
  city: nullableString,
});

export const opportunitySchema: z.ZodType<Opportunity> = z.object({
  id: z.string(),
  portfolioId: nullableString,
  reference: nullableString,
  entity: entitySchema,
  title: z.string(),
  description: z.string(),
  phase: nullableString,
  status: z.enum([
    'publicado',
    'abierto',
    'evaluacion',
    'seleccionado',
    'cancelado',
    'suspendido',
    'borrador',
    'en-aprobacion',
    'aprobado',
    'desconocido',
  ]),
  statusRaw: nullableString,
  modality: z.enum(MODALITIES as [Opportunity['modality'], ...Array<Opportunity['modality']>]),
  modalityRaw: nullableString,
  modalityJustification: nullableString,
  contractType: nullableString,
  contractSubtype: nullableString,
  unspscCode: nullableString,
  unspscSegment: nullableString,
  unspscFamily: nullableString,
  additionalCategories: nullableString,
  value: nullableNumber,
  duration: z
    .object({
      amount: z.number(),
      unit: z.enum(['dias', 'semanas', 'meses', 'anios', 'horas', 'desconocido']),
    })
    .nullable(),
  publishedAt: nullableString,
  lastPublishedAt: nullableString,
  closesAt: nullableString,
  responseOpensAt: nullableString,
  awarded: z.boolean(),
  award: z
    .object({
      supplierName: nullableString,
      supplierNit: nullableString,
      value: nullableNumber,
      date: nullableString,
    })
    .nullable(),
  url: nullableString,
  urlStatus: z.enum(['ok', 'polluted', 'missing']),
  counters: z.object({
    invited: z.number(),
    directInvites: z.number(),
    views: z.number(),
    interested: z.number(),
    responses: z.number(),
    uniqueBidders: z.number(),
  }),
  lots: nullableNumber,
  searchText: z.string(),
});

export const contractSchema: z.ZodType<Contract> = z.object({
  id: z.string(),
  processPortfolioId: nullableString,
  reference: nullableString,
  entity: entitySchema,
  status: nullableString,
  unspscCode: nullableString,
  unspscSegment: nullableString,
  unspscFamily: nullableString,
  description: z.string(),
  object: z.string(),
  contractType: nullableString,
  modality: z.enum(MODALITIES as [Contract['modality'], ...Array<Contract['modality']>]),
  modalityRaw: nullableString,
  signedAt: nullableString,
  startsAt: nullableString,
  endsAt: nullableString,
  supplier: z.object({
    name: nullableString,
    docType: nullableString,
    doc: nullableString,
    isPyme: z.boolean().nullable(),
  }),
  value: nullableNumber,
  url: nullableString,
  urlStatus: z.enum(['ok', 'polluted', 'missing']),
  searchText: z.string(),
});

export const geoSchema: z.ZodType<GeoData> = z.object({
  departments: z.array(z.object({ code: z.string(), name: z.string(), lat: nullableNumber, lon: nullableNumber })),
  municipalities: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      key: z.string(),
      departmentCode: z.string(),
      lat: z.number(),
      lon: z.number(),
    }),
  ),
});

export const manifestSchema: z.ZodType<DatasetManifest> = z.object({
  schemaVersion: z.number(),
  generatedAt: z.string(),
  counts: z.object({ opportunities: z.number(), contracts: z.number(), municipalities: z.number() }),
  window: z.object({
    closingSince: nullableString,
    publishedFrom: nullableString,
    publishedTo: nullableString,
    contractsSince: nullableString,
  }),
  filters: z.object({
    departments: z.array(z.string()),
    keywords: z.array(z.string()),
    modalities: z.array(z.string()),
    categories: z.array(z.string()),
  }),
  source: z.object({ domain: z.string(), processesDataset: z.string(), contractsDataset: z.string() }),
  files: z.object({ opportunities: z.string(), contracts: z.string(), geo: z.string() }),
});

/** Referenced so unused-import lint stays quiet when LIFECYCLES is needed by consumers. */
export const lifecycleValues = LIFECYCLES;
