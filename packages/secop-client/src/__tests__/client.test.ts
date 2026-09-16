import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { SocrataClient } from '../client';
import { SocrataError, SocrataRowValidationError } from '../errors';
import { soql, where } from '../soql';

const rowSchema = z.looseObject({ id: z.string() });

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function makeClient(
  fetchMock: typeof fetch,
  extra: Partial<ConstructorParameters<typeof SocrataClient>[0]> = {},
) {
  return new SocrataClient({
    fetch: fetchMock,
    appToken: 'tok',
    retries: 3,
    baseDelayMs: 1,
    maxDelayMs: 2,
    sleep: async () => undefined,
    ...extra,
  });
}

describe('SocrataClient', () => {
  it('sends the app token and query params', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.hostname).toBe('www.datos.gov.co');
      expect(url.pathname).toBe('/resource/p6dx-8zbt.json');
      expect(url.searchParams.get('$where')).toBe("estado = 'Publicado'");
      expect((init?.headers as Record<string, string>)['X-App-Token']).toBe('tok');
      return jsonResponse([{ id: '1' }]);
    });
    const client = makeClient(fetchMock as unknown as typeof fetch);
    const rows = await client.query(
      'p6dx-8zbt',
      soql().where(where.eq('estado', 'Publicado')),
      rowSchema,
    );
    expect(rows).toEqual([{ id: '1' }]);
    expect(client.hasAppToken).toBe(true);
  });

  it('omits the token header and warns when no token is configured', () => {
    const warn = vi.fn();
    const client = makeClient(vi.fn() as unknown as typeof fetch, {
      appToken: '',
      logger: { debug: vi.fn(), info: vi.fn(), warn },
    });
    expect(client.hasAppToken).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('SOCRATA_APP_TOKEN'));
  });

  it('paginates with a stable order until a short page', async () => {
    const pages = [[{ id: '1' }, { id: '2' }], [{ id: '3' }, { id: '4' }], [{ id: '5' }]];
    const seen: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      seen.push(
        `${url.searchParams.get('$order')}|${url.searchParams.get('$limit')}|${url.searchParams.get('$offset')}`,
      );
      return jsonResponse(pages.shift() ?? []);
    });
    const client = makeClient(fetchMock as unknown as typeof fetch);
    const all = await client.fetchAll('x', soql(), rowSchema, { pageSize: 2 });
    expect(all.map((r) => r.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(seen).toEqual([':id ASC|2|0', ':id ASC|2|2', ':id ASC|2|4']);
  });

  it('stops paginating when an exact multiple returns an empty page', async () => {
    const pages = [[{ id: '1' }, { id: '2' }], []];
    const fetchMock = vi.fn(async () => jsonResponse(pages.shift() ?? []));
    const client = makeClient(fetchMock as unknown as typeof fetch);
    const all = await client.fetchAll('x', soql(), rowSchema, { pageSize: 2 });
    expect(all).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 honouring Retry-After, then succeeds', async () => {
    const sleep = vi.fn(async () => undefined);
    const responses = [
      new Response('slow down', { status: 429, headers: { 'retry-after': '2' } }),
      new Response('oops', { status: 503 }),
      jsonResponse([{ id: 'ok' }]),
    ];
    const fetchMock = vi.fn(async () => responses.shift() as Response);
    const client = makeClient(fetchMock as unknown as typeof fetch, { sleep });
    const rows = await client.query('x', soql(), rowSchema);
    expect(rows).toEqual([{ id: 'ok' }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 2000);
  });

  it('does not retry on 400 and surfaces the Socrata message', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            message: 'Type mismatch for op$>=',
            errorCode: 'query.soql.type-mismatch',
          }),
          {
            status: 400,
          },
        ),
    );
    const client = makeClient(fetchMock as unknown as typeof fetch);
    await expect(client.query('x', soql(), rowSchema)).rejects.toMatchObject({
      name: 'SocrataError',
      status: 400,
      retryable: false,
      message: expect.stringContaining('Type mismatch'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after the configured retries on network errors', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const client = makeClient(fetchMock as unknown as typeof fetch, { retries: 2 });
    await expect(client.query('x', soql(), rowSchema)).rejects.toBeInstanceOf(SocrataError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('validates rows at the boundary', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{ id: 1 }]));
    const client = makeClient(fetchMock as unknown as typeof fetch);
    await expect(client.query('x', soql(), rowSchema)).rejects.toBeInstanceOf(
      SocrataRowValidationError,
    );
  });

  it('counts rows', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      expect(url.searchParams.get('$select')).toBe('count(*) as n');
      return jsonResponse([{ n: '1801' }]);
    });
    const client = makeClient(fetchMock as unknown as typeof fetch);
    expect(await client.count('x', where.eq('a', 1))).toBe(1801);
  });
});
