import { DEFAULT_REGION, enrichOpportunity, normalizeProcess } from '@secop-radar/core';
import { describe, expect, it } from 'vitest';
import { csvCell, opportunitiesToCsv } from '../csv';

describe('csv', () => {
  it('escapes cells', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('multi\nline')).toBe('"multi\nline"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(42)).toBe('42');
  });
  it('builds a CSV with BOM, header and one row per opportunity', () => {
    const r = normalizeProcess({
      id_del_proceso: 'CO1.REQ.1',
      entidad: 'ALCALDIA, DE MEDELLIN',
      departamento_entidad: 'Antioquia',
      nombre_del_procedimiento: 'Desarrollo de software',
      descripci_n_del_procedimiento: 'Desarrollo de software',
      modalidad_de_contratacion: 'Mínima cuantía',
      estado_del_procedimiento: 'Publicado',
      fecha_de_recepcion_de: '2026-09-20T00:00:00.000',
      precio_base: '50000000',
    });
    if (!r.ok) throw new Error(r.reason);
    const csv = opportunitiesToCsv([
      enrichOpportunity(r.value, { todayISO: '2026-09-16', region: DEFAULT_REGION }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]?.startsWith('\uFEFFpuntaje,id,referencia,titulo,entidad')).toBe(true);
    expect(lines[1]).toContain('"ALCALDIA, DE MEDELLIN"');
    expect(lines[1]).toContain('Mínima cuantía');
    expect(lines[1]).toContain(',4,');
    expect(lines).toHaveLength(3);
  });
});
