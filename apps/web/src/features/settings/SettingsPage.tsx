import {
  DEPARTMENTS,
  SCORE_COMPONENT_LABELS,
  type KeywordProfile,
  type RegionPreference,
  type ScoringWeights,
} from '@secop-radar/core';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
  Textarea,
} from '@secop-radar/ui';
import { RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { ScoreChip } from '@/components/ScoreBadge';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useDataset } from '@/data/DatasetProvider';
import { formatCOPCompact } from '@/lib/format';
import { useSettings } from '@/stores/settings';

const WEIGHT_KEYS = Object.keys(SCORE_COMPONENT_LABELS) as Array<keyof ScoringWeights>;

const WEIGHT_HELP: Record<keyof ScoringWeights, string> = {
  keywords: 'Coincidencias del objeto con tus palabras clave.',
  category: 'Afinidad de la categoría UNSPSC con software/robótica.',
  value: 'Qué tan realista es el monto para un contratista independiente.',
  modality: 'Mínima cuantía y directa puntúan alto; licitación y acuerdo marco bajo.',
  rup: 'Premia procesos que no exigen RUP.',
  timing: 'Días disponibles para preparar la oferta.',
  region: 'Según tu preferencia de región.',
};

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
}

function KeywordEditor({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [text, setText] = useState(value.join('\n'));
  return (
    <div className="space-y-1">
      <Label htmlFor={`kw-${label}`}>{label}</Label>
      <p className="text-xs text-muted-fg">{help}</p>
      <Textarea
        id={`kw-${label}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onChange(linesToList(text))}
        className="min-h-32 font-mono text-xs"
        spellCheck={false}
      />
      <p className="text-2xs text-muted-fg">
        {linesToList(text).length} frases · una por línea, sin tildes obligatorias · se aplica al
        salir del campo
      </p>
    </div>
  );
}

function MoneyInput({
  id,
  label,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(String(value / 1_000_000));
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const n = Number(text.replace(',', '.'));
            if (Number.isFinite(n) && n > 0) onCommit(Math.round(n * 1_000_000));
            else setText(String(value / 1_000_000));
          }}
          className="w-32 font-mono"
        />
        <span className="text-xs text-muted-fg">millones COP</span>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const s = useSettings();
  const { geo, scored } = useDataset();
  const cities = useMemo(
    () =>
      geo.municipalities
        .filter((m) => m.departmentCode === s.region.departmentCode)
        .map((m) => m.name)
        .sort((a, b) => a.localeCompare(b, 'es')),
    [geo, s.region.departmentCode],
  );
  const preview = useMemo(
    () =>
      [...scored]
        .filter((x) => x.lifecycle === 'open')
        .sort((a, b) => b.score.score - a.score.score)
        .slice(0, 5),
    [scored],
  );
  const totalWeight = WEIGHT_KEYS.reduce((a, k) => a + s.weights[k], 0);

  return (
    <div>
      <PageHeader
        title="Ajustes"
        description="Tu perfil como contratista: región, pesos del puntaje, palabras clave y rangos de valor. Todo se recalcula al instante."
      />
      <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mi región</CardTitle>
              <CardDescription>
                Define qué cuenta como “mi región” para el filtro “Fuera de mi región” y el
                componente regional del puntaje.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="region-dept">Departamento</Label>
                <Select
                  value={s.region.departmentCode}
                  onValueChange={(v) => s.setRegion({ departmentCode: v, city: null })}
                >
                  <SelectTrigger id="region-dept">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d.code} value={d.code}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="region-city">Ciudad</Label>
                <Input
                  id="region-city"
                  list="region-city-options"
                  value={s.region.city ?? ''}
                  onChange={(e) => s.setRegion({ city: e.target.value || null })}
                  placeholder="Medellín"
                />
                <datalist id="region-city-options">
                  {cities.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <label className="flex items-center justify-between gap-2 text-[13px] sm:col-span-2">
                <span>
                  Solo la ciudad cuenta como mi región
                  <span className="block text-xs text-muted-fg">
                    Apagado: todo el departamento es “mi región”.
                  </span>
                </span>
                <Switch
                  checked={s.region.cityOnly}
                  onCheckedChange={(v) => s.setRegion({ cityOnly: v })}
                  aria-label="Solo la ciudad cuenta como mi región"
                />
              </label>
              <div className="sm:col-span-2">
                <Label>Preferencia de región en el puntaje</Label>
                <div className="mt-1 max-w-md">
                  <SegmentedControl<RegionPreference>
                    label="Preferencia de región"
                    value={s.regionPreference}
                    onChange={s.setRegionPreference}
                    options={[
                      { value: 'prefer-mine', label: 'Prefiero mi región' },
                      { value: 'neutral', label: 'Me da igual' },
                      { value: 'prefer-others', label: 'Prefiero otras' },
                    ]}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Pesos del puntaje “¿Puedo competir?”</CardTitle>
                <CardDescription>
                  Suma actual: {totalWeight}. Los pesos son relativos; un peso 0 apaga el
                  componente.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={s.resetScoring}>
                <RotateCcw /> Valores por defecto
              </Button>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              {WEIGHT_KEYS.map((k) => (
                <div key={k} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <Label htmlFor={`w-${k}`} className="text-[13px] text-fg">
                      {SCORE_COMPONENT_LABELS[k]}
                    </Label>
                    <span className="font-mono text-xs text-muted-fg tabular-nums">
                      {s.weights[k]}
                    </span>
                  </div>
                  <Slider
                    id={`w-${k}`}
                    min={0}
                    max={50}
                    step={1}
                    value={[s.weights[k]]}
                    onValueChange={([v]) => s.setWeight(k, v ?? 0)}
                    aria-label={SCORE_COMPONENT_LABELS[k]}
                  />
                  <p className="text-xs text-muted-fg">{WEIGHT_HELP[k]}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rangos de valor</CardTitle>
              <CardDescription>
                Cómo se evalúa el monto estimado. Por encima del máximo realista el proceso se marca
                como “demasiado grande”.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MoneyInput
                id="v-tooSmall"
                label="Muy pequeño por debajo de"
                value={s.value.tooSmall}
                onCommit={(v) => s.setValueProfile({ tooSmall: v })}
              />
              <MoneyInput
                id="v-idealMin"
                label="Ideal desde"
                value={s.value.idealMin}
                onCommit={(v) => s.setValueProfile({ idealMin: v })}
              />
              <MoneyInput
                id="v-idealMax"
                label="Ideal hasta"
                value={s.value.idealMax}
                onCommit={(v) => s.setValueProfile({ idealMax: v })}
              />
              <MoneyInput
                id="v-acceptableMax"
                label="Aceptable hasta"
                value={s.value.acceptableMax}
                onCommit={(v) => s.setValueProfile({ acceptableMax: v })}
              />
              <MoneyInput
                id="v-tooBig"
                label="Demasiado grande desde"
                value={s.value.tooBig}
                onCommit={(v) => s.setValueProfile({ tooBig: v })}
              />
              <div className="space-y-1">
                <Label htmlFor="closing-soon">“Cierra pronto” si faltan ≤</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="closing-soon"
                    type="number"
                    min={0}
                    max={30}
                    value={s.closingSoonDays}
                    onChange={(e) => s.setClosingSoonDays(Math.max(0, Number(e.target.value) || 0))}
                    className="w-24 font-mono"
                  />
                  <span className="text-xs text-muted-fg">días</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Palabras clave</CardTitle>
              <CardDescription>
                Se buscan en el título y la descripción (sin tildes, sin mayúsculas). Fuertes = 1,0
                · medias = 0,5 · débiles = 0,25 · negativas reducen a la mitad (o a cero si no hay
                positivas).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <KeywordEditor
                label="Fuertes"
                help="Describen exactamente tu trabajo."
                value={s.keywords.strong}
                onChange={(v) =>
                  s.setKeywords({ ...s.keywords, strong: v } satisfies KeywordProfile)
                }
              />
              <KeywordEditor
                label="Medias"
                help="Relacionadas con tecnología."
                value={s.keywords.medium}
                onChange={(v) => s.setKeywords({ ...s.keywords, medium: v })}
              />
              <KeywordEditor
                label="Débiles"
                help="Señales genéricas."
                value={s.keywords.weak}
                onChange={(v) => s.setKeywords({ ...s.keywords, weak: v })}
              />
              <KeywordEditor
                label="Negativas"
                help="Indican trabajos fuera de tu perfil."
                value={s.keywords.negative}
                onChange={(v) => s.setKeywords({ ...s.keywords, negative: v })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Apariencia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="inline-flex">
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vista previa</CardTitle>
              <CardDescription>
                Las 5 oportunidades abiertas mejor puntuadas con tu configuración actual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {preview.map((it) => (
                  <li key={it.opportunity.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                    <ScoreChip score={it.score.score} />
                    <div className="min-w-0">
                      <Link
                        to={`/oportunidad/${encodeURIComponent(it.opportunity.id)}`}
                        className="line-clamp-2 text-[13px] leading-snug font-medium hover:underline"
                      >
                        {it.opportunity.title}
                      </Link>
                      <p className="text-xs text-muted-fg">
                        {it.opportunity.entity.department ?? '—'} ·{' '}
                        {formatCOPCompact(it.opportunity.value)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
