import {
  LIFECYCLE_LABELS,
  MODALITY_LABELS,
  RUP_LABELS,
  type ScoredOpportunity,
} from '@secop-radar/core';

const COLUMNS: Array<{ header: string; value: (it: ScoredOpportunity) => string | number | null }> =
  [
    { header: 'puntaje', value: (it) => it.score.score },
    { header: 'id', value: (it) => it.opportunity.id },
    { header: 'referencia', value: (it) => it.opportunity.reference },
    { header: 'titulo', value: (it) => it.opportunity.title },
    { header: 'entidad', value: (it) => it.opportunity.entity.name },
    { header: 'nit_entidad', value: (it) => it.opportunity.entity.nit },
    { header: 'departamento', value: (it) => it.opportunity.entity.department },
    { header: 'ciudad', value: (it) => it.opportunity.entity.city },
    { header: 'modalidad', value: (it) => MODALITY_LABELS[it.opportunity.modality] },
    { header: 'estado', value: (it) => LIFECYCLE_LABELS[it.lifecycle] },
    { header: 'rup', value: (it) => RUP_LABELS[it.rup.requirement] },
    { header: 'valor_cop', value: (it) => it.opportunity.value },
    { header: 'publicado', value: (it) => it.opportunity.publishedAt },
    { header: 'cierra', value: (it) => it.opportunity.closesAt },
    { header: 'dias_restantes', value: (it) => it.daysLeft },
    { header: 'categoria_unspsc', value: (it) => it.opportunity.unspscCode },
    { header: 'tipo_contrato', value: (it) => it.opportunity.contractType },
    { header: 'palabras_clave', value: (it) => it.score.matchedKeywords.join('; ') },
    { header: 'url', value: (it) => it.opportunity.url },
  ];

/** RFC 4180-style escaping: quote when needed, double embedded quotes, keep newlines inside quotes. */
export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a UTF-8 CSV (with BOM so Excel opens accents correctly) for the given rows. */
export function opportunitiesToCsv(items: readonly ScoredOpportunity[]): string {
  const lines = [COLUMNS.map((c) => c.header).join(',')];
  for (const it of items) lines.push(COLUMNS.map((c) => csvCell(c.value(it))).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function downloadText(
  filename: string,
  text: string,
  type = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
