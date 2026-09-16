import type { Department, Municipality, RawDepartamentoRow, RawMunicipioRow } from '../types';
import { findDepartment } from './department';
import { parseNumber } from './number';
import type { NormalizeResult } from './result';
import { cleanString, normalizeKey } from './text';

/** Title-case an upper-case DIVIPOLA name ("SANTA FE DE ANTIOQUIA" → "Santa Fe de Antioquia"). */
export function titleCaseSpanish(name: string): string {
  const small = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'el', 'en']);
  return name
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function normalizeMunicipality(raw: RawMunicipioRow): NormalizeResult<Municipality> {
  const code = cleanString(raw.cod_mpio);
  const name = cleanString(raw.nom_mpio);
  const lat = parseNumber(raw.latitud);
  const lon = parseNumber(raw.longitud);
  if (code == null || name == null) return { ok: false, reason: 'missing-id' };
  if (lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return { ok: false, reason: 'invalid-row', detail: `bad-coordinates:${code}` };
  }
  const departmentCode = (cleanString(raw.cod_dpto) ?? code.slice(0, 2)).padStart(2, '0');
  return {
    ok: true,
    repairs: [],
    value: {
      code: code.padStart(5, '0'),
      name: titleCaseSpanish(name),
      key: normalizeKey(name),
      departmentCode,
      lat,
      lon,
    },
  };
}

export function normalizeDepartmentRow(raw: RawDepartamentoRow): NormalizeResult<Department> {
  const codeRaw = cleanString(raw.codigo_departamento);
  const nameRaw = cleanString(raw.nombre_departamento);
  const def = findDepartment(codeRaw) ?? findDepartment(nameRaw);
  if (!def)
    return {
      ok: false,
      reason: 'invalid-row',
      detail: `unknown-department:${nameRaw ?? codeRaw ?? '?'}`,
    };
  const lat = parseNumber(raw.latitud);
  const lon = parseNumber(raw.longitud);
  return {
    ok: true,
    repairs: [],
    value: {
      code: def.code,
      name: def.name,
      lat: lat != null && Math.abs(lat) <= 90 ? lat : def.lat,
      lon: lon != null && Math.abs(lon) <= 180 ? lon : def.lon,
    },
  };
}
