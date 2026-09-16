import {
  DEPARTMENTS,
  normalizeDepartmentRow,
  normalizeMunicipality,
  type Department,
  type Municipality,
} from '@secop-radar/core';
import {
  DEPARTAMENTOS,
  departamentoRowSchema,
  departamentosQuery,
  MUNICIPIOS,
  municipioRowSchema,
  municipiosQuery,
  type SocrataClient,
} from '@secop-radar/secop-client';
import type { LocalStore } from '../db/database';
import { logger } from '../logger';
import type { ScrapeOptions } from '../options';

const GEO_TTL_DAYS = 90;

export async function syncGeo(
  client: SocrataClient,
  store: LocalStore,
  o: ScrapeOptions,
): Promise<void> {
  const fetchedAt = store.getState('geo.fetched_at');
  const stale =
    fetchedAt == null ||
    (Date.now() - Date.parse(fetchedAt)) / 86_400_000 > GEO_TTL_DAYS ||
    store.countMunicipalities() === 0;
  if (!o.refreshGeo && !stale) {
    logger.info(
      `Geo — cached (${store.countMunicipalities()} municipios, fetched ${fetchedAt?.slice(0, 10)})`,
    );
    return;
  }
  logger.start('Geo — DIVIPOLA departamentos + municipios');
  const municipalities: Municipality[] = [];
  let droppedM = 0;
  for await (const page of client.paginate(MUNICIPIOS.id, municipiosQuery(), municipioRowSchema, {
    pageSize: 2000,
  })) {
    for (const raw of page) {
      const r = normalizeMunicipality(raw);
      if (r.ok) municipalities.push(r.value);
      else droppedM += 1;
    }
  }
  const byCode = new Map<string, Department>(
    DEPARTMENTS.map((d) => [d.code, { code: d.code, name: d.name, lat: d.lat, lon: d.lon }]),
  );
  let droppedD = 0;
  try {
    for await (const page of client.paginate(
      DEPARTAMENTOS.id,
      departamentosQuery(),
      departamentoRowSchema,
      { pageSize: 200 },
    )) {
      for (const raw of page) {
        const r = normalizeDepartmentRow(raw);
        if (r.ok) byCode.set(r.value.code, r.value);
        else droppedD += 1;
      }
    }
  } catch (e) {
    logger.warn(`  departamentos dataset unavailable, using built-in centroids (${String(e)})`);
  }
  if (!o.dryRun) {
    store.replaceGeo([...byCode.values()], municipalities);
    store.setState('geo.fetched_at', new Date().toISOString());
  }
  logger.success(
    `  ${municipalities.length} municipios (${droppedM} dropped), ${byCode.size} departamentos (${droppedD} unknown)`,
  );
}
