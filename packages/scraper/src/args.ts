/** `pnpm scraper -- --since X` forwards a literal "--"; drop it so commander sees the flags. */
export function stripLeadingDoubleDash(argv: readonly string[]): string[] {
  const [node, script, ...rest] = argv;
  if (rest[0] === '--') rest.shift();
  return [node ?? '', script ?? '', ...rest];
}
