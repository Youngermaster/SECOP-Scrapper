import type { RawProcesoRow } from '@secop-radar/core';
import type { z } from 'zod';
import { soql, where, type SoqlExpr, type SoqlQuery } from '../soql';
import { datasetDocsUrl, rowSchema, socrataUrl, type DatasetInfo } from './common';

/** SECOP II – Procesos de Contratación. Column names verified live on 2026-09-16. */
export const PROCESOS: DatasetInfo = {
  id: 'p6dx-8zbt',
  name: 'SECOP II - Procesos de Contratación',
  docsUrl: datasetDocsUrl('p6dx-8zbt'),
};

export const PROCESOS_FIELDS = [
  'entidad',
  'nit_entidad',
  'departamento_entidad',
  'ciudad_entidad',
  'ordenentidad',
  'codigo_pci',
  'id_del_proceso',
  'referencia_del_proceso',
  'ppi',
  'id_del_portafolio',
  'nombre_del_procedimiento',
  'descripci_n_del_procedimiento',
  'fase',
  'fecha_de_publicacion_del',
  'fecha_de_ultima_publicaci',
  'fecha_de_publicacion_fase',
  'fecha_de_publicacion_fase_1',
  'fecha_de_publicacion',
  'fecha_de_publicacion_fase_2',
  'fecha_de_publicacion_fase_3',
  'precio_base',
  'modalidad_de_contratacion',
  'justificaci_n_modalidad_de',
  'duracion',
  'unidad_de_duracion',
  'fecha_de_recepcion_de',
  'fecha_de_apertura_de_respuesta',
  'fecha_de_apertura_efectiva',
  'ciudad_de_la_unidad_de',
  'nombre_de_la_unidad_de',
  'proveedores_invitados',
  'proveedores_con_invitacion',
  'visualizaciones_del',
  'proveedores_que_manifestaron',
  'respuestas_al_procedimiento',
  'respuestas_externas',
  'conteo_de_respuestas_a_ofertas',
  'proveedores_unicos_con',
  'numero_de_lotes',
  'estado_del_procedimiento',
  'id_estado_del_procedimiento',
  'adjudicado',
  'id_adjudicacion',
  'codigoproveedor',
  'departamento_proveedor',
  'ciudad_proveedor',
  'fecha_adjudicacion',
  'valor_total_adjudicacion',
  'nombre_del_adjudicador',
  'nombre_del_proveedor',
  'nit_del_proveedor_adjudicado',
  'codigo_principal_de_categoria',
  'estado_de_apertura_del_proceso',
  'tipo_de_contrato',
  'subtipo_de_contrato',
  'categorias_adicionales',
  'urlproceso',
  'codigo_entidad',
  'estado_resumen',
] as const satisfies ReadonlyArray<keyof RawProcesoRow>;

/** The subset we actually store; keeps pages small. */
export const PROCESOS_SELECT = PROCESOS_FIELDS.filter(
  (f) =>
    ![
      'ppi',
      'fecha_de_publicacion_fase',
      'fecha_de_publicacion_fase_1',
      'fecha_de_publicacion',
      'fecha_de_publicacion_fase_2',
      'fecha_de_publicacion_fase_3',
      'fecha_de_apertura_efectiva',
      'id_estado_del_procedimiento',
      'id_adjudicacion',
      'codigoproveedor',
      'departamento_proveedor',
      'ciudad_proveedor',
      'nombre_del_adjudicador',
      'respuestas_externas',
      'conteo_de_respuestas_a_ofertas',
    ].includes(f),
);

export const procesoRowSchema = rowSchema(PROCESOS_FIELDS, {
  urlproceso: socrataUrl,
}) as unknown as z.ZodType<RawProcesoRow>;

export const PROCESOS_COLUMNS = {
  id: 'id_del_proceso',
  publishedAt: 'fecha_de_publicacion_del',
  lastPublishedAt: 'fecha_de_ultima_publicaci',
  closesAt: 'fecha_de_recepcion_de',
  department: 'departamento_entidad',
  city: 'ciudad_entidad',
  modality: 'modalidad_de_contratacion',
  status: 'estado_del_procedimiento',
  description: 'descripci_n_del_procedimiento',
  title: 'nombre_del_procedimiento',
  category: 'codigo_principal_de_categoria',
  value: 'precio_base',
} as const;

export interface ProcesosFilter {
  /** `fecha_de_ultima_publicaci >= since` (ISO date). */
  updatedSince?: string | null;
  /** `fecha_de_recepcion_de >= closingSince`. */
  closingSince?: string | null;
  publishedFrom?: string | null;
  publishedTo?: string | null;
  /** Raw department names as they appear in SECOP (e.g. "Antioquia"). */
  departments?: string[];
  /** Case-insensitive substrings matched against title OR description. */
  keywords?: string[];
  /** Raw modality names. */
  modalities?: string[];
  /** UNSPSC prefixes, e.g. "V1.43", "V1.8111". */
  categoryPrefixes?: string[];
  /** Raw statuses to exclude (e.g. drafts). */
  excludeStatuses?: string[];
  ids?: string[];
}

function ts(iso: string): string {
  return iso.length === 10 ? `${iso}T00:00:00` : iso;
}

/** Translate a scraper filter into a `$where` predicate. */
export function procesosPredicate(f: ProcesosFilter): SoqlExpr | null {
  const parts: Array<SoqlExpr | null> = [];
  const c = PROCESOS_COLUMNS;
  if (f.ids?.length) parts.push(where.in(c.id, f.ids));
  if (f.updatedSince) parts.push(where.gte(c.lastPublishedAt, ts(f.updatedSince)));
  if (f.closingSince) parts.push(where.gte(c.closesAt, ts(f.closingSince)));
  if (f.publishedFrom) parts.push(where.gte(c.publishedAt, ts(f.publishedFrom)));
  if (f.publishedTo) parts.push(where.lte(c.publishedAt, ts(f.publishedTo)));
  if (f.departments?.length) parts.push(where.in(c.department, f.departments));
  if (f.modalities?.length) parts.push(where.in(c.modality, f.modalities));
  if (f.excludeStatuses?.length) parts.push(where.notIn(c.status, f.excludeStatuses));
  if (f.keywords?.length) {
    parts.push(
      where.or(
        ...f.keywords.flatMap((k) => [
          where.containsText(c.description, k),
          where.containsText(c.title, k),
        ]),
      ),
    );
  }
  if (f.categoryPrefixes?.length) {
    parts.push(where.or(...f.categoryPrefixes.map((p) => where.startsWith(c.category, p))));
  }
  const kept = parts.filter((p): p is SoqlExpr => p != null);
  return kept.length ? where.and(...kept) : null;
}

export function procesosQuery(f: ProcesosFilter = {}): SoqlQuery {
  return soql()
    .select(...PROCESOS_SELECT)
    .where(procesosPredicate(f));
}
