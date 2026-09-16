import {
  buildMunicipalityIndex,
  findMunicipality,
  type ScoredOpportunity,
} from '@secop-radar/core';
import { useMemo } from 'react';
import { useDataset } from '@/data/DatasetProvider';

export type MapMetric = 'count' | 'avgScore' | 'totalValue';

export interface DepartmentStat {
  code: string;
  count: number;
  avgScore: number;
  totalValue: number;
  metric: number;
}

export interface MunicipalityStat {
  key: string;
  name: string;
  departmentCode: string;
  lat: number;
  lon: number;
  count: number;
  avgScore: number;
  totalValue: number;
  top: ScoredOpportunity[];
  /** Raw SECOP city string used by the filters. */
  city: string;
}

function metricOf(
  metric: MapMetric,
  s: { count: number; avgScore: number; totalValue: number },
): number {
  return metric === 'count' ? s.count : metric === 'avgScore' ? s.avgScore : s.totalValue;
}

export function useMapData(items: readonly ScoredOpportunity[], metric: MapMetric) {
  const { geo } = useDataset();
  const index = useMemo(() => buildMunicipalityIndex(geo), [geo]);

  return useMemo(() => {
    const byDept = new Map<string, { count: number; score: number; value: number }>();
    const byMun = new Map<string, MunicipalityStat & { score: number }>();
    let unlocated = 0;
    for (const it of items) {
      const e = it.opportunity.entity;
      if (e.departmentCode == null) {
        unlocated += 1;
        continue;
      }
      const d = byDept.get(e.departmentCode) ?? { count: 0, score: 0, value: 0 };
      d.count += 1;
      d.score += it.score.score;
      d.value += it.opportunity.value ?? 0;
      byDept.set(e.departmentCode, d);

      const mun = findMunicipality(index, e.departmentCode, e.city);
      if (!mun) continue;
      const key = mun.code;
      const m =
        byMun.get(key) ??
        ({
          key,
          name: mun.name,
          departmentCode: mun.departmentCode,
          lat: mun.lat,
          lon: mun.lon,
          count: 0,
          avgScore: 0,
          totalValue: 0,
          top: [],
          city: e.city ?? mun.name,
          score: 0,
        } as MunicipalityStat & { score: number });
      m.count += 1;
      m.score += it.score.score;
      m.totalValue += it.opportunity.value ?? 0;
      if (m.top.length < 3) m.top.push(it);
      byMun.set(key, m);
    }
    const departments = new Map<string, DepartmentStat>();
    for (const [code, d] of byDept) {
      const s = {
        code,
        count: d.count,
        avgScore: d.count ? d.score / d.count : 0,
        totalValue: d.value,
      };
      departments.set(code, { ...s, metric: metricOf(metric, s) });
    }
    const municipalities = [...byMun.values()].map(({ score, ...m }) => ({
      ...m,
      avgScore: m.count ? score / m.count : 0,
    }));
    const maxDept = Math.max(0, ...[...departments.values()].map((d) => d.metric));
    const maxMun = Math.max(0, ...municipalities.map((m) => metricOf(metric, m)));
    return {
      departments,
      municipalities,
      maxDept,
      maxMun,
      unlocated,
      metricOf: (s: { count: number; avgScore: number; totalValue: number }) => metricOf(metric, s),
    };
  }, [items, index, metric]);
}
