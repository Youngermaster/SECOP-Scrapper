import type { z } from 'zod';
import { SocrataError, SocrataRowValidationError } from './errors';
import { SoqlQuery, where, type SoqlExpr } from './soql';

export const DEFAULT_DOMAIN = 'www.datos.gov.co';

export interface SocrataLogger {
  debug: (msg: string) => void;
  info: (msg: string) => void;
  warn: (msg: string) => void;
}

export interface SocrataClientOptions {
  /** Socrata domain, defaults to datos.gov.co. */
  domain?: string;
  /** Free app token (X-App-Token). Optional; without it the API throttles per IP. */
  appToken?: string | null;
  /** Injectable fetch (tests). */
  fetch?: typeof fetch;
  /** Per-request timeout. */
  timeoutMs?: number;
  /** Retries on 429/5xx/network errors. */
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  userAgent?: string;
  logger?: SocrataLogger;
  /** Injectable sleep (tests). */
  sleep?: (ms: number) => Promise<void>;
}

export interface PaginateOptions {
  pageSize?: number;
  /** Stop after this many rows (approximate: whole pages). */
  maxRows?: number;
  /** Stable order for offset paging. Defaults to the system row id. */
  orderBy?: string;
  onPage?: (info: { page: number; offset: number; rows: number; elapsedMs: number }) => void;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const noopLogger: SocrataLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
};

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const secs = Number(header);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

/**
 * Typed SODA 2.1 client with retry/backoff and stable offset pagination.
 * Every row is validated with the Zod schema supplied per call (API boundary).
 */
export class SocrataClient {
  private readonly domain: string;
  private readonly appToken: string | null;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly userAgent: string;
  private readonly logger: SocrataLogger;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(opts: SocrataClientOptions = {}) {
    this.domain = opts.domain ?? DEFAULT_DOMAIN;
    this.appToken = opts.appToken?.trim() ? opts.appToken.trim() : null;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? 90_000;
    this.retries = opts.retries ?? 5;
    this.baseDelayMs = opts.baseDelayMs ?? 750;
    this.maxDelayMs = opts.maxDelayMs ?? 30_000;
    this.userAgent =
      opts.userAgent ?? 'secop-radar/0.1 (+https://github.com/Youngermaster/SECOP-Scrapper)';
    this.logger = opts.logger ?? noopLogger;
    this.sleep = opts.sleep ?? defaultSleep;
    if (!this.appToken) {
      this.logger.warn(
        'No SOCRATA_APP_TOKEN set: requests are throttled per IP. See README to get a free token.',
      );
    }
  }

  get hasAppToken(): boolean {
    return this.appToken != null;
  }

  /** Public URL of a dataset's JSON endpoint. */
  resourceUrl(datasetId: string, query?: SoqlQuery): string {
    const url = new URL(`https://${this.domain}/resource/${datasetId}.json`);
    if (query) url.search = query.toParams().toString();
    return url.toString();
  }

  /** Run a query and validate each row with `schema`. */
  async query<T>(datasetId: string, query: SoqlQuery, schema: z.ZodType<T>): Promise<T[]> {
    const url = this.resourceUrl(datasetId, query);
    const raw = await this.requestJson(url);
    if (!Array.isArray(raw)) {
      throw new SocrataError(
        'Unexpected non-array response',
        null,
        JSON.stringify(raw).slice(0, 500),
        url,
        false,
      );
    }
    const rows: T[] = [];
    for (let i = 0; i < raw.length; i++) {
      const parsed = schema.safeParse(raw[i]);
      if (!parsed.success) {
        throw new SocrataRowValidationError(
          `Row ${i} of ${datasetId} failed validation: ${parsed.error.message}`,
          datasetId,
          i,
          parsed.error.issues,
        );
      }
      rows.push(parsed.data);
    }
    return rows;
  }

  /** `SELECT count(*)` with an optional predicate. */
  async count(datasetId: string, predicate?: SoqlExpr | null): Promise<number> {
    const q = SoqlQuery.create()
      .select('count(*) as n')
      .where(predicate ?? null);
    const url = this.resourceUrl(datasetId, q);
    const raw = (await this.requestJson(url)) as Array<{ n?: string | number }>;
    const n = Number(raw[0]?.n ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Iterate a query page by page using `$limit/$offset` and a stable `$order`.
   * Note: the SECOP datasets are re-published daily, so the order is only stable
   * within one day's snapshot — callers should treat a run as a unit of work.
   */
  async *paginate<T>(
    datasetId: string,
    query: SoqlQuery,
    schema: z.ZodType<T>,
    opts: PaginateOptions = {},
  ): AsyncGenerator<T[], void, undefined> {
    const pageSize = opts.pageSize ?? 10_000;
    const orderBy = opts.orderBy ?? ':id';
    let offset = 0;
    let page = 0;
    let total = 0;
    const base = query.snapshot.order.length ? query : query.order(orderBy, 'ASC');
    for (;;) {
      const started = Date.now();
      const rows = await this.query(datasetId, base.limit(pageSize).offset(offset), schema);
      page += 1;
      total += rows.length;
      opts.onPage?.({ page, offset, rows: rows.length, elapsedMs: Date.now() - started });
      if (rows.length > 0) yield rows;
      if (rows.length < pageSize) return;
      if (opts.maxRows != null && total >= opts.maxRows) return;
      offset += pageSize;
    }
  }

  /** Convenience: collect every page into one array. */
  async fetchAll<T>(
    datasetId: string,
    query: SoqlQuery,
    schema: z.ZodType<T>,
    opts?: PaginateOptions,
  ): Promise<T[]> {
    const out: T[] = [];
    for await (const page of this.paginate(datasetId, query, schema, opts)) out.push(...page);
    return out;
  }

  private async requestJson(url: string): Promise<unknown> {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      try {
        const res = await this.fetchImpl(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': this.userAgent,
            ...(this.appToken ? { 'X-App-Token': this.appToken } : {}),
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (res.ok) {
          return (await res.json()) as unknown;
        }
        const body = await res.text().catch(() => '');
        const retryable = RETRYABLE_STATUS.has(res.status);
        const err = new SocrataError(
          `Socrata request failed (${res.status}) ${summarizeBody(body)}`,
          res.status,
          body,
          url,
          retryable,
        );
        if (!retryable || attempt > this.retries) throw err;
        const retryAfter = parseRetryAfter(res.headers.get('retry-after'));
        const delay = retryAfter ?? this.backoff(attempt);
        this.logger.warn(
          `HTTP ${res.status} from Socrata (attempt ${attempt}/${this.retries + 1}); retrying in ${Math.round(delay)} ms`,
        );
        await this.sleep(delay);
      } catch (e) {
        if (e instanceof SocrataError) throw e;
        // Network error / timeout.
        if (attempt > this.retries) {
          throw new SocrataError(
            `Network error after ${attempt} attempts: ${errMessage(e)}`,
            null,
            null,
            url,
            true,
          );
        }
        const delay = this.backoff(attempt);
        this.logger.warn(
          `${errMessage(e)} (attempt ${attempt}/${this.retries + 1}); retrying in ${Math.round(delay)} ms`,
        );
        await this.sleep(delay);
      }
    }
  }

  private backoff(attempt: number): number {
    const exp = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** (attempt - 1));
    return exp * (0.7 + Math.random() * 0.6);
  }
}

function summarizeBody(body: string): string {
  if (!body) return '';
  try {
    const j = JSON.parse(body) as { message?: string; errorCode?: string };
    if (j.message) return `- ${j.errorCode ?? ''} ${j.message}`.slice(0, 400);
  } catch {
    /* not json */
  }
  return `- ${body.slice(0, 200)}`;
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.name === 'TimeoutError' ? 'Request timed out' : e.message;
  return String(e);
}

export { where };
