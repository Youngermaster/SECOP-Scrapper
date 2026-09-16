import type { RawSocrataUrl, UrlStatus } from '../types';
import { cleanText } from './text';

export interface CleanUrlResult {
  url: string | null;
  status: UrlStatus;
  /** SECOP II notice id (CO1.NTC.n) when present in the URL. */
  noticeUid: string | null;
}

/**
 * The Procesos dataset frequently publishes the SECOP login page instead of the
 * process page ("polluted" URL). Such rows are not usable as links.
 */
const POLLUTED_PATTERNS = [/\/STS\/Users\/Login/i, /\/Users\/Login\/Index/i];

function extractRawUrl(raw: RawSocrataUrl | string | null | undefined): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return cleanText(raw);
  if (typeof raw === 'object' && typeof raw.url === 'string') return cleanText(raw.url);
  return null;
}

/** Clean a Socrata `url` column value and classify it. */
export function cleanUrl(raw: RawSocrataUrl | string | null | undefined): CleanUrlResult {
  const value = extractRawUrl(raw);
  if (value == null) return { url: null, status: 'missing', noticeUid: null };

  // Some rows wrap the URL in quotes or prefix it with junk; keep the first http(s) URL found.
  const match = /https?:\/\/[^\s"'<>]+/i.exec(value);
  if (!match) return { url: null, status: 'missing', noticeUid: null };
  let url = match[0].replace(/[),.;]+$/, '');
  if (url.startsWith('http://')) url = `https://${url.slice('http://'.length)}`;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url: null, status: 'missing', noticeUid: null };
  }
  if (POLLUTED_PATTERNS.some((re) => re.test(parsed.pathname))) {
    return { url: null, status: 'polluted', noticeUid: null };
  }
  const noticeUid = parsed.searchParams.get('noticeUID');
  return { url: parsed.toString(), status: 'ok', noticeUid };
}
