import { describe, expect, it } from 'vitest';
import { literal, soql, SoqlError, where } from '../soql';
import { contratosPredicate, procesosPredicate, procesosQuery } from '../index';

describe('literal', () => {
  it('escapes quotes and formats scalars', () => {
    expect(literal("O'Brien")).toBe("'O''Brien'");
    expect(literal(42)).toBe('42');
    expect(literal(true)).toBe('true');
    expect(literal(null)).toBe('NULL');
    expect(literal(new Date(Date.UTC(2026, 8, 16, 5, 4, 3)))).toBe("'2026-09-16T05:04:03'");
    expect(() => literal(Number.NaN)).toThrow(SoqlError);
  });
});

describe('where', () => {
  it('builds comparison and list predicates', () => {
    expect(where.eq('estado', 'Publicado').soql).toBe("estado = 'Publicado'");
    expect(where.gte('fecha_de_recepcion_de', '2026-09-16T00:00:00').soql).toBe(
      "fecha_de_recepcion_de >= '2026-09-16T00:00:00'",
    );
    expect(where.in('departamento_entidad', ['Antioquia', "Bogotá D'C"]).soql).toBe(
      "departamento_entidad in ('Antioquia', 'Bogotá D''C')",
    );
    expect(where.between('precio_base', 1, 2).soql).toBe('precio_base between 1 and 2');
    expect(where.startsWith('codigo_principal_de_categoria', 'V1.43').soql).toBe(
      "starts_with(codigo_principal_de_categoria, 'V1.43')",
    );
    expect(where.containsText('descripci_n_del_procedimiento', 'software%').soql).toBe(
      "upper(descripci_n_del_procedimiento) like '%SOFTWARE%'",
    );
    expect(where.isNull('fase').soql).toBe('fase IS NULL');
  });
  it('composes and/or/not and drops falsy parts', () => {
    const e = where.and(
      where.eq('a', 1),
      null,
      where.or(where.eq('b', 2), false, where.eq('c', 3)),
    );
    expect(e.soql).toBe('(a = 1 AND (b = 2 OR c = 3))');
    expect(where.and(where.eq('a', 1)).soql).toBe('a = 1');
    expect(where.not(where.eq('a', 1)).soql).toBe('NOT (a = 1)');
    expect(() => where.and(null)).toThrow(SoqlError);
    expect(() => where.in('a', [])).toThrow(SoqlError);
  });
  it('rejects unsafe field names', () => {
    expect(() => where.eq('a; drop', 1)).toThrow(SoqlError);
    expect(() => where.eq("a'", 1)).toThrow(SoqlError);
    expect(where.eq(':id', 'x').soql).toBe(":id = 'x'");
  });
});

describe('SoqlQuery', () => {
  it('serialises every clause', () => {
    const q = soql()
      .select('id_del_proceso', 'count(*) as n')
      .where(where.eq('estado', 'Publicado'))
      .where(where.gt('precio_base', 0))
      .group('id_del_proceso')
      .order(':id')
      .limit(100)
      .offset(200)
      .fullText('software');
    const p = q.toParams();
    expect(p.get('$select')).toBe('id_del_proceso, count(*) as n');
    expect(p.get('$where')).toBe("(estado = 'Publicado' AND precio_base > 0)");
    expect(p.get('$group')).toBe('id_del_proceso');
    expect(p.get('$order')).toBe(':id ASC');
    expect(p.get('$limit')).toBe('100');
    expect(p.get('$offset')).toBe('200');
    expect(p.get('$q')).toBe('software');
  });
  it('is immutable', () => {
    const base = soql().limit(1);
    const next = base.limit(2);
    expect(base.toParams().get('$limit')).toBe('1');
    expect(next.toParams().get('$limit')).toBe('2');
  });
  it('validates limit/offset', () => {
    expect(() => soql().limit(-1)).toThrow(SoqlError);
    expect(() => soql().offset(1.5)).toThrow(SoqlError);
  });
});

describe('dataset predicates', () => {
  it('translates a scraper filter for procesos', () => {
    const e = procesosPredicate({
      updatedSince: '2026-09-01',
      closingSince: '2026-08-17',
      departments: ['Antioquia'],
      keywords: ['software', 'app'],
      categoryPrefixes: ['V1.43'],
      excludeStatuses: ['Borrador'],
      modalities: ['Mínima cuantía'],
    });
    expect(e?.soql).toContain("fecha_de_ultima_publicaci >= '2026-09-01T00:00:00'");
    expect(e?.soql).toContain("fecha_de_recepcion_de >= '2026-08-17T00:00:00'");
    expect(e?.soql).toContain("departamento_entidad in ('Antioquia')");
    expect(e?.soql).toContain("upper(descripci_n_del_procedimiento) like '%SOFTWARE%'");
    expect(e?.soql).toContain("upper(nombre_del_procedimiento) like '%APP%'");
    expect(e?.soql).toContain("starts_with(codigo_principal_de_categoria, 'V1.43')");
    expect(e?.soql).toContain("estado_del_procedimiento not in ('Borrador')");
    expect(procesosPredicate({})).toBeNull();
    expect(procesosQuery().toParams().get('$select')).toContain('urlproceso');
  });
  it('ORs keywords and category prefixes together for contratos', () => {
    const e = contratosPredicate({
      signedSince: '2024-09-16',
      keywords: ['software'],
      categoryPrefixes: ['V1.8111'],
    });
    expect(e?.soql).toMatch(
      /\(upper\(objeto_del_contrato\) like '%SOFTWARE%' OR .* OR starts_with\(codigo_de_categoria_principal, 'V1.8111'\)\)/,
    );
  });
});
