import type { RawDepartamentoRow, RawMunicipioRow } from '@secop-radar/core';
import type { z } from 'zod';
import { soql, type SoqlQuery } from '../soql';
import { datasetDocsUrl, rowSchema, type DatasetInfo } from './common';

/** DIVIPOLA – Códigos municipios (DANE), with centroid coordinates. */
export const MUNICIPIOS: DatasetInfo = {
  id: 'gdxc-w37w',
  name: 'DIVIPOLA - Códigos municipios',
  docsUrl: datasetDocsUrl('gdxc-w37w'),
};

/** DIVIPOLA – Códigos departamentos (DANE), with centroid coordinates. */
export const DEPARTAMENTOS: DatasetInfo = {
  id: 'vcjz-niiq',
  name: 'DIVIPOLA - Códigos departamentos',
  docsUrl: datasetDocsUrl('vcjz-niiq'),
};

export const MUNICIPIOS_FIELDS = [
  'cod_dpto',
  'dpto',
  'cod_mpio',
  'nom_mpio',
  'tipo_municipio',
  'longitud',
  'latitud',
] as const satisfies ReadonlyArray<keyof RawMunicipioRow>;

export const DEPARTAMENTOS_FIELDS = [
  'codigo_departamento',
  'nombre_departamento',
  'longitud',
  'latitud',
] as const satisfies ReadonlyArray<keyof RawDepartamentoRow>;

export const municipioRowSchema = rowSchema(
  MUNICIPIOS_FIELDS,
) as unknown as z.ZodType<RawMunicipioRow>;
export const departamentoRowSchema = rowSchema(
  DEPARTAMENTOS_FIELDS,
) as unknown as z.ZodType<RawDepartamentoRow>;

export function municipiosQuery(): SoqlQuery {
  return soql().select(...MUNICIPIOS_FIELDS);
}

export function departamentosQuery(): SoqlQuery {
  return soql().select(...DEPARTAMENTOS_FIELDS);
}
