/**
 * Minimal, safe SoQL (Socrata Query Language) builder.
 * https://dev.socrata.com/docs/queries/
 */

export type SoqlLiteral = string | number | boolean | null | Date;

const FIELD_RE = /^:?[a-z_][a-z0-9_]*$/i;

export class SoqlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SoqlError';
  }
}

/** Validate a column name (letters, digits, underscore; system fields start with ":"). */
export function field(name: string): string {
  if (!FIELD_RE.test(name)) throw new SoqlError(`Invalid SoQL field name: ${name}`);
  return name;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a Date as a Socrata floating timestamp (no timezone), in UTC components. */
export function toFloatingTimestamp(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** Quote a literal for SoQL. Strings get single quotes with embedded quotes doubled. */
export function literal(value: SoqlLiteral): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new SoqlError('Non-finite number literal');
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return `'${toFloatingTimestamp(value)}'`;
  return `'${value.replace(/'/g, "''")}'`;
}

/** An opaque SoQL boolean expression. */
export interface SoqlExpr {
  readonly soql: string;
}

function expr(soql: string): SoqlExpr {
  return { soql };
}

function cmp(op: string) {
  return (name: string, value: SoqlLiteral): SoqlExpr =>
    expr(`${field(name)} ${op} ${literal(value)}`);
}

/** Composable predicate helpers for `$where`. */
export const where = {
  eq: cmp('='),
  neq: cmp('!='),
  gt: cmp('>'),
  gte: cmp('>='),
  lt: cmp('<'),
  lte: cmp('<='),
  in(name: string, values: readonly SoqlLiteral[]): SoqlExpr {
    if (values.length === 0) throw new SoqlError(`IN list for ${name} is empty`);
    return expr(`${field(name)} in (${values.map(literal).join(', ')})`);
  },
  notIn(name: string, values: readonly SoqlLiteral[]): SoqlExpr {
    if (values.length === 0) throw new SoqlError(`NOT IN list for ${name} is empty`);
    return expr(`${field(name)} not in (${values.map(literal).join(', ')})`);
  },
  between(name: string, from: SoqlLiteral, to: SoqlLiteral): SoqlExpr {
    return expr(`${field(name)} between ${literal(from)} and ${literal(to)}`);
  },
  like(name: string, pattern: string): SoqlExpr {
    return expr(`${field(name)} like ${literal(pattern)}`);
  },
  /** Case-insensitive substring match: upper(field) like '%TEXT%'. */
  containsText(name: string, text: string): SoqlExpr {
    const cleaned = text.replace(/[%_]/g, ' ').trim();
    if (cleaned === '') throw new SoqlError('containsText needs a non-empty needle');
    return expr(`upper(${field(name)}) like ${literal(`%${cleaned.toUpperCase()}%`)}`);
  },
  startsWith(name: string, prefix: string): SoqlExpr {
    return expr(`starts_with(${field(name)}, ${literal(prefix)})`);
  },
  isNull(name: string): SoqlExpr {
    return expr(`${field(name)} IS NULL`);
  },
  isNotNull(name: string): SoqlExpr {
    return expr(`${field(name)} IS NOT NULL`);
  },
  and(...parts: Array<SoqlExpr | null | undefined | false>): SoqlExpr {
    const kept = parts.filter((p): p is SoqlExpr => Boolean(p));
    if (kept.length === 0) throw new SoqlError('and() needs at least one expression');
    if (kept.length === 1) return kept[0] as SoqlExpr;
    return expr(`(${kept.map((p) => p.soql).join(' AND ')})`);
  },
  or(...parts: Array<SoqlExpr | null | undefined | false>): SoqlExpr {
    const kept = parts.filter((p): p is SoqlExpr => Boolean(p));
    if (kept.length === 0) throw new SoqlError('or() needs at least one expression');
    if (kept.length === 1) return kept[0] as SoqlExpr;
    return expr(`(${kept.map((p) => p.soql).join(' OR ')})`);
  },
  not(part: SoqlExpr): SoqlExpr {
    return expr(`NOT (${part.soql})`);
  },
  /** Escape hatch for expressions the helpers do not cover. Caller is responsible for safety. */
  raw(soql: string): SoqlExpr {
    return expr(soql);
  },
};

export type SortDirection = 'ASC' | 'DESC';

export interface SoqlQueryState {
  select: string[];
  where: SoqlExpr | null;
  group: string[];
  order: Array<{ field: string; dir: SortDirection }>;
  limit: number | null;
  offset: number | null;
  q: string | null;
}

/** Immutable query builder; every method returns a new query. */
export class SoqlQuery {
  private constructor(private readonly state: SoqlQueryState) {}

  static create(): SoqlQuery {
    return new SoqlQuery({
      select: [],
      where: null,
      group: [],
      order: [],
      limit: null,
      offset: null,
      q: null,
    });
  }

  private with(patch: Partial<SoqlQueryState>): SoqlQuery {
    return new SoqlQuery({ ...this.state, ...patch });
  }

  /** `$select`. Accepts plain fields or aggregate expressions like `count(*) as n`. */
  select(...fields: string[]): SoqlQuery {
    const mapped = fields.map((f) => (FIELD_RE.test(f) ? field(f) : f));
    return this.with({ select: [...this.state.select, ...mapped] });
  }

  where(e: SoqlExpr | null | undefined): SoqlQuery {
    if (!e) return this;
    return this.with({ where: this.state.where ? where.and(this.state.where, e) : e });
  }

  group(...fields: string[]): SoqlQuery {
    return this.with({ group: [...this.state.group, ...fields.map(field)] });
  }

  order(name: string, dir: SortDirection = 'ASC'): SoqlQuery {
    return this.with({ order: [...this.state.order, { field: field(name), dir }] });
  }

  limit(n: number): SoqlQuery {
    if (!Number.isInteger(n) || n < 0) throw new SoqlError(`Invalid limit: ${n}`);
    return this.with({ limit: n });
  }

  offset(n: number): SoqlQuery {
    if (!Number.isInteger(n) || n < 0) throw new SoqlError(`Invalid offset: ${n}`);
    return this.with({ offset: n });
  }

  /** Socrata full-text search (`$q`). */
  fullText(q: string | null): SoqlQuery {
    return this.with({ q });
  }

  get snapshot(): Readonly<SoqlQueryState> {
    return this.state;
  }

  /** Query-string parameters (`$select`, `$where`, …) ready for a SODA 2.1 endpoint. */
  toParams(): URLSearchParams {
    const p = new URLSearchParams();
    const s = this.state;
    if (s.select.length) p.set('$select', s.select.join(', '));
    if (s.where) p.set('$where', s.where.soql);
    if (s.group.length) p.set('$group', s.group.join(', '));
    if (s.order.length) p.set('$order', s.order.map((o) => `${o.field} ${o.dir}`).join(', '));
    if (s.limit != null) p.set('$limit', String(s.limit));
    if (s.offset != null) p.set('$offset', String(s.offset));
    if (s.q) p.set('$q', s.q);
    return p;
  }

  toString(): string {
    return decodeURIComponent(this.toParams().toString());
  }
}

export const soql = (): SoqlQuery => SoqlQuery.create();
