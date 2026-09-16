import {
  contractsForPortfolio,
  entityHistory,
  MODALITY_LABELS,
  similarContracts,
  type Contract,
  type Opportunity,
} from '@secop-radar/core';
import { Badge, Skeleton } from '@secop-radar/ui';
import { ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { useDataset } from '@/data/DatasetProvider';
import { useContracts } from '@/data/queries';
import { formatCOP, formatCOPCompact, formatDate, formatPercent } from '@/lib/format';

function ContractRow({ c }: { c: Contract }) {
  return (
    <li className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="line-clamp-2 text-[13px] leading-snug">{c.object}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-fg">
          <span>{c.supplier.name ?? 'Proveedor sin nombre'}</span>
          {c.supplier.isPyme ? <Badge tone="info">PYME</Badge> : null}
          <span className="font-mono">{formatDate(c.signedAt)}</span>
          <span>{MODALITY_LABELS[c.modality]}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-xs font-medium tabular-nums">
          {formatCOPCompact(c.value)}
        </span>
        {c.url ? (
          <a
            href={c.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-muted-fg transition-colors hover:text-fg"
            aria-label="Abrir contrato en SECOP II"
          >
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-border pl-3">
      <div className="text-2xs text-muted-fg">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Block({
  title,
  description,
  tone = 'default',
  children,
}: {
  title: string;
  description?: React.ReactNode;
  tone?: 'default' | 'warning';
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        tone === 'warning'
          ? 'rounded-lg border border-warning/50 bg-warning-soft/40 p-4'
          : 'border-t border-border pt-5 first:border-t-0 first:pt-0'
      }
    >
      <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-muted-fg">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
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
      <Block
        title="Historial de la entidad"
        description={`No se pudo cargar contracts.json.gz: ${contractsQ.error.message}`}
      >
        <span />
      </Block>
    );
  }
  if (!history) {
    return (
      <Block title="Historial de la entidad" description="Cargando contratos electrónicos">
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Block>
    );
  }

  return (
    <div className="space-y-5">
      {sameProcess.length > 0 ? (
        <Block
          tone="warning"
          title="Este proceso ya tiene contrato"
          description={`${sameProcess.length === 1 ? 'Existe 1 contrato' : `Existen ${sameProcess.length} contratos`} vinculados al mismo proceso de compra (${opportunity.portfolioId}).`}
        >
          <ul className="divide-y divide-border">
            {sameProcess.map((c) => (
              <ContractRow key={c.id} c={c} />
            ))}
          </ul>
        </Block>
      ) : null}

      <Block
        title="Historial de la entidad en tecnología"
        description={`Contratos de ${history.name} en el dataset de contratos electrónicos (categorías TI, desde ${formatDate(manifest.window.contractsSince)}).`}
      >
        {history.contracts === 0 ? (
          <p className="text-[13px] text-muted-fg">
            Sin contratos de tecnología registrados para esta entidad en la ventana descargada.
            Puede ser una entidad nueva en TI o contratar bajo otras categorías.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Contratos" value={history.contracts.toLocaleString('es-CO')} />
              <Stat label="Valor mediano" value={formatCOPCompact(history.stats.median)} />
              <Stat label="Valor promedio" value={formatCOPCompact(history.stats.mean)} />
              <Stat label="Adjudicados a PYME" value={formatPercent(history.pymeShare)} />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-1.5 text-xs font-medium text-fg-2">Proveedores frecuentes</h3>
                <ul className="space-y-1 text-[13px]">
                  {history.topSuppliers.map((s) => (
                    <li key={s.key} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate">{s.label}</span>
                        {s.extra ? <Badge tone="info">{s.extra}</Badge> : null}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-fg tabular-nums">
                        {s.count} · {formatCOPCompact(s.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1.5 text-xs font-medium text-fg-2">Modalidades que usa</h3>
                <ul className="space-y-1 text-[13px]">
                  {history.modalityMix.slice(0, 5).map((m) => (
                    <li key={m.modality} className="flex items-center justify-between gap-2">
                      <span>{MODALITY_LABELS[m.modality]}</span>
                      <span className="font-mono text-xs text-muted-fg tabular-nums">
                        {m.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-medium text-fg-2">Contratos recientes</h3>
              <ul className="divide-y divide-border">
                {history.recent.map((c) => (
                  <ContractRow key={c.id} c={c} />
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-fg">
                Total contratado en TI:{' '}
                <span className="font-mono text-fg">{formatCOP(history.stats.total)}</span>
              </p>
            </div>
          </div>
        )}
      </Block>

      {similar.length > 0 ? (
        <Block
          title="Contratos similares adjudicados"
          description="Misma familia UNSPSC o palabras clave del objeto, en cualquier entidad. Útil para estimar valores y ver quién gana."
        >
          <ul className="divide-y divide-border">
            {similar.map((c) => (
              <ContractRow key={c.id} c={c} />
            ))}
          </ul>
        </Block>
      ) : null}
    </div>
  );
}
