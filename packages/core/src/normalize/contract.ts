import type { Contract, RawContratoRow } from '../types';
import { parseSocrataDate } from './date';
import { canonicalDepartment } from './department';
import { canonicalEntityOrder, parseUnspsc } from './enums';
import { canonicalModality } from './modality';
import { parseMoney } from './number';
import type { NormalizeResult } from './result';
import { buildSearchText, cleanString, cleanText, normalizeText, parseYesNo } from './text';
import { cleanUrl } from './url';

function dateField(raw: string | undefined, field: string, repairs: string[]): string | null {
  if (raw == null || raw.trim() === '') return null;
  const parsed = parseSocrataDate(raw);
  if (parsed == null) repairs.push(`invalid-date:${field}`);
  return parsed;
}

/** Normalise one raw SECOP II electronic contract row. */
export function normalizeContract(raw: RawContratoRow): NormalizeResult<Contract> {
  const repairs: string[] = [];
  const id = cleanString(raw.id_contrato);
  if (id == null) return { ok: false, reason: 'missing-id' };

  const object = cleanText(raw.objeto_del_contrato);
  const description = cleanText(raw.descripcion_del_proceso);
  if (object == null && description == null)
    return { ok: false, reason: 'missing-title', detail: id };

  const dept = canonicalDepartment(cleanString(raw.departamento));
  const url = cleanUrl(raw.urlproceso);
  if (url.status === 'polluted') repairs.push('polluted-url');
  const unspsc = parseUnspsc(cleanString(raw.codigo_de_categoria_principal));
  const modalityRaw = cleanString(raw.modalidad_de_contratacion);
  const centralizedRaw = cleanString(raw.entidad_centralizada);
  const centralized =
    centralizedRaw == null
      ? null
      : normalizeText(centralizedRaw) === 'centralizada'
        ? true
        : normalizeText(centralizedRaw) === 'descentralizada'
          ? false
          : null;

  const value: Contract = {
    id,
    processPortfolioId: cleanString(raw.proceso_de_compra),
    reference: cleanString(raw.referencia_del_contrato),
    entity: {
      name: cleanString(raw.nombre_entidad) ?? 'Entidad sin nombre',
      nit: cleanString(raw.nit_entidad),
      code: cleanString(raw.codigo_entidad),
      order: canonicalEntityOrder(cleanString(raw.orden)),
      centralized,
      department: dept.name,
      departmentCode: dept.code,
      city: cleanString(raw.ciudad),
    },
    status: cleanString(raw.estado_contrato),
    unspscCode: unspsc.code,
    unspscSegment: unspsc.segment,
    unspscFamily: unspsc.family,
    description: description ?? object ?? '',
    object: object ?? description ?? '',
    contractType: cleanString(raw.tipo_de_contrato),
    modality: canonicalModality(modalityRaw),
    modalityRaw,
    signedAt: dateField(raw.fecha_de_firma, 'fecha_de_firma', repairs),
    startsAt: dateField(raw.fecha_de_inicio_del_contrato, 'fecha_de_inicio_del_contrato', repairs),
    endsAt: dateField(raw.fecha_de_fin_del_contrato, 'fecha_de_fin_del_contrato', repairs),
    supplier: {
      name: cleanString(raw.proveedor_adjudicado),
      docType: cleanString(raw.tipodocproveedor),
      doc: cleanString(raw.documento_proveedor),
      isPyme: parseYesNo(raw.es_pyme),
    },
    value: parseMoney(raw.valor_del_contrato),
    url: url.url,
    urlStatus: url.status,
    searchText: '',
  };
  value.searchText = buildSearchText([
    value.object,
    value.description,
    value.entity.name,
    value.supplier.name,
    value.entity.city,
    value.entity.department,
    value.id,
  ]);
  return { ok: true, value, repairs };
}
