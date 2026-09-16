import type { Counters, Opportunity, RawProcesoRow } from '../types';
import { parseSocrataDate } from './date';
import { canonicalDepartment } from './department';
import { canonicalDurationUnit, canonicalEntityOrder, canonicalStatus, parseUnspsc } from './enums';
import { canonicalModality } from './modality';
import { parseCount, parseInteger, parseMoney, parseNumber } from './number';
import { canonicalPhase } from './phase';
import type { NormalizeResult } from './result';
import { buildSearchText, cleanString, cleanText, normalizeText, parseYesNo } from './text';
import { cleanUrl } from './url';

function dateField(raw: string | undefined, field: string, repairs: string[]): string | null {
  if (raw == null || raw.trim() === '') return null;
  const parsed = parseSocrataDate(raw);
  if (parsed == null) repairs.push(`invalid-date:${field}`);
  return parsed;
}

function centralized(raw: string | undefined): boolean | null {
  if (raw == null) return null;
  const v = normalizeText(raw);
  if (v === 'centralizada') return true;
  if (v === 'descentralizada') return false;
  return null;
}

/** Normalise one raw SECOP II process row into an `Opportunity`. */
export function normalizeProcess(raw: RawProcesoRow): NormalizeResult<Opportunity> {
  const repairs: string[] = [];
  const id = cleanString(raw.id_del_proceso);
  if (id == null) return { ok: false, reason: 'missing-id' };

  const title = cleanText(raw.nombre_del_procedimiento);
  const description = cleanText(raw.descripci_n_del_procedimiento);
  if (title == null && description == null)
    return { ok: false, reason: 'missing-title', detail: id };

  const entityName = cleanString(raw.entidad) ?? 'Entidad sin nombre';
  if (cleanString(raw.entidad) == null) repairs.push('missing-entity-name');

  const dept = canonicalDepartment(cleanString(raw.departamento_entidad));
  if (dept.name != null && dept.code == null) repairs.push(`unknown-department:${dept.name}`);

  const url = cleanUrl(raw.urlproceso);
  if (url.status === 'polluted') repairs.push('polluted-url');

  const unspsc = parseUnspsc(cleanString(raw.codigo_principal_de_categoria));
  const durationAmount = parseNumber(raw.duracion);
  const durationUnit = canonicalDurationUnit(cleanString(raw.unidad_de_duracion));
  const duration =
    durationAmount != null && durationAmount > 0 && durationUnit !== 'desconocido'
      ? { amount: durationAmount, unit: durationUnit }
      : null;

  const awarded = parseYesNo(raw.adjudicado) ?? false;
  const awardSupplier = cleanString(raw.nombre_del_proveedor);
  const awardValue = parseMoney(raw.valor_total_adjudicacion);
  const awardDate = dateField(raw.fecha_adjudicacion, 'fecha_adjudicacion', repairs);
  const award =
    awarded || awardSupplier != null || awardValue != null
      ? {
          supplierName: awardSupplier,
          supplierNit: cleanString(raw.nit_del_proveedor_adjudicado),
          value: awardValue,
          date: awardDate,
        }
      : null;

  const counters: Counters = {
    invited: parseCount(raw.proveedores_invitados),
    directInvites: parseCount(raw.proveedores_con_invitacion),
    views: parseCount(raw.visualizaciones_del),
    interested: parseCount(raw.proveedores_que_manifestaron),
    responses: parseCount(raw.respuestas_al_procedimiento),
    uniqueBidders: parseCount(raw.proveedores_unicos_con),
  };

  const modalityRaw = cleanString(raw.modalidad_de_contratacion);
  const finalTitle = title ?? description ?? id;
  const finalDescription = description ?? title ?? '';

  const value: Opportunity = {
    id,
    portfolioId: cleanString(raw.id_del_portafolio),
    reference: cleanString(raw.referencia_del_proceso),
    entity: {
      name: entityName,
      nit: cleanString(raw.nit_entidad),
      code: cleanString(raw.codigo_entidad),
      order: canonicalEntityOrder(cleanString(raw.ordenentidad)),
      centralized: centralized(cleanString(raw.codigo_pci) ?? undefined),
      department: dept.name,
      departmentCode: dept.code,
      city: cleanString(raw.ciudad_entidad),
    },
    title: finalTitle,
    description: finalDescription,
    phase: canonicalPhase(cleanString(raw.fase)),
    status: canonicalStatus(cleanString(raw.estado_del_procedimiento)),
    statusRaw: cleanString(raw.estado_del_procedimiento),
    modality: canonicalModality(modalityRaw),
    modalityRaw,
    modalityJustification: cleanString(raw.justificaci_n_modalidad_de),
    contractType: cleanString(raw.tipo_de_contrato),
    contractSubtype: cleanString(raw.subtipo_de_contrato),
    unspscCode: unspsc.code,
    unspscSegment: unspsc.segment,
    unspscFamily: unspsc.family,
    additionalCategories: cleanString(raw.categorias_adicionales),
    value: parseMoney(raw.precio_base),
    duration,
    publishedAt: dateField(raw.fecha_de_publicacion_del, 'fecha_de_publicacion_del', repairs),
    lastPublishedAt: dateField(raw.fecha_de_ultima_publicaci, 'fecha_de_ultima_publicaci', repairs),
    closesAt: dateField(raw.fecha_de_recepcion_de, 'fecha_de_recepcion_de', repairs),
    responseOpensAt: dateField(
      raw.fecha_de_apertura_de_respuesta,
      'fecha_de_apertura_de_respuesta',
      repairs,
    ),
    awarded,
    award,
    url: url.url,
    urlStatus: url.status,
    counters,
    lots: parseInteger(raw.numero_de_lotes),
    searchText: '',
  };
  value.searchText = buildOpportunitySearchText(value);
  return { ok: true, value, repairs };
}

export function buildOpportunitySearchText(o: Opportunity): string {
  return buildSearchText([
    o.title,
    o.description,
    o.entity.name,
    o.entity.city,
    o.entity.department,
    o.reference,
    o.id,
    o.contractType,
    o.unspscCode,
  ]);
}

const STATUS_RANK: Record<Opportunity['status'], number> = {
  seleccionado: 9,
  cancelado: 8,
  suspendido: 7,
  evaluacion: 6,
  publicado: 5,
  abierto: 5,
  aprobado: 3,
  'en-aprobacion': 2,
  borrador: 1,
  desconocido: 0,
};

function pick<T>(a: T | null, b: T | null): T | null {
  return a ?? b;
}

/**
 * Merge two rows that share the same `id_del_proceso`. The dataset publishes
 * duplicates where one copy carries the real URL and phase and the other carries the
 * login-page URL. Strategy: the row with the later `lastPublishedAt` (then the more
 * advanced status) is the base; every null field is filled from the other row; the
 * usable URL always wins; counters take the max.
 */
export function mergeOpportunities(a: Opportunity, b: Opportunity): Opportunity {
  const aKey = `${a.lastPublishedAt ?? ''}|${STATUS_RANK[a.status]}`;
  const bKey = `${b.lastPublishedAt ?? ''}|${STATUS_RANK[b.status]}`;
  const [base, other] = aKey >= bKey ? [a, b] : [b, a];

  const url = base.urlStatus === 'ok' ? base : other.urlStatus === 'ok' ? other : base;
  const merged: Opportunity = {
    ...base,
    portfolioId: pick(base.portfolioId, other.portfolioId),
    reference: pick(base.reference, other.reference),
    entity: {
      ...base.entity,
      nit: pick(base.entity.nit, other.entity.nit),
      code: pick(base.entity.code, other.entity.code),
      department: pick(base.entity.department, other.entity.department),
      departmentCode: pick(base.entity.departmentCode, other.entity.departmentCode),
      city: pick(base.entity.city, other.entity.city),
      centralized: pick(base.entity.centralized, other.entity.centralized),
    },
    description:
      base.description.length >= other.description.length ? base.description : other.description,
    phase: pick(base.phase, other.phase),
    modalityJustification: pick(base.modalityJustification, other.modalityJustification),
    contractType: pick(base.contractType, other.contractType),
    contractSubtype: pick(base.contractSubtype, other.contractSubtype),
    unspscCode: pick(base.unspscCode, other.unspscCode),
    unspscSegment: pick(base.unspscSegment, other.unspscSegment),
    unspscFamily: pick(base.unspscFamily, other.unspscFamily),
    additionalCategories: pick(base.additionalCategories, other.additionalCategories),
    value: pick(base.value, other.value),
    duration: pick(base.duration, other.duration),
    publishedAt: pick(base.publishedAt, other.publishedAt),
    lastPublishedAt: pick(base.lastPublishedAt, other.lastPublishedAt),
    closesAt: pick(base.closesAt, other.closesAt),
    responseOpensAt: pick(base.responseOpensAt, other.responseOpensAt),
    awarded: base.awarded || other.awarded,
    award: pick(base.award, other.award),
    url: url.url,
    urlStatus: url.urlStatus,
    counters: {
      invited: Math.max(base.counters.invited, other.counters.invited),
      directInvites: Math.max(base.counters.directInvites, other.counters.directInvites),
      views: Math.max(base.counters.views, other.counters.views),
      interested: Math.max(base.counters.interested, other.counters.interested),
      responses: Math.max(base.counters.responses, other.counters.responses),
      uniqueBidders: Math.max(base.counters.uniqueBidders, other.counters.uniqueBidders),
    },
    lots: pick(base.lots, other.lots),
    searchText: '',
  };
  merged.searchText = buildOpportunitySearchText(merged);
  return merged;
}

/** Collapse a list of opportunities into one per id, merging duplicates. */
export function dedupeOpportunities(list: Iterable<Opportunity>): {
  items: Opportunity[];
  duplicates: number;
} {
  const byId = new Map<string, Opportunity>();
  let duplicates = 0;
  for (const item of list) {
    const existing = byId.get(item.id);
    if (existing) {
      duplicates += 1;
      byId.set(item.id, mergeOpportunities(existing, item));
    } else {
      byId.set(item.id, item);
    }
  }
  return { items: [...byId.values()], duplicates };
}
