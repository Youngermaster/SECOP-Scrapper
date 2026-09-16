import { buildOpportunitySearchText, normalizeProcess, type Opportunity } from '@secop-radar/core';
import { describe, expect, it } from 'vitest';
import { buildSearchIndex, searchIds } from '../search';

function opp(id: string, title: string, entity = 'ALCALDIA DE MEDELLIN'): Opportunity {
  const r = normalizeProcess({
    id_del_proceso: id,
    entidad: entity,
    departamento_entidad: 'Antioquia',
    nombre_del_procedimiento: title,
    descripci_n_del_procedimiento: title,
    estado_del_procedimiento: 'Publicado',
  });
  if (!r.ok) throw new Error(r.reason);
  r.value.searchText = buildOpportunitySearchText(r.value);
  return r.value;
}

describe('search index', () => {
  const index = buildSearchIndex([
    opp('A', 'Desarrollo de software para la gestión documental'),
    opp('B', 'Servicio de robótica educativa para colegios'),
    opp('C', 'Construcción de placa huella', 'MUNICIPIO DE YOLOMBÓ'),
  ]);

  it('returns null for an empty query (no filtering)', () => {
    expect(searchIds(index, '   ')).toBeNull();
  });
  it('is accent- and case-insensitive with prefix matching', () => {
    expect([...(searchIds(index, 'ROBÓTICA') ?? [])]).toEqual(['B']);
    expect([...(searchIds(index, 'robot') ?? [])]).toEqual(['B']);
    expect([...(searchIds(index, 'yolombo') ?? [])]).toEqual(['C']);
  });
  it('requires every term (AND)', () => {
    expect([...(searchIds(index, 'software documental') ?? [])]).toEqual(['A']);
    expect(searchIds(index, 'software robotica')?.size).toBe(0);
  });
  it('tolerates small typos', () => {
    expect([...(searchIds(index, 'sofware') ?? [])]).toEqual(['A']);
  });
});
