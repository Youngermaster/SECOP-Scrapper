import { COMPETITIVE_MODALITIES, type ScoredOpportunity } from '@secop-radar/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@secop-radar/ui';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useSettings } from '@/stores/settings';
import { formatCOPCompact } from '@/lib/format';

type Level = 'ok' | 'warn' | 'bad';

interface Check {
  level: Level;
  title: string;
  detail: string;
}

const ICON: Record<Level, typeof CheckCircle2> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
};
const COLOR: Record<Level, string> = {
  ok: 'text-success',
  warn: 'text-warning',
  bad: 'text-danger',
};

/** Quick, explainable verification signals a solo contractor checks before investing time in a bid. */
export function VerificationChecklist({ item }: { item: ScoredOpportunity }) {
  const value = useSettings((s) => s.value);
  const o = item.opportunity;
  const checks: Check[] = [];

  checks.push(
    item.lifecycle === 'open'
      ? {
          level: item.daysLeft != null && item.daysLeft <= 1 ? 'warn' : 'ok',
          title: 'Proceso abierto',
          detail:
            item.daysLeft == null
              ? 'Sin fecha de cierre publicada; confirma el cronograma en SECOP.'
              : item.daysLeft <= 1
                ? 'Cierra hoy o mañana: poco tiempo para preparar una oferta.'
                : `Quedan ${item.daysLeft} días para presentar respuesta.`,
        }
      : item.lifecycle === 'draft'
        ? {
            level: 'warn',
            title: 'Aún en borrador',
            detail: 'Todavía no está publicado; el enlace y las fechas pueden cambiar.',
          }
        : {
            level: 'bad',
            title: 'Proceso no abierto',
            detail: 'Ya cerró, fue adjudicado, cancelado o suspendido.',
          },
  );

  checks.push(
    COMPETITIVE_MODALITIES.has(o.modality)
      ? {
          level: 'ok',
          title: 'Modalidad competitiva',
          detail: 'Cualquier proponente habilitado puede presentar oferta.',
        }
      : o.modality === 'solicitud-informacion'
        ? {
            level: 'warn',
            title: 'Solicitud de información (RFI)',
            detail: 'No es una convocatoria: sirve para posicionarte antes del proceso real.',
          }
        : o.modality === 'contratacion-directa'
          ? {
              level: 'warn',
              title: 'Contratación directa',
              detail:
                'La entidad elige al contratista; solo aplica si tienes contacto o invitación.',
            }
          : {
              level: 'warn',
              title: 'Régimen especial / otra modalidad',
              detail: 'Revisa el manual de contratación de la entidad para saber cómo participar.',
            },
  );

  checks.push(
    item.rup.requirement === 'not-required' || item.rup.requirement === 'not-applicable'
      ? { level: 'ok', title: 'No exige RUP', detail: item.rup.reason }
      : item.rup.requirement === 'likely-not-required'
        ? { level: 'warn', title: 'Probablemente sin RUP', detail: item.rup.reason }
        : item.rup.requirement === 'required'
          ? { level: 'bad', title: 'Requiere RUP vigente', detail: item.rup.reason }
          : { level: 'warn', title: 'RUP desconocido', detail: item.rup.reason },
  );

  checks.push(
    o.value == null
      ? {
          level: 'warn',
          title: 'Valor no informado',
          detail: 'El proceso no publica presupuesto; revisa los documentos.',
        }
      : o.value >= value.tooBig
        ? {
            level: 'bad',
            title: 'Valor demasiado alto',
            detail: `${formatCOPCompact(o.value)} supera el máximo realista configurado (${formatCOPCompact(value.tooBig)}).`,
          }
        : o.value > value.acceptableMax
          ? {
              level: 'warn',
              title: 'Valor alto',
              detail: `${formatCOPCompact(o.value)}: probablemente exige experiencia y capacidad financiera acreditadas.`,
            }
          : o.value < value.tooSmall
            ? {
                level: 'warn',
                title: 'Valor muy bajo',
                detail: `${formatCOPCompact(o.value)} puede no justificar el esfuerzo.`,
              }
            : {
                level: 'ok',
                title: 'Valor en rango realista',
                detail: `${formatCOPCompact(o.value)} está dentro de tu rango objetivo.`,
              },
  );

  checks.push(
    o.urlStatus === 'ok'
      ? {
          level: 'ok',
          title: 'Enlace oficial disponible',
          detail: 'Puedes verificar pliegos, anexos y cronograma directamente en SECOP II.',
        }
      : {
          level: 'warn',
          title: 'Sin enlace directo',
          detail:
            'El dataset publicó la página de login en vez del proceso. Busca la referencia en SECOP II.',
        },
  );

  checks.push(
    item.score.matchedKeywords.length > 0
      ? {
          level: item.score.negativeKeywords.length ? 'warn' : 'ok',
          title: 'Coincide con tu perfil',
          detail: `Palabras clave: ${item.score.matchedKeywords.slice(0, 5).join(', ')}${item.score.negativeKeywords.length ? `. Ojo: menciona ${item.score.negativeKeywords.slice(0, 3).join(', ')}.` : ''}`,
        }
      : {
          level: 'warn',
          title: 'Sin palabras clave de tu perfil',
          detail: 'El objeto no menciona software, tecnología ni robótica; revisa si aplica.',
        },
  );

  if (o.counters.responses > 0 || o.counters.interested > 0 || o.counters.invited > 0) {
    checks.push({
      level: 'ok',
      title: 'Señales de competencia',
      detail: `${o.counters.invited} invitados · ${o.counters.interested} interesados · ${o.counters.responses} respuestas · ${o.counters.uniqueBidders} oferentes únicos.`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificación rápida</CardTitle>
        <CardDescription>
          Señales derivadas de los datos abiertos. Siempre confirma en el pliego oficial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {checks.map((c) => {
            const Icon = ICON[c.level];
            return (
              <li key={c.title} className="flex gap-3">
                <Icon
                  className={cn('mt-0.5 size-4 shrink-0', COLOR[c.level])}
                  aria-label={c.level}
                />
                <div>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted-fg">{c.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
