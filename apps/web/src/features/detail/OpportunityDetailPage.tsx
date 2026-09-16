import {
  MODALITY_LABELS,
  UNSPSC_FAMILY_LABELS,
  UNSPSC_SEGMENT_LABELS,
  RUP_LABELS,
} from '@secop-radar/core';
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@secop-radar/ui';
import { ArrowLeft, Copy, ExternalLink, FileSearch, Link2Off } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { FlagBadges, LifecycleBadge, RupBadge } from '@/components/Badges';
import { SaveButton } from '@/components/SaveButton';
import { ScoreBreakdown, ScoreChip } from '@/components/ScoreBadge';
import { useDataset } from '@/data/DatasetProvider';
import { daysLeftLabel, formatCOP, formatDate, formatInt } from '@/lib/format';
import { SHORTLIST_STATUS_LABELS, useShortlist, type ShortlistStatus } from '@/stores/shortlist';
import { EntityHistory } from './EntityHistory';
import { VerificationChecklist } from './VerificationChecklist';

function Field({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] tracking-wide text-muted-fg uppercase">{label}</dt>
      <dd className={mono ? 'font-mono text-sm break-all' : 'text-sm'}>{children ?? '—'}</dd>
    </div>
  );
}

const DURATION_LABEL = {
  dias: 'días',
  semanas: 'semanas',
  meses: 'meses',
  anios: 'años',
  horas: 'horas',
  desconocido: '',
} as const;

export function OpportunityDetailPage() {
  const { id = '' } = useParams();
  const { scoredById } = useDataset();
  const item = scoredById.get(decodeURIComponent(id));
  const [copied, setCopied] = useState(false);
  const entry = useShortlist((s) => s.entries[decodeURIComponent(id)]);
  const setStatus = useShortlist((s) => s.setStatus);
  const setNotes = useShortlist((s) => s.setNotes);

  if (!item) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<FileSearch />}
          title="Oportunidad no encontrada"
          description="No está en el dataset local. Puede haber salido de la ventana de exportación; ejecuta pnpm scraper con --closing-window mayor."
          action={
            <Link to="/" className={buttonVariants({ variant: 'outline' })}>
              <ArrowLeft /> Volver a oportunidades
            </Link>
          }
        />
      </div>
    );
  }

  const o = item.opportunity;
  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(o.reference ?? o.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg">
        <ArrowLeft className="size-4" /> Oportunidades
      </Link>

      <header className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <ScoreChip score={item.score.score} className="size-14 text-xl" />
          <div className="min-w-0">
            <h1 className="text-lg leading-snug font-semibold text-balance md:text-xl">
              {o.title}
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              {o.entity.name} · {o.entity.city ? `${o.entity.city}, ` : ''}
              {o.entity.department ?? 'Departamento no definido'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <LifecycleBadge lifecycle={item.lifecycle} />
              <Badge tone="outline">{MODALITY_LABELS[o.modality]}</Badge>
              <RupBadge rup={item.rup} />
              <FlagBadges flags={item.score.flags} max={4} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <SaveButton opportunity={o} size="md" showLabel />
          {o.url ? (
            <a
              href={o.url}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants({ variant: 'primary' })}
            >
              <ExternalLink /> Ver en SECOP II
            </a>
          ) : (
            <Button variant="outline" onClick={() => void copyRef()}>
              {copied ? (
                'Copiado'
              ) : (
                <>
                  <Link2Off /> Sin enlace · copiar referencia
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      {entry ? (
        <Card className="mt-5 border-primary/30">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
            <div className="w-full md:w-56">
              <label
                className="mb-1 block text-xs font-medium text-muted-fg"
                htmlFor="shortlist-status"
              >
                Estado de mi postulación
              </label>
              <Select
                value={entry.status}
                onValueChange={(v) => setStatus(o.id, v as ShortlistStatus)}
              >
                <SelectTrigger id="shortlist-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SHORTLIST_STATUS_LABELS) as ShortlistStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SHORTLIST_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label
                className="mb-1 block text-xs font-medium text-muted-fg"
                htmlFor="shortlist-notes"
              >
                Mis notas
              </label>
              <Textarea
                id="shortlist-notes"
                value={entry.notes}
                onChange={(e) => setNotes(o.id, e.target.value)}
                placeholder="Contactos, dudas del pliego, documentos que faltan…"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Objeto del proceso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">{o.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datos clave</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Valor estimado">{formatCOP(o.value)}</Field>
                <Field label="Duración">
                  {o.duration ? `${o.duration.amount} ${DURATION_LABEL[o.duration.unit]}` : '—'}
                </Field>
                <Field label="Lotes">{o.lots ?? '—'}</Field>
                <Field label="Modalidad (SECOP)">{o.modalityRaw ?? '—'}</Field>
                <Field label="Justificación de la modalidad">
                  {o.modalityJustification ?? '—'}
                </Field>
                <Field label="Tipo de contrato">
                  {o.contractType ?? '—'}
                  {o.contractSubtype ? ` · ${o.contractSubtype}` : ''}
                </Field>
                <Field label="Categoría UNSPSC" mono>
                  {o.unspscCode ?? '—'}
                  {o.unspscFamily ? (
                    <span className="ml-1 font-sans text-muted-fg">
                      {UNSPSC_FAMILY_LABELS[o.unspscFamily] ??
                        UNSPSC_SEGMENT_LABELS[o.unspscSegment ?? ''] ??
                        ''}
                    </span>
                  ) : null}
                </Field>
                <Field label="Categorías adicionales">{o.additionalCategories ?? '—'}</Field>
                <Field label="Fase">{o.phase ?? '—'}</Field>
                <Field label="ID del proceso" mono>
                  {o.id}
                </Field>
                <Field label="Referencia" mono>
                  {o.reference ?? '—'}
                </Field>
                <Field label="Portafolio (proceso de compra)" mono>
                  {o.portfolioId ?? '—'}
                </Field>
              </dl>
              {!o.url ? (
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-fg">
                  <Copy className="size-3.5" /> Sin enlace en el dataset: busca la referencia en{' '}
                  <a
                    className="text-primary hover:underline"
                    href="https://community.secop.gov.co/Public/Tendering/ContractNoticeManagement/Index?currentLanguage=es-CO&Page=1&Country=CO"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    la búsqueda pública de SECOP II
                  </a>
                  .
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cronograma</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3">
                  <Field label="Publicado">{formatDate(o.publishedAt)}</Field>
                  <Field label="Última publicación">{formatDate(o.lastPublishedAt)}</Field>
                  <Field label="Cierre de respuestas">
                    {formatDate(o.closesAt)}
                    {item.lifecycle === 'open' ? (
                      <span className="ml-1 text-muted-fg">({daysLeftLabel(item.daysLeft)})</span>
                    ) : null}
                  </Field>
                  <Field label="Apertura de respuestas">{formatDate(o.responseOpensAt)}</Field>
                  <Field label="Estado (SECOP)">{o.statusRaw ?? '—'}</Field>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Entidad</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3">
                  <Field label="Nombre">{o.entity.name}</Field>
                  <Field label="NIT" mono>
                    {o.entity.nit ?? '—'}
                  </Field>
                  <Field label="Orden">
                    {o.entity.order === 'desconocido' ? '—' : o.entity.order}
                  </Field>
                  <Field label="Centralizada">
                    {o.entity.centralized == null ? '—' : o.entity.centralized ? 'Sí' : 'No'}
                  </Field>
                  <Field label="Departamento">{o.entity.department ?? '—'}</Field>
                  <Field label="Ciudad">{o.entity.city ?? '—'}</Field>
                </dl>
              </CardContent>
            </Card>
          </div>

          {o.award ? (
            <Card>
              <CardHeader>
                <CardTitle>Adjudicación</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Proveedor">{o.award.supplierName ?? '—'}</Field>
                  <Field label="NIT" mono>
                    {o.award.supplierNit ?? '—'}
                  </Field>
                  <Field label="Valor">{formatCOP(o.award.value)}</Field>
                  <Field label="Fecha">{formatDate(o.award.date)}</Field>
                </dl>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Participación</CardTitle>
              <CardDescription>
                Contadores publicados por SECOP II (suelen actualizarse con retraso).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                <Field label="Invitados">{formatInt(o.counters.invited)}</Field>
                <Field label="Invitación directa">{formatInt(o.counters.directInvites)}</Field>
                <Field label="Vistas">{formatInt(o.counters.views)}</Field>
                <Field label="Interesados">{formatInt(o.counters.interested)}</Field>
                <Field label="Respuestas">{formatInt(o.counters.responses)}</Field>
                <Field label="Oferentes únicos">{formatInt(o.counters.uniqueBidders)}</Field>
              </dl>
            </CardContent>
          </Card>

          <EntityHistory opportunity={o} />
        </div>

        <aside className="space-y-4">
          <VerificationChecklist item={item} />
          <Card>
            <CardHeader>
              <CardTitle>Puntaje de compatibilidad</CardTitle>
              <CardDescription>
                Ajusta los pesos en{' '}
                <Link to="/ajustes" className="text-primary hover:underline">
                  Ajustes
                </Link>
                .
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreBreakdown result={item.score} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>RUP · {RUP_LABELS[item.rup.requirement]}</CardTitle>
              <CardDescription>
                {item.rup.basis === 'rule' ? 'Regla legal' : 'Inferencia heurística'} — no es una
                garantía.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{item.rup.reason}</p>
              {item.rup.notes.map((n) => (
                <p key={n} className="text-warning">
                  {n}
                </p>
              ))}
              {item.rup.legalBasis ? (
                <p className="text-xs text-muted-fg">Base: {item.rup.legalBasis}</p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
