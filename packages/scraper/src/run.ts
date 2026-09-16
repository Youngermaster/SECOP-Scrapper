import { SocrataClient } from '@secop-radar/secop-client';
import { LocalStore } from './db/database';
import { exportArtifacts, type ExportResult } from './export/exporter';
import { logger, setVerbose } from './logger';
import type { ScrapeOptions } from './options';
import { syncContracts } from './sync/contracts';
import { syncGeo } from './sync/geo';
import { syncProcesses, type PassSummary } from './sync/processes';

export interface ScrapeResult {
  processes: PassSummary[];
  contracts: PassSummary | null;
  export: ExportResult | null;
  totals: { processes: number; contracts: number; municipalities: number };
}

function printSummary(result: ScrapeResult, o: ScrapeOptions): void {
  logger.box(
    [
      `SECOP Radar — resumen${o.dryRun ? ' (dry run, nothing written)' : ''}`,
      '',
      ...result.processes.map(
        (p) =>
          `Procesos [${p.name}]: fetched ${p.fetched}, dup ${p.duplicates}, dropped ${p.dropped}, repaired ${p.repaired}, sin enlace ${p.withoutUrl} → +${p.inserted} ~${p.updated} =${p.unchanged}`,
      ),
      ...result.processes
        .filter((p) => Object.keys(p.dropReasons).length || Object.keys(p.repairReasons).length)
        .map(
          (p) =>
            `   drops: ${JSON.stringify(p.dropReasons)}  repairs: ${JSON.stringify(p.repairReasons)}`,
        ),
      result.contracts
        ? `Contratos: fetched ${result.contracts.fetched}, dropped ${result.contracts.dropped}, repaired ${result.contracts.repaired} → +${result.contracts.inserted} ~${result.contracts.updated} =${result.contracts.unchanged}`
        : 'Contratos: skipped',
      '',
      `DB: ${o.dbPath}`,
      `   ${result.totals.processes} procesos · ${result.totals.contracts} contratos · ${result.totals.municipalities} municipios`,
      result.export ? `Export: ${result.export.dir}` : 'Export: skipped',
    ].join('\n'),
  );
}

/** Run a full scrape with resolved options. Used by the CLI and by tests. */
export async function runScrape(o: ScrapeOptions, client?: SocrataClient): Promise<ScrapeResult> {
  setVerbose(o.verbose);
  const socrata =
    client ??
    new SocrataClient({
      appToken: o.appToken,
      logger: {
        debug: (m) => logger.debug(m),
        info: (m) => logger.info(m),
        warn: (m) => logger.warn(m),
      },
    });
  const store = new LocalStore(o.dryRun ? ':memory:' : o.dbPath);
  try {
    logger.info(`Store: ${o.dryRun ? '(memory — dry run)' : o.dbPath}`);
    await syncGeo(socrata, store, o);
    const processes = await syncProcesses(socrata, store, o);
    const contracts = await syncContracts(socrata, store, o);
    let exported: ExportResult | null = null;
    if (o.export && !o.dryRun) {
      logger.start(`Export → ${o.exportDir}`);
      exported = exportArtifacts(store, o);
    }
    const result: ScrapeResult = {
      processes,
      contracts,
      export: exported,
      totals: {
        processes: store.countProcesses(),
        contracts: store.countContracts(),
        municipalities: store.countMunicipalities(),
      },
    };
    printSummary(result, o);
    return result;
  } finally {
    store.close();
  }
}
