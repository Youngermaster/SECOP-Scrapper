import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Contract, Department, Municipality, Opportunity } from '@secop-radar/core';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

export interface UpsertCounts {
  inserted: number;
  updated: number;
  unchanged: number;
}

export interface SyncRunRecord {
  dataset: string;
  args: unknown;
  fetched: number;
  inserted: number;
  updated: number;
  unchanged: number;
  dropped: number;
  repaired: number;
  duplicates: number;
  error?: string | null;
}

/** Stable hash of a JSON-serialisable value (key order normalised). */
export function contentHash(value: unknown): string {
  return createHash('sha1').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

interface ProcessRow {
  data: string;
  content_hash: string;
}

/** Thin, typed wrapper around the local SQLite store. */
export class LocalStore {
  readonly db: Database.Database;

  constructor(readonly file: string) {
    if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(SCHEMA_SQL);
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version') as
      { value: string } | undefined;
    if (!row) {
      this.db
        .prepare('INSERT INTO meta (key, value) VALUES (?, ?)')
        .run('schema_version', String(SCHEMA_VERSION));
    }
  }

  close(): void {
    this.db.close();
  }

  /* ---------------- sync state ---------------- */

  getState(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM sync_state WHERE key = ?').get(key) as
      { value: string } | undefined;
    return row?.value ?? null;
  }

  setState(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(key, value, new Date().toISOString());
  }

  recordRun(run: SyncRunRecord, startedAt: string): void {
    this.db
      .prepare(
        `INSERT INTO sync_runs (started_at, finished_at, dataset, args, fetched, inserted, updated, unchanged, dropped, repaired, duplicates, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        startedAt,
        new Date().toISOString(),
        run.dataset,
        JSON.stringify(run.args),
        run.fetched,
        run.inserted,
        run.updated,
        run.unchanged,
        run.dropped,
        run.repaired,
        run.duplicates,
        run.error ?? null,
      );
  }

  /* ---------------- processes ---------------- */

  getProcess(id: string): Opportunity | null {
    const row = this.db.prepare('SELECT data FROM processes WHERE id = ?').get(id) as
      ProcessRow | undefined;
    return row ? (JSON.parse(row.data) as Opportunity) : null;
  }

  private getProcessHash(id: string): string | null {
    const row = this.db.prepare('SELECT content_hash FROM processes WHERE id = ?').get(id) as
      { content_hash: string } | undefined;
    return row?.content_hash ?? null;
  }

  /**
   * Insert or update opportunities. `reconcile` lets the caller merge the incoming
   * row with what is already stored (e.g. keep a usable URL from an earlier snapshot).
   */
  upsertProcesses(
    items: readonly Opportunity[],
    now: string,
    reconcile?: (existing: Opportunity, incoming: Opportunity) => Opportunity,
  ): UpsertCounts {
    const counts: UpsertCounts = { inserted: 0, updated: 0, unchanged: 0 };
    const insert = this.db.prepare(
      `INSERT INTO processes (id, portfolio_id, department_code, department, city, entity_name, entity_nit, modality, status, value,
         published_at, last_published_at, closes_at, awarded, url_status, unspsc_segment, unspsc_family, data, content_hash,
         first_seen_at, last_seen_at, updated_at)
       VALUES (@id, @portfolio_id, @department_code, @department, @city, @entity_name, @entity_nit, @modality, @status, @value,
         @published_at, @last_published_at, @closes_at, @awarded, @url_status, @unspsc_segment, @unspsc_family, @data, @content_hash,
         @now, @now, @now)
       ON CONFLICT(id) DO UPDATE SET
         portfolio_id = excluded.portfolio_id, department_code = excluded.department_code, department = excluded.department,
         city = excluded.city, entity_name = excluded.entity_name, entity_nit = excluded.entity_nit, modality = excluded.modality,
         status = excluded.status, value = excluded.value, published_at = excluded.published_at,
         last_published_at = excluded.last_published_at, closes_at = excluded.closes_at, awarded = excluded.awarded,
         url_status = excluded.url_status, unspsc_segment = excluded.unspsc_segment, unspsc_family = excluded.unspsc_family,
         data = excluded.data, content_hash = excluded.content_hash, last_seen_at = excluded.last_seen_at, updated_at = excluded.updated_at`,
    );
    const touch = this.db.prepare('UPDATE processes SET last_seen_at = ? WHERE id = ?');

    const tx = this.db.transaction((batch: readonly Opportunity[]) => {
      for (const incoming of batch) {
        const existingHash = this.getProcessHash(incoming.id);
        let item = incoming;
        if (existingHash != null && reconcile) {
          const existing = this.getProcess(incoming.id);
          if (existing) item = reconcile(existing, incoming);
        }
        const hash = contentHash(item);
        if (existingHash === hash) {
          touch.run(now, item.id);
          counts.unchanged += 1;
          continue;
        }
        insert.run({
          id: item.id,
          portfolio_id: item.portfolioId,
          department_code: item.entity.departmentCode,
          department: item.entity.department,
          city: item.entity.city,
          entity_name: item.entity.name,
          entity_nit: item.entity.nit,
          modality: item.modality,
          status: item.status,
          value: item.value,
          published_at: item.publishedAt,
          last_published_at: item.lastPublishedAt,
          closes_at: item.closesAt,
          awarded: item.awarded ? 1 : 0,
          url_status: item.urlStatus,
          unspsc_segment: item.unspscSegment,
          unspsc_family: item.unspscFamily,
          data: JSON.stringify(item),
          content_hash: hash,
          now,
        });
        if (existingHash == null) counts.inserted += 1;
        else counts.updated += 1;
      }
    });
    tx(items);
    return counts;
  }

  countProcesses(): number {
    return (this.db.prepare('SELECT count(*) AS n FROM processes').get() as { n: number }).n;
  }

  /** Opportunities relevant for export: closing recently/in the future, or recently published without a closing date. */
  selectProcessesForExport(
    closingSince: string,
    publishedSince: string,
    limit: number,
  ): Opportunity[] {
    const rows = this.db
      .prepare(
        `SELECT data FROM processes
         WHERE (closes_at IS NOT NULL AND closes_at >= ?)
            OR (closes_at IS NULL AND COALESCE(last_published_at, published_at) >= ?)
         ORDER BY COALESCE(closes_at, '9999-12-31') DESC, COALESCE(last_published_at, '') DESC
         LIMIT ?`,
      )
      .all(closingSince, publishedSince, limit) as ProcessRow[];
    return rows.map((r) => JSON.parse(r.data) as Opportunity);
  }

  maxProcessLastPublished(): string | null {
    const row = this.db.prepare('SELECT max(last_published_at) AS m FROM processes').get() as {
      m: string | null;
    };
    return row.m;
  }

  /* ---------------- contracts ---------------- */

  private getContractHash(id: string): string | null {
    const row = this.db.prepare('SELECT content_hash FROM contracts WHERE id = ?').get(id) as
      { content_hash: string } | undefined;
    return row?.content_hash ?? null;
  }

  upsertContracts(items: readonly Contract[], now: string): UpsertCounts {
    const counts: UpsertCounts = { inserted: 0, updated: 0, unchanged: 0 };
    const insert = this.db.prepare(
      `INSERT INTO contracts (id, portfolio_id, entity_name, entity_nit, department_code, signed_at, unspsc_segment, unspsc_family,
         modality, value, data, content_hash, first_seen_at, last_seen_at, updated_at)
       VALUES (@id, @portfolio_id, @entity_name, @entity_nit, @department_code, @signed_at, @unspsc_segment, @unspsc_family,
         @modality, @value, @data, @content_hash, @now, @now, @now)
       ON CONFLICT(id) DO UPDATE SET
         portfolio_id = excluded.portfolio_id, entity_name = excluded.entity_name, entity_nit = excluded.entity_nit,
         department_code = excluded.department_code, signed_at = excluded.signed_at, unspsc_segment = excluded.unspsc_segment,
         unspsc_family = excluded.unspsc_family, modality = excluded.modality, value = excluded.value, data = excluded.data,
         content_hash = excluded.content_hash, last_seen_at = excluded.last_seen_at, updated_at = excluded.updated_at`,
    );
    const touch = this.db.prepare('UPDATE contracts SET last_seen_at = ? WHERE id = ?');
    const tx = this.db.transaction((batch: readonly Contract[]) => {
      for (const item of batch) {
        const hash = contentHash(item);
        const existing = this.getContractHash(item.id);
        if (existing === hash) {
          touch.run(now, item.id);
          counts.unchanged += 1;
          continue;
        }
        insert.run({
          id: item.id,
          portfolio_id: item.processPortfolioId,
          entity_name: item.entity.name,
          entity_nit: item.entity.nit,
          department_code: item.entity.departmentCode,
          signed_at: item.signedAt,
          unspsc_segment: item.unspscSegment,
          unspsc_family: item.unspscFamily,
          modality: item.modality,
          value: item.value,
          data: JSON.stringify(item),
          content_hash: hash,
          now,
        });
        if (existing == null) counts.inserted += 1;
        else counts.updated += 1;
      }
    });
    tx(items);
    return counts;
  }

  countContracts(): number {
    return (this.db.prepare('SELECT count(*) AS n FROM contracts').get() as { n: number }).n;
  }

  selectContractsForExport(signedSince: string, limit: number): Contract[] {
    const rows = this.db
      .prepare(
        `SELECT data FROM contracts WHERE signed_at IS NULL OR signed_at >= ?
         ORDER BY COALESCE(signed_at, '') DESC LIMIT ?`,
      )
      .all(signedSince, limit) as ProcessRow[];
    return rows.map((r) => JSON.parse(r.data) as Contract);
  }

  /* ---------------- geo ---------------- */

  replaceGeo(departments: readonly Department[], municipalities: readonly Municipality[]): void {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM departments').run();
      this.db.prepare('DELETE FROM municipalities').run();
      const insD = this.db.prepare(
        'INSERT INTO departments (code, name, lat, lon) VALUES (?, ?, ?, ?)',
      );
      for (const d of departments) insD.run(d.code, d.name, d.lat, d.lon);
      const insM = this.db.prepare(
        'INSERT OR REPLACE INTO municipalities (code, name, key, department_code, lat, lon) VALUES (?, ?, ?, ?, ?, ?)',
      );
      for (const m of municipalities)
        insM.run(m.code, m.name, m.key, m.departmentCode, m.lat, m.lon);
    });
    tx();
  }

  selectGeo(): { departments: Department[]; municipalities: Municipality[] } {
    const departments = this.db
      .prepare('SELECT code, name, lat, lon FROM departments ORDER BY name')
      .all() as Department[];
    const municipalities = this.db
      .prepare(
        'SELECT code, name, key, department_code AS departmentCode, lat, lon FROM municipalities ORDER BY code',
      )
      .all() as Municipality[];
    return { departments, municipalities };
  }

  countMunicipalities(): number {
    return (this.db.prepare('SELECT count(*) AS n FROM municipalities').get() as { n: number }).n;
  }
}
