import { DEPARTMENTS, DEPARTMENT_BY_CODE, type DepartmentDef } from './constants/departments';
import { findDepartment } from './normalize/department';
import { normalizeKey } from './normalize/text';
import type { Entity, GeoData, Municipality } from './types';

export { DEPARTMENTS, DEPARTMENT_BY_CODE, findDepartment };
export type { DepartmentDef };

/** Where the user is based. City is optional; when set, "my region" means dept + city. */
export interface RegionProfile {
  departmentCode: string;
  city: string | null;
  /** When true, only the city counts as "my region"; otherwise the whole department. */
  cityOnly: boolean;
}

export const DEFAULT_REGION: RegionProfile = {
  departmentCode: '05',
  city: 'Medellín',
  cityOnly: false,
};

export function isMyRegion(
  entity: Pick<Entity, 'departmentCode' | 'city'>,
  region: RegionProfile,
): boolean {
  if (entity.departmentCode == null || entity.departmentCode !== region.departmentCode)
    return false;
  if (!region.cityOnly || region.city == null) return true;
  if (entity.city == null) return false;
  return normalizeKey(entity.city) === normalizeKey(region.city);
}

/** Index municipalities by "<deptCode>|<KEY>" for fast lookup. */
export function buildMunicipalityIndex(geo: GeoData): Map<string, Municipality> {
  const m = new Map<string, Municipality>();
  for (const mun of geo.municipalities) {
    m.set(`${mun.departmentCode}|${mun.key}`, mun);
  }
  return m;
}

const CITY_ALIASES: Readonly<Record<string, string>> = {
  BOGOTA: 'BOGOTA D C',
  'BOGOTA DC': 'BOGOTA D C',
  'BOGOTA D C': 'BOGOTA D C',
  'SANTAFE DE BOGOTA': 'BOGOTA D C',
  CARTAGENA: 'CARTAGENA DE INDIAS',
  ITAGUI: 'ITAGUI',
  'SAN ANDRES': 'SAN ANDRES',
  'SANTA FE DE ANTIOQUIA': 'SANTA FE DE ANTIOQUIA',
  'SANTAFE DE ANTIOQUIA': 'SANTA FE DE ANTIOQUIA',
};

/** Find a municipality for a SECOP city string within a department. */
export function findMunicipality(
  index: Map<string, Municipality>,
  departmentCode: string | null,
  city: string | null,
): Municipality | null {
  if (departmentCode == null || city == null) return null;
  let key = normalizeKey(city);
  key = CITY_ALIASES[key] ?? key;
  const direct = index.get(`${departmentCode}|${key}`);
  if (direct) return direct;
  // "Medellín (Antioquia)" or "MUNICIPIO DE X"
  const stripped = key.replace(/^MUNICIPIO DE /, '').replace(/ \(.*\)$/, '');
  return index.get(`${departmentCode}|${stripped}`) ?? null;
}

/** Fallback geo data built from the static department catalogue (no municipalities). */
export function fallbackGeoData(): GeoData {
  return {
    departments: DEPARTMENTS.map((d) => ({ code: d.code, name: d.name, lat: d.lat, lon: d.lon })),
    municipalities: [],
  };
}
