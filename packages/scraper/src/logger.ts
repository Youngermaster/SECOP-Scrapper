import { createConsola, type ConsolaInstance } from 'consola';

export const logger: ConsolaInstance = createConsola({
  level: 3,
  formatOptions: { date: false, compact: true },
});

export function setVerbose(verbose: boolean): void {
  logger.level = verbose ? 4 : 3;
}
