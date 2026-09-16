import { stripAccents, type Opportunity } from '@secop-radar/core';
import MiniSearch, { type SearchOptions } from 'minisearch';

interface Doc {
  id: string;
  text: string;
}

const STOPWORDS = new Set([
  'de', 'del', 'la', 'las', 'los', 'el', 'y', 'o', 'en', 'para', 'por', 'con', 'a', 'al', 'un', 'una', 'que', 'se', 'su', 'sus', 'e', 'u', 'lo', 'como', 'mas',
]);

function processTerm(term: string): string | null {
  const t = stripAccents(term.toLowerCase());
  if (t.length < 2 || STOPWORDS.has(t)) return null;
  return t;
}

/** Build a MiniSearch index over the normalised haystack of each opportunity. */
export function buildSearchIndex(items: readonly Opportunity[]): MiniSearch<Doc> {
  const index = new MiniSearch<Doc>({
    fields: ['text'],
    storeFields: [],
    idField: 'id',
    tokenize: (text) => text.split(/[^\p{L}\p{N}]+/u).filter(Boolean),
    processTerm,
    searchOptions: { prefix: true, fuzzy: 0.15, combineWith: 'AND' },
  });
  index.addAll(items.map((o) => ({ id: o.id, text: o.searchText })));
  return index;
}

/** Ids matching the query, or null when the query is empty (no filtering). */
export function searchIds(index: MiniSearch<Doc>, query: string, options?: SearchOptions): Set<string> | null {
  const q = query.trim();
  if (q === '') return null;
  // Quoted phrases: fall back to substring semantics by requiring every token.
  const results = index.search(q, options);
  return new Set(results.map((r) => String(r.id)));
}
