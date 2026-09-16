/** Outcome of normalising one raw row. */
export type NormalizeResult<T> =
  { ok: true; value: T; repairs: string[] } | { ok: false; reason: DropReason; detail?: string };

export type DropReason = 'missing-id' | 'missing-title' | 'invalid-row';
