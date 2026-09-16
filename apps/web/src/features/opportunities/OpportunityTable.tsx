import { MODALITY_LABELS, type ScoredOpportunity, type SortKey } from '@secop-radar/core';
import { Button, cn, EmptyState, Tooltip, TooltipContent, TooltipTrigger } from '@secop-radar/ui';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, SearchX } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { FlagBadges, RupBadge } from '@/components/Badges';
import { SaveButton } from '@/components/SaveButton';
import { ScoreBadge } from '@/components/ScoreBadge';
import { daysLeftLabel, formatCOPCompact, formatDate } from '@/lib/format';
import { useFilters } from '@/stores/filters';

const helper = createColumnHelper<ScoredOpportunity>();

const SORTABLE: Partial<Record<string, SortKey>> = {
  score: 'score',
  title: 'title',
  value: 'value',
  closesAt: 'closesAt',
  entity: 'entity',
};

function daysTone(days: number | null, lifecycle: ScoredOpportunity['lifecycle']): string {
  if (lifecycle !== 'open' || days == null) return 'text-muted-fg';
  if (days <= 1) return 'font-medium text-danger';
  if (days <= 3) return 'font-medium text-warning';
  return 'text-fg-2';
}

export function OpportunityTable({ items }: { items: ScoredOpportunity[] }) {
  const navigate = useNavigate();
  const sortKey = useFilters((s) => s.filters.sortKey);
  const sortDir = useFilters((s) => s.filters.sortDir);
  const set = useFilters((s) => s.set);

  const columns = useMemo<Array<ColumnDef<ScoredOpportunity, unknown>>>(
    () =>
      [
        helper.display({
          id: 'score',
          header: 'Puntaje',
          size: 64,
          cell: ({ row }) => <ScoreBadge result={row.original.score} />,
        }),
        helper.display({
          id: 'title',
          header: 'Proceso',
          size: 520,
          cell: ({ row }) => {
            const o = row.original.opportunity;
            return (
              <div className="min-w-0">
                <Link
                  to={`/oportunidad/${encodeURIComponent(o.id)}`}
                  className="line-clamp-2 text-[13px] leading-snug font-medium text-fg hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  {o.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-fg">
                  <span className="truncate">{o.entity.name}</span>
                  <FlagBadges flags={row.original.score.flags} max={2} />
                </div>
              </div>
            );
          },
        }),
        helper.display({
          id: 'entity',
          header: 'Ubicación',
          size: 150,
          cell: ({ row }) => {
            const e = row.original.opportunity.entity;
            return (
              <div className="text-xs leading-snug">
                <div className="text-fg">{e.department ?? '—'}</div>
                <div className="truncate text-muted-fg">{e.city ?? ''}</div>
              </div>
            );
          },
        }),
        helper.display({
          id: 'modality',
          header: 'Modalidad',
          size: 170,
          cell: ({ row }) => {
            const o = row.original.opportunity;
            return (
              <div className="text-xs leading-snug">
                <div className="line-clamp-2 text-fg-2">{MODALITY_LABELS[o.modality]}</div>
                <div className="mt-1">
                  <RupBadge rup={row.original.rup} compact />
                </div>
              </div>
            );
          },
        }),
        helper.display({
          id: 'value',
          header: 'Valor',
          size: 104,
          cell: ({ row }) => (
            <span className="font-mono text-xs tabular-nums">
              {formatCOPCompact(row.original.opportunity.value)}
            </span>
          ),
        }),
        helper.display({
          id: 'closesAt',
          header: 'Cierra',
          size: 118,
          cell: ({ row }) => {
            const { opportunity: o, daysLeft, lifecycle } = row.original;
            return (
              <div className="text-xs leading-snug">
                <div className="font-mono tabular-nums">{formatDate(o.closesAt)}</div>
                <div className={daysTone(daysLeft, lifecycle)}>
                  {lifecycle === 'open'
                    ? daysLeftLabel(daysLeft)
                    : lifecycle === 'draft'
                      ? 'borrador'
                      : 'cerrado'}
                </div>
              </div>
            );
          },
        }),
        helper.display({
          id: 'actions',
          header: '',
          size: 76,
          cell: ({ row }) => {
            const o = row.original.opportunity;
            return (
              <div className="flex items-center justify-end gap-0.5">
                <SaveButton opportunity={o} />
                {o.url ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label="Abrir en SECOP II"
                        onClick={(e) => e.stopPropagation()}
                        className="grid size-7 place-items-center rounded-md text-muted-fg transition-colors hover:bg-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Abrir en SECOP II</TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            );
          },
        }),
      ] as Array<ColumnDef<ScoredOpportunity, unknown>>,
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.opportunity.id,
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 8,
  });

  const toggleSort = (id: string) => {
    const key = SORTABLE[id];
    if (!key) return;
    if (sortKey === key) set({ sortDir: sortDir === 'desc' ? 'asc' : 'desc' });
    else
      set({
        sortKey: key,
        sortDir: key === 'title' || key === 'entity' || key === 'closesAt' ? 'asc' : 'desc',
      });
  };

  if (items.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<SearchX />}
          title="Sin oportunidades con estos filtros"
          description="Prueba ampliar el rango de valor, incluir más estados o quitar palabras de la búsqueda. Si el dataset es pequeño, ejecuta el scraper con una ventana mayor: pnpm scraper --closing-window 60."
          action={
            <Button variant="outline" onClick={() => useFilters.getState().reset()}>
              Restablecer filtros
            </Button>
          }
        />
      </div>
    );
  }

  const virtualRows = virtualizer.getVirtualItems();
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom = virtualRows.length
    ? virtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end ?? 0)
    : 0;

  return (
    <div ref={parentRef} className="h-full scrollbar-thin overflow-auto">
      <table
        className="w-full table-fixed border-separate border-spacing-0 text-left"
        style={{ minWidth: 960 }}
      >
        <thead className="sticky top-0 z-10 bg-bg">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const key = SORTABLE[h.id];
                const active = key != null && key === sortKey;
                return (
                  <th
                    key={h.id}
                    scope="col"
                    // The title column is fluid; every other column keeps its fixed width.
                    style={h.id === 'title' ? undefined : { width: h.getSize() }}
                    className="h-9 border-b border-border px-3 text-2xs font-medium text-muted-fg"
                  >
                    {key ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(h.id)}
                        className={cn(
                          'inline-flex cursor-pointer items-center gap-1 rounded-sm transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                          active && 'text-fg',
                        )}
                        aria-sort={
                          active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                        }
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {active ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 ? (
            <tr>
              <td style={{ height: paddingTop }} colSpan={columns.length} />
            </tr>
          ) : null}
          {virtualRows.map((vr) => {
            const row = rows[vr.index];
            if (!row) return null;
            const o = row.original.opportunity;
            return (
              <tr
                key={row.id}
                data-index={vr.index}
                ref={virtualizer.measureElement}
                onClick={() => void navigate(`/oportunidad/${encodeURIComponent(o.id)}`)}
                className="group cursor-pointer transition-colors hover:bg-card"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="border-b border-border px-3 py-2.5 align-top group-hover:border-border-strong/60"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {paddingBottom > 0 ? (
            <tr>
              <td style={{ height: paddingBottom }} colSpan={columns.length} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
