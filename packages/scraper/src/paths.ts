import { existsSync } from 'node:fs';
import path from 'node:path';

/** Walk up from `start` until a pnpm-workspace.yaml is found (monorepo root). */
export function findRepoRoot(start: string = process.cwd()): string {
  let dir = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

export function defaultDbPath(root: string): string {
  return path.join(root, 'data', 'secop-radar.db');
}

export function defaultExportDir(root: string): string {
  return path.join(root, 'apps', 'web', 'public', 'data');
}
