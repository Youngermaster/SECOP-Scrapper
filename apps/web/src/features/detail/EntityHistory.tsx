import {
  contractsForPortfolio,
  entityHistory,
  MODALITY_LABELS,
  similarContracts,
  type Contract,
  type Opportunity,
} from '@secop-radar/core';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@secop-radar/ui';
import { ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { useDataset } from '@/data/DatasetProvider';
import { useContracts } from '@/data/queries';
import { formatCOP, formatCOPCompact, formatDate, formatPercent } from '@/lib/format';

function ContractRow({ c }: { c: Contract }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="line-clamp-2 leading-snug">{c.object}</p>
        <p className="mt-0.5 text-xs text-muted-fg">
          {c.supplier.name ?? 'Proveedor sin nombre'}{' '}
          {c.supplier.isPyme ? <Badge tone="info">PYME</Badge> : null} · {formatDate(c.signedAt)} ·{' '}
          {MODALITY_LABELS[c.modality]}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="tabular text-sm font-medium">{formatCOPCompact(c.value)}</span>
        {c.url ? (
          <a
            href={c.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-muted-fg hover:text-fg"
            aria-label="Abrir contrato en SECOP II"
          >
            <ExternalLink className="size-4" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <div className="text-[11px] tracking-wide text-muted-fg uppercase">{label}</div>
      <div className="tabular text-sm font-semibold">{value}</div>
    </div>
  );
}

/** What the contracts dataset says about the awarding entity and this process. */
export function EntityHistory({ opportunity }: { opportunity: Opportunity }) {
  const { manifest } = useDataset();
  const contractsQ = useContracts(manifest);
  const contracts = contractsQ.data;

  const history = useMemo(
    () => (contracts ? entityHistory(contracts, opportunity.entity) : null),
    [contracts, opportunity.entity],
  );
  const sameProcess = useMemo(
    () => (contracts ? contractsForPortfolio(contracts, opportunity.portfolioId) : []),
    [contracts, opportunity.portfolioId],
  );
  const similar = useMemo(
    () => (contracts ? similarContracts(contracts, opportunity, 6) : []),
    [contracts, opportunity],
  );

  if (contractsQ.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de la entidad</CardTitle>
          <CardDescription>
            No se pudo cargar contracts.json.gz: {contractsQ.error.message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  if (!history) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de la entidad</CardTitle>
          <CardDescription>Cargando contratos electrónicos…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sameProcess.length > 0 ? (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle>Este proceso ya tiene contrato</CardTitle>
            <CardDescription>
              {sameProcess.length === 1
                ? 'Existe 1 contrato'
                : `Existen ${sameProcess.length} contratos`}{' '}
              vinculados al mismo proceso de compra ({opportunity.portfolioId}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {sameProcess.map((c) => (
                <ContractRow key={c.id} c={c} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Historial de la entidad en tecnología</CardTitle>
          <CardDescription>
            Contratos de {history.name} en el dataset de contratos electrónicos (categorías TI,
            desde {formatDate(manifest.window.contractsSince)}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {history.contracts === 0 ? (
            <p className="text-sm text-muted-fg">
              Sin contratos de tecnología registrados para esta entidad en la ventana descargada.
              Puede ser una entidad nueva en TI o contratar bajo otras categorías.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Contratos" value={history.contracts.toLocaleString('es-CO')} />
                <Stat label="Valor mediano" value={formatCOPCompact(history.stats.median)} />
                <Stat label="Valor promedio" value={formatCOPCompact(history.stats.mean)} />
                <Stat label="Adjudicados a PYME" value={formatPercent(history.pymeShare)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-fg uppercase">
                    Proveedores frecuentes
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {history.topSuppliers.map((s) => (
                      <li key={s.key} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {s.label} {s.extra ? <Badge tone="info">{s.extra}</Badge> : null}
                        </span>
                        <span className="tabular shrink-0 text-xs text-muted-fg">
                          {s.count} · {formatCOPCompact(s.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-fg uppercase">
                    Modalidades que usa
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {history.modalityMix.slice(0, 5).map((m) => (
                      <li key={m.modality} className="flex items-center justify-between gap-2">
                        <span>{MODALITY_LABELS[m.modality]}</span>
                        <span className="tabular text-xs text-muted-fg">{m.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-fg uppercase">
                  Contratos recientes
                </h4>
                <ul className="divide-y divide-border">
                  {history.recent.map((c) => (
                    <ContractRow key={c.id} c={c} />
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-fg">
                  Total contratado en TI: {formatCOP(history.stats.total)}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {similar.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Contratos similares adjudicados</CardTitle>
            <CardDescription>
              Misma familia UNSPSC o palabras clave del objeto, en cualquier entidad. Útil para
              estimar valores y ver quién gana.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {similar.map((c) => (
                <ContractRow key={c.id} c={c} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
