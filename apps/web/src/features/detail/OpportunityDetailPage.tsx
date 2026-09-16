import {
  MODALITY_LABELS,
  RUP_LABELS,
  UNSPSC_FAMILY_LABELS,
  UNSPSC_SEGMENT_LABELS,
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
  cn,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@secop-radar/ui';
import { ArrowLeft, ExternalLink, FileSearch, Link2Off } from 'lucide-react';
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
  className,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-2xs text-muted-fg">{label}</dt>
      <dd className={cn('mt-0.5 text-[13px] text-fg', mono && 'font-mono text-xs break-all')}>
        {children ?? '—'}
      </dd>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-5 first:border-t-0 first:pt-0">
      <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-muted-fg">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
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
    <div className="mx-auto max-w-[1400px] px-5 py-4 md:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-xs text-muted-fg transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> Oportunidades
      </Link>

      <header className="mt-3 flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <ScoreChip score={item.score.score} className="size-12 text-lg" />
          <div className="min-w-0">
            <p className="font-mono text-2xs text-muted-fg">
              {o.id}
              {o.reference ? ` · ${o.reference}` : ''}
            </p>
            <h1 className="mt-1 max-w-3xl text-base leading-snug font-semibold text-balance md:text-lg">
              {o.title}
            </h1>
            <p className="mt-1 text-[13px] text-fg-2">
              {o.entity.name}
              <span className="text-muted-fg">
                {' '}
                · {o.entity.city ? `${o.entity.city}, ` : ''}
                {o.entity.department ?? 'Departamento no definido'}
              </span>
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
        <div className="mt-5 grid gap-3 rounded-lg border border-primary/40 bg-primary-soft/40 p-4 md:grid-cols-[14rem_1fr]">
          <div>
            <label className="mb-1 block text-2xs text-muted-fg" htmlFor="shortlist-status">
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
          <div>
            <label className="mb-1 block text-2xs text-muted-fg" htmlFor="shortlist-notes">
              Mis notas
            </label>
            <Textarea
              id="shortlist-notes"
              value={entry.notes}
              onChange={(e) => setNotes(o.id, e.target.value)}
              placeholder="Contactos, dudas del pliego, documentos que faltan"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div>
          <Section title="Objeto del proceso">
            <p className="max-w-[70ch] text-[13.5px] leading-relaxed whitespace-pre-line text-fg-2">
              {o.description}
            </p>
          </Section>

          <Section title="Datos clave">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Field label="Valor estimado" mono>
                {formatCOP(o.value)}
              </Field>
              <Field label="Duración">
                {o.duration ? `${o.duration.amount} ${DURATION_LABEL[o.duration.unit]}` : '—'}
              </Field>
              <Field label="Lotes" mono>
                {o.lots ?? '—'}
              </Field>
              <Field label="Modalidad (SECOP)">{o.modalityRaw ?? '—'}</Field>
              <Field label="Justificación de la modalidad" className="sm:col-span-2">
                {o.modalityJustification ?? '—'}
              </Field>
              <Field label="Tipo de contrato">
                {o.contractType ?? '—'}
                {o.contractSubtype ? ` · ${o.contractSubtype}` : ''}
              </Field>
              <Field label="Categoría UNSPSC" mono>
                {o.unspscCode ?? '—'}
                {o.unspscFamily ? (
                  <span className="ml-1.5 font-sans text-[13px] text-muted-fg">
                    {UNSPSC_FAMILY_LABELS[o.unspscFamily] ??
                      UNSPSC_SEGMENT_LABELS[o.unspscSegment ?? ''] ??
                      ''}
                  </span>
                ) : null}
              </Field>
              <Field label="Categorías adicionales">{o.additionalCategories ?? '—'}</Field>
              <Field label="Fase">{o.phase ?? '—'}</Field>
              <Field label="Portafolio (proceso de compra)" mono>
                {o.portfolioId ?? '—'}
              </Field>
            </dl>
            {!o.url ? (
              <p className="mt-4 text-xs text-muted-fg">
                Sin enlace en el dataset: busca la referencia en{' '}
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
          </Section>

          <div className="grid border-t border-border md:grid-cols-2 md:gap-8">
            <Section title="Cronograma">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Publicado" mono>
                  {formatDate(o.publishedAt)}
                </Field>
                <Field label="Última publicación" mono>
                  {formatDate(o.lastPublishedAt)}
                </Field>
                <Field label="Cierre de respuestas" mono>
                  {formatDate(o.closesAt)}
                  {item.lifecycle === 'open' ? (
                    <span className="ml-1 font-sans text-muted-fg">
                      ({daysLeftLabel(item.daysLeft)})
                    </span>
                  ) : null}
                </Field>
                <Field label="Apertura de respuestas" mono>
                  {formatDate(o.responseOpensAt)}
                </Field>
                <Field label="Estado (SECOP)">{o.statusRaw ?? '—'}</Field>
              </dl>
            </Section>
            <Section title="Entidad">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Nombre" className="col-span-2">
                  {o.entity.name}
                </Field>
                <Field label="NIT" mono>
                  {o.entity.nit ?? '—'}
                </Field>
                <Field label="Orden">
                  {o.entity.order === 'desconocido' ? '—' : o.entity.order}
                </Field>
                <Field label="Centralizada">
                  {o.entity.centralized == null ? '—' : o.entity.centralized ? 'Sí' : 'No'}
                </Field>
                <Field label="Ubicación">
                  {o.entity.city ?? '—'}
                  {o.entity.department ? `, ${o.entity.department}` : ''}
                </Field>
              </dl>
            </Section>
          </div>

          {o.award ? (
            <Section title="Adjudicación">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <Field label="Proveedor">{o.award.supplierName ?? '—'}</Field>
                <Field label="NIT" mono>
                  {o.award.supplierNit ?? '—'}
                </Field>
                <Field label="Valor" mono>
                  {formatCOP(o.award.value)}
                </Field>
                <Field label="Fecha" mono>
                  {formatDate(o.award.date)}
                </Field>
              </dl>
            </Section>
          ) : null}

          <Section
            title="Participación"
            description="Contadores publicados por SECOP II (suelen actualizarse con retraso)."
          >
            <dl className="grid grid-cols-3 gap-x-6 gap-y-4 sm:grid-cols-6">
              <Field label="Invitados" mono>
                {formatInt(o.counters.invited)}
              </Field>
              <Field label="Invitación directa" mono>
                {formatInt(o.counters.directInvites)}
              </Field>
              <Field label="Vistas" mono>
                {formatInt(o.counters.views)}
              </Field>
              <Field label="Interesados" mono>
                {formatInt(o.counters.interested)}
              </Field>
              <Field label="Respuestas" mono>
                {formatInt(o.counters.responses)}
              </Field>
              <Field label="Oferentes únicos" mono>
                {formatInt(o.counters.uniqueBidders)}
              </Field>
            </dl>
          </Section>

          <div className="border-t border-border pt-5">
            <EntityHistory opportunity={o} />
          </div>
        </div>

        <aside className="space-y-4 pt-5 lg:pt-0">
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
                {item.rup.basis === 'rule' ? 'Regla legal' : 'Inferencia heurística'}. No es una
                garantía.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-[13px] leading-relaxed">
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
