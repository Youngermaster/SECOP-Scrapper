import type { RawContratoRow } from '@secop-radar/core';
import type { z } from 'zod';
import { soql, where, type SoqlExpr, type SoqlQuery } from '../soql';
import { datasetDocsUrl, rowSchema, socrataUrl, type DatasetInfo } from './common';

/** SECOP II – Contratos Electrónicos. Column names verified live on 2026-09-16. */
export const CONTRATOS: DatasetInfo = {
  id: 'jbjy-vk9h',
  name: 'SECOP II - Contratos Electrónicos',
  docsUrl: datasetDocsUrl('jbjy-vk9h'),
};

export const CONTRATOS_FIELDS = [
  'nombre_entidad',
  'nit_entidad',
  'departamento',
  'ciudad',
  'localizaci_n',
  'orden',
  'sector',
  'rama',
  'entidad_centralizada',
  'proceso_de_compra',
  'id_contrato',
  'referencia_del_contrato',
  'estado_contrato',
  'codigo_de_categoria_principal',
  'descripcion_del_proceso',
  'tipo_de_contrato',
  'modalidad_de_contratacion',
  'justificacion_modalidad_de',
  'fecha_de_firma',
  'fecha_de_inicio_del_contrato',
  'fecha_de_fin_del_contrato',
  'tipodocproveedor',
  'documento_proveedor',
  'proveedor_adjudicado',
  'es_grupo',
  'es_pyme',
  'valor_del_contrato',
  'urlproceso',
  'ultima_actualizacion',
  'codigo_entidad',
  'codigo_proveedor',
  'objeto_del_contrato',
  'duraci_n_del_contrato',
] as const satisfies ReadonlyArray<keyof RawContratoRow>;

export const CONTRATOS_SELECT = CONTRATOS_FIELDS.filter(
  (f) =>
    ![
      'localizaci_n',
      'rama',
      'justificacion_modalidad_de',
      'es_grupo',
      'codigo_proveedor',
    ].includes(f),
);

export const contratoRowSchema = rowSchema(CONTRATOS_FIELDS, {
  urlproceso: socrataUrl,
}) as unknown as z.ZodType<RawContratoRow>;

export const CONTRATOS_COLUMNS = {
  id: 'id_contrato',
  signedAt: 'fecha_de_firma',
  updatedAt: 'ultima_actualizacion',
  department: 'departamento',
  category: 'codigo_de_categoria_principal',
  description: 'descripcion_del_proceso',
  object: 'objeto_del_contrato',
  modality: 'modalidad_de_contratacion',
} as const;

export interface ContratosFilter {
  signedSince?: string | null;
  signedUntil?: string | null;
  updatedSince?: string | null;
  departments?: string[];
  keywords?: string[];
  categoryPrefixes?: string[];
  modalities?: string[];
  ids?: string[];
}

function ts(iso: string): string {
  return iso.length === 10 ? `${iso}T00:00:00` : iso;
}

export function contratosPredicate(f: ContratosFilter): SoqlExpr | null {
  const parts: SoqlExpr[] = [];
  const c = CONTRATOS_COLUMNS;
  if (f.ids?.length) parts.push(where.in(c.id, f.ids));
  if (f.signedSince) parts.push(where.gte(c.signedAt, ts(f.signedSince)));
  if (f.signedUntil) parts.push(where.lte(c.signedAt, ts(f.signedUntil)));
  if (f.updatedSince) parts.push(where.gte(c.updatedAt, ts(f.updatedSince)));
  if (f.departments?.length) parts.push(where.in(c.department, f.departments));
  if (f.modalities?.length) parts.push(where.in(c.modality, f.modalities));
  const textOr: SoqlExpr[] = [];
  if (f.keywords?.length) {
    for (const k of f.keywords) {
      textOr.push(where.containsText(c.object, k), where.containsText(c.description, k));
    }
  }
  if (f.categoryPrefixes?.length) {
    for (const p of f.categoryPrefixes) textOr.push(where.startsWith(c.category, p));
  }
  if (textOr.length) parts.push(where.or(...textOr));
  return parts.length ? where.and(...parts) : null;
}

export function contratosQuery(f: ContratosFilter = {}): SoqlQuery {
  return soql()
    .select(...CONTRATOS_SELECT)
    .where(contratosPredicate(f));
}
