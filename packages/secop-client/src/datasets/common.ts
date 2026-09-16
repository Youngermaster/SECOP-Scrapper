import { z } from 'zod';

/** Socrata returns numbers/dates as strings in JSON; accept scalars and coerce to string. */
export const text = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((v) => (typeof v === 'string' ? v : String(v)))
  .optional();

export const socrataUrl = z
  .union([
    z.looseObject({ url: z.string().optional(), description: z.string().optional() }),
    z.string(),
  ])
  .optional();

/** Build a loose row schema from a list of text fields plus explicit overrides. */
export function rowSchema<const F extends readonly string[]>(
  fields: F,
  overrides: Record<string, z.ZodTypeAny> = {},
) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) shape[f] = text;
  Object.assign(shape, overrides);
  return z.looseObject(shape);
}

export interface DatasetInfo {
  id: string;
  name: string;
  /** Human docs page. */
  docsUrl: string;
}

export const SECOP_DOMAIN = 'www.datos.gov.co';

export function datasetDocsUrl(id: string): string {
  return `https://dev.socrata.com/foundry/${SECOP_DOMAIN}/${id}`;
}
