import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from '@secop-radar/ui';
import { Bookmark, Download, ExternalLink, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { z } from 'zod';
import { LifecycleBadge, RupBadge } from '@/components/Badges';
import { PageHeader } from '@/components/PageHeader';
import { ScoreChip } from '@/components/ScoreBadge';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useDataset } from '@/data/DatasetProvider';
import { daysLeftLabel, formatCOPCompact, formatDate, relativeTime } from '@/lib/format';
import {
  SHORTLIST_STATUS_LABELS,
  useShortlist,
  type ShortlistEntry,
  type ShortlistStatus,
} from '@/stores/shortlist';

const entrySchema = z.object({
  id: z.string(),
  status: z.enum(['interested', 'applied', 'discarded']),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  snapshot: z.object({
    title: z.string(),
    entity: z.string(),
    closesAt: z.string().nullable(),
    value: z.number().nullable(),
    url: z.string().nullable(),
  }),
});

type StatusFilter = ShortlistStatus | 'all';

const STATUS_TONE: Record<ShortlistStatus, 'primary' | 'success' | 'neutral'> = {
  interested: 'primary',
  applied: 'success',
  discarded: 'neutral',
};

export function ShortlistPage() {
  const entries = useShortlist((s) => s.entries);
  const setStatus = useShortlist((s) => s.setStatus);
  const setNotes = useShortlist((s) => s.setNotes);
  const remove = useShortlist((s) => s.remove);
  const importEntries = useShortlist((s) => s.importEntries);
  const { scoredById } = useDataset();
  const [status, setStatusFilter] = useState<StatusFilter>('all');
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => status === 'all' || e.status === status)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [entries, status],
  );
  const counts = useMemo(() => {
    const c: Record<ShortlistStatus, number> = { interested: 0, applied: 0, discarded: 0 };
    for (const e of Object.values(entries)) c[e.status] += 1;
    return c;
  }, [entries]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(Object.values(entries), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secop-radar-guardadas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File) => {
    setImportError(null);
    try {
      const parsed = z.array(entrySchema).safeParse(JSON.parse(await file.text()));
      if (!parsed.success)
        throw new Error('El archivo no tiene el formato de exportación de SECOP Radar.');
      importEntries(parsed.data as ShortlistEntry[]);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <PageHeader
        title="Oportunidades guardadas"
        description="Tu lista corta con estado y notas. Se guarda en este navegador; exporta un respaldo cuando quieras."
        actions={
          <>
            <Button
              variant="outline"
              onClick={exportJson}
              disabled={Object.keys(entries).length === 0}
            >
              <Download /> Exportar JSON
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload /> Importar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="sr-only"
              aria-label="Importar guardadas"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = '';
              }}
            />
          </>
        }
      />
      <div className="space-y-4 p-4 md:p-6">
        {importError ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {importError}
          </p>
        ) : null}
        <div className="max-w-xl">
          <SegmentedControl<StatusFilter>
            label="Estado"
            size="md"
            value={status}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: `Todas (${Object.keys(entries).length})` },
              {
                value: 'interested',
                label: `${SHORTLIST_STATUS_LABELS.interested} (${counts.interested})`,
              },
              { value: 'applied', label: `${SHORTLIST_STATUS_LABELS.applied} (${counts.applied})` },
              {
                value: 'discarded',
                label: `${SHORTLIST_STATUS_LABELS.discarded} (${counts.discarded})`,
              },
            ]}
          />
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={<Bookmark />}
            title={
              Object.keys(entries).length === 0
                ? 'Aún no has guardado oportunidades'
                : 'Nada en este estado'
            }
            description="Usa el ícono de marcador en la lista o en el detalle para guardar procesos que te interesen."
            action={
              <Link to="/" className="text-sm text-primary hover:underline">
                Ir a oportunidades
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {list.map((e) => {
              const live = scoredById.get(e.id);
              const o = live?.opportunity;
              return (
                <li key={e.id}>
                  <Card className={cn(e.status === 'discarded' && 'opacity-70')}>
                    <CardContent className="grid gap-4 p-4 md:grid-cols-[auto_1fr_16rem]">
                      <div>
                        {live ? (
                          <ScoreChip score={live.score.score} />
                        ) : (
                          <ScoreChip score={0} className="opacity-40" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <Link
                          to={`/oportunidad/${encodeURIComponent(e.id)}`}
                          className="line-clamp-2 font-medium hover:underline"
                        >
                          {o?.title ?? e.snapshot.title}
                        </Link>
                        <p className="text-xs text-muted-fg">
                          {o?.entity.name ?? e.snapshot.entity} · cierra{' '}
                          {formatDate(o?.closesAt ?? e.snapshot.closesAt)}
                          {live?.lifecycle === 'open'
                            ? ` (${daysLeftLabel(live.daysLeft)})`
                            : ''} · {formatCOPCompact(o?.value ?? e.snapshot.value)}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={STATUS_TONE[e.status]}>
                            {SHORTLIST_STATUS_LABELS[e.status]}
                          </Badge>
                          {live ? (
                            <LifecycleBadge lifecycle={live.lifecycle} />
                          ) : (
                            <Badge tone="warning">Fuera del dataset actual</Badge>
                          )}
                          {live ? <RupBadge rup={live.rup} compact /> : null}
                          <span className="text-[11px] text-muted-fg">
                            actualizada {relativeTime(e.updatedAt)}
                          </span>
                        </div>
                        <Textarea
                          value={e.notes}
                          onChange={(ev) => setNotes(e.id, ev.target.value)}
                          placeholder="Notas: contactos, requisitos, documentos pendientes…"
                          className="min-h-14 text-xs"
                          aria-label={`Notas para ${e.snapshot.title}`}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Select
                          value={e.status}
                          onValueChange={(v) => setStatus(e.id, v as ShortlistStatus)}
                        >
                          <SelectTrigger aria-label="Estado de la postulación">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(SHORTLIST_STATUS_LABELS) as ShortlistStatus[]).map(
                              (s) => (
                                <SelectItem key={s} value={s}>
                                  {SHORTLIST_STATUS_LABELS[s]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          {(o?.url ?? e.snapshot.url) ? (
                            <a
                              href={o?.url ?? e.snapshot.url ?? '#'}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-card text-sm hover:bg-muted"
                            >
                              <ExternalLink className="size-4" /> SECOP II
                            </a>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Quitar de guardadas"
                            onClick={() => remove(e.id)}
                          >
                            <Trash2 className="text-danger" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
