import { DEPARTMENTS, DEPARTMENT_BY_CODE, type DepartmentDef } from '../constants/departments';
import { normalizeKey } from './text';

const ALIAS_INDEX: ReadonlyMap<string, DepartmentDef> = (() => {
  const m = new Map<string, DepartmentDef>();
  for (const d of DEPARTMENTS) {
    m.set(normalizeKey(d.name), d);
    for (const a of d.aliases) m.set(a, d);
  }
  return m;
})();

/** Resolve a department by DANE code ("05", "5") or any known spelling. */
export function findDepartment(value: string | null | undefined): DepartmentDef | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (/^\d{1,2}$/.test(trimmed)) {
    return DEPARTMENT_BY_CODE.get(trimmed.padStart(2, '0')) ?? null;
  }
  const key = normalizeKey(trimmed);
  const direct = ALIAS_INDEX.get(key);
  if (direct) return direct;
  // "Departamento de Antioquia", "Antioquia (Colombia)" …
  const stripped = key.replace(/^DEPARTAMENTO (DE |DEL )?/, '').replace(/ COLOMBIA$/, '');
  return ALIAS_INDEX.get(stripped) ?? null;
}

export interface CanonicalDepartment {
  code: string | null;
  name: string | null;
}

/** Canonical name + code for a raw SECOP department string; unknown strings are kept as name. */
export function canonicalDepartment(raw: string | null | undefined): CanonicalDepartment {
  if (raw == null) return { code: null, name: null };
  const d = findDepartment(raw);
  if (d) return { code: d.code, name: d.name };
  const trimmed = raw.trim();
  return trimmed === '' ? { code: null, name: null } : { code: null, name: trimmed };
}
