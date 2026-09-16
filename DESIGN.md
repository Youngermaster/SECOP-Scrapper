# SECOP Radar design system: "Instrumento"

SECOP Radar is a dense, local-first intelligence tool for one person hunting public tenders.
It is read for minutes at a time, mostly in tables. The design therefore behaves like an
instrument panel, not a marketing page: quiet surfaces, one accent, numbers that line up,
hairlines instead of shadows, motion only where it explains a state change.

Design read: data-heavy product UI for a technical solo contractor in Colombia; trust-first
(public-sector data), precise, calm. Dials: variance 3 / motion 3 / density 7.

All tokens live in `apps/web/src/index.css` (`:root`, `.dark`, `@theme inline`) and are
consumed through Tailwind utilities (`bg-card`, `text-muted-fg`, `rounded-md`, ...). Shared
primitives live in `packages/ui`.

## 1. Typography

| Role                              | Font                                                          | Size / weight                                                           |
| --------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| UI text                           | Geist Variable (self-hosted via `@fontsource-variable/geist`) | 13.5px body, 13px in dense surfaces, 12px meta, 11px (`text-2xs`) micro |
| Numbers, ids, dates, money, codes | Geist Mono Variable (`@fontsource-variable/geist-mono`)       | same size as surrounding text, `tabular-nums` always                    |
| Page title (`PageHeader`)         | Geist 15px semibold, tracking-tight                           |                                                                         |
| Section title                     | Geist 13px semibold                                           |                                                                         |
| Detail headline                   | Geist 16-18px semibold, `text-balance`                        |                                                                         |
| Panel title (`CardTitle`)         | Geist 14px semibold                                           |                                                                         |

Rules

- Everything numeric that users compare (values, dates, counts, scores, NITs, process ids)
  is set in mono. Never mix mono and sans inside one numeral.
- No uppercase-tracking eyebrows above sections. The one uppercase micro-label is the
  brand line under the wordmark (`SECOP II / DATOS.GOV.CO`).
- Weight and colour carry hierarchy, not size. Titles rarely exceed 18px.
- Fallback stack is system-ui; the app works offline with it.

## 2. Colour

One neutral family (cool gray, OKLCH hue 255, chroma <= 0.02), one accent (cobalt), four
status colours reserved for meaning. No gradients, no glows, no purple.

### Light

| Token                 | Value                                           | Use                                                           |
| --------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `--bg`                | `oklch(97.6% 0.004 255)`                        | page                                                          |
| `--card`              | `oklch(99.4% 0.002 255)`                        | panels, table hover, inputs                                   |
| `--muted`             | `oklch(94.8% 0.006 255)`                        | secondary buttons, skeletons, neutral tags                    |
| `--sidebar`           | `oklch(96% 0.005 255)`                          | nav rail, filter rail (60% mix)                               |
| `--sidebar-active`    | `oklch(91.5% 0.01 255)`                         | active nav item                                               |
| `--fg`                | `oklch(19% 0.018 260)`                          | primary ink                                                   |
| `--fg-2`              | `oklch(38% 0.016 258)`                          | secondary ink (descriptions, body in detail)                  |
| `--muted-fg`          | `oklch(50% 0.014 258)`                          | labels, meta (>= 4.5:1 on `--bg`)                             |
| `--border`            | `oklch(89.5% 0.008 255)`                        | hairlines                                                     |
| `--border-strong`     | `oklch(80% 0.012 255)`                          | hover borders, slider track                                   |
| `--input`             | `oklch(85% 0.01 255)`                           | control borders                                               |
| `--primary`           | `oklch(52% 0.17 258)`                           | primary button, links, active markers, focus                  |
| `--primary-hover`     | `oklch(46% 0.17 258)`                           |                                                               |
| `--primary-soft`      | `oklch(94% 0.03 258)`                           | accent tint (badges, saved panel)                             |
| `--success` / `-soft` | `oklch(52% 0.14 155)` / `oklch(94.5% 0.04 155)` | open, no RUP, score >= 70                                     |
| `--warning` / `-soft` | `oklch(58% 0.14 70)` / `oklch(95% 0.05 80)`     | closing soon, requires RUP, score 45-69, my region on the map |
| `--danger` / `-soft`  | `oklch(53% 0.19 27)` / `oklch(95% 0.03 25)`     | too big, cancelled, destructive                               |
| `--info`              | alias of `--primary`                            | inference / draft tags                                        |

### Dark

Same roles, re-stepped for the dark surface (not an automatic inversion):
`--bg oklch(15.5% 0.01 258)`, `--card 18.5%`, `--muted 23.5%`, `--sidebar 13.5%`,
`--fg 94%`, `--fg-2 80%`, `--muted-fg 66%`, `--border 27%`, `--primary oklch(72% 0.13 258)`
with `--primary-fg` dark ink, status colours lifted to L 70-80% with 26-28% soft tints.

Rules

- Colour is never decorative. A tinted badge means a state; a coloured number means a
  threshold (score chip, days-left).
- Text always uses ink tokens (`fg`, `fg-2`, `muted-fg`), never a series or status colour,
  except the status word inside a tag.
- Charts use their own validated pair (`components/charts/theme.ts`): series-1 `#2a78d6`
  / `#3987e5`, series-2 `#eb6834` / `#d95926`, sequential blue ramp for ordered scales.
  Validate any change with the dataviz palette validator in both modes.
- Leaflet cannot read CSS variables: `MAP_COLORS` in `MapPage.tsx` mirrors the accent
  (`#2a78d6`), warning (`#d98a0b`) and a deeper cobalt for municipality dots.

## 3. Shape, spacing, elevation

- Radius scale is locked: `rounded-sm` 4px (tags, checkboxes, chips), `rounded-md` 6px
  (buttons, inputs, score chips, tooltips), `rounded-lg` 10px (panels, popovers, dialogs).
  `xl`/`2xl` alias to 10px so nothing can escape the scale. Pills only for switches.
- Spacing base 4px. Page gutter 20-24px. Panel padding 16px. Table cell 12px x 10px.
  Filter sections separated by hairlines with 16px rhythm.
- Elevation: surfaces are flat with 1px hairlines. The only shadow is `shadow-pop`
  (tinted, for popovers, tooltips, dialogs, the map legend).
- Panels (`Card`) are for the aside and for grouped chart blocks. Long-form content uses
  hairline-separated sections (`Section` in the detail page), not stacked cards.
- KPI numbers sit in a `StatStrip` (one hairline grid), never in six separate cards.

## 4. Motion

- Route change: 120ms opacity fade only. No slides.
- Hover: surface tint (`hover:bg-muted`), border darkens on inputs.
- Press: `active:translate-y-px` on every button.
- Popover / tooltip: fade in, 1px slide.
- Everything respects `prefers-reduced-motion` (global CSS block plus
  `useReducedMotion` in the layout and first-run screen).
- No infinite animations, no skeleton shimmer beyond `animate-pulse`.

## 5. Component conventions (`packages/ui`)

- `Button`: sizes `sm` 28px, `md` 32px, `lg` 40px, `icon` 32px, `icon-sm` 28px. Variants
  `primary` (accent), `secondary` (muted), `outline`, `ghost`, `danger`, `link`.
  One primary action per view.
- `Badge`: 20px tall tags with soft tint; tones `neutral | primary | success | warning |
danger | info | outline`. Icons inside badges are 12px.
- `Input`, `Select`, `MultiSelect`: 32px (28px in the filter rail), 6px radius, hover
  border, 2px ring on focus. Labels above; helper text below; no placeholder-as-label.
- `Checkbox`, `Switch`, `Slider`: accent fill when on; 4px radius checkbox.
- `Card`: hairline panel; `CardHeader` 16px padding; `CardTitle` 14px.
- `EmptyState`: left-aligned, hairline frame, icon in a muted tile, one action.
- `Skeleton`: shape matches the real layout (see `LoadingScreen`).

## 6. Data-density rules

- Table rows ~72px, two lines max per title, 13px title, 12px secondary line with entity and
  at most two flag tags. Header row 36px, 11px labels, sortable headers show an arrow only
  when active.
- Score chip: 36px mono tile, tone by threshold (>= 70 success, 45-69 warning, else
  neutral). Clicking opens the breakdown: seven rows, each a label, mono `points / max`,
  and a 4px meter with no background track.
- RUP tag always carries an icon and, when inferred, a trailing `*` with a tooltip that says
  it is an inference.
- Days-left is coloured only inside 3 days (warning) or 1 day (danger).
- Facet counts are mono, muted, right-aligned; zero-count rows fade to `muted-fg`.
- Null values render as a single em-dash inside data cells (table convention); prose never
  uses dashes as punctuation.

## 7. Navigation & layout

- Left rail 232px on `md+`, top bar with horizontal nav below `md`. Rail surface is a
  darker neutral, not a dark theme block. Active item: tinted background plus a 2px accent
  bar on the outer edge.
- Page header 56px: title left, actions right, description in 12px muted below the title.
- The opportunities view is a fixed-height workspace: toolbar, filter rail (272px, scrolls
  independently), virtualised table.
- Detail view: content column with hairline sections, 21rem aside with verification,
  score breakdown and RUP panels.
- First run: split screen, left explains the tool on the rail surface, right lists the
  three commands as numbered mono steps.
