# SECOP Radar

A **local-first opportunity finder for Colombian public procurement**. It pulls open tenders from
SECOP II (via the datos.gov.co Socrata API), cleans the notoriously messy data, scores each process
for how realistic it is for a **solo software / robotics contractor** to compete, and lets you
search, filter, verify, map and chart everything in a fast Spanish-language web app — no server,
no accounts, no paid keys.

```
pnpm install      # once
pnpm scraper      # pull SECOP II data into SQLite + static JSON (~30 s)
pnpm dev          # open the app at http://localhost:5173
```

The UI is in Colombian Spanish; code, comments and this README are in English.

---

## What you get

| Feature                                                                                                                                                                                                                                                                    | Where                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Full-text search (accent-insensitive, prefix + fuzzy) over process title/description/entity                                                                                                                                                                                | Oportunidades              |
| Filters: region (incl. **"Fuera de mi región"**), department, city, value range, modality, lifecycle, **RUP inference**, publication/closing dates, min score, UNSPSC segment, contract type, only-with-link, only-competitive, **profile match**                          | Oportunidades → panel      |
| One-click presets: **Para mí**, Tecnología, Sin RUP, Cierran esta semana, Nuevas (7 días), RFI, Mi región, Fuera de mi región, **Todo**                                                                                                                                    | Oportunidades → preset bar |
| **"¿Puedo competir?" score (0–100)** with a per-component breakdown, tunable weights, keyword lists and value thresholds                                                                                                                                                   | Everywhere · Ajustes       |
| Verification view: every key field, official SECOP II link, legal basis of the RUP inference, quick checklist, and the entity's history from the **contracts dataset** (N IT contracts, median value, PYME share, frequent winners, "this process already has a contract") | Detalle                    |
| Map: department choropleth + municipality bubbles (DIVIPOLA centroids), your region highlighted                                                                                                                                                                            | Mapa                       |
| Charts: weekly publications/closings, by department, modality, value bucket, UNSPSC segment, score distribution                                                                                                                                                            | Analítica                  |
| Shortlist with status (me interesa / apliqué / descartada) and notes, persisted locally, JSON export/import                                                                                                                                                                | Guardadas                  |
| CSV export of the current filtered list (Excel-friendly, UTF-8 BOM)                                                                                                                                                                                                        | Oportunidades → toolbar    |
| Market intelligence: who wins IT contracts, who buys, values, trend, drill-downs                                                                                                                                                                                           | Mercado                    |
| First-run screen when there is no local data; stale-data banner                                                                                                                                                                                                            | —                          |

---

## Architecture

```
apps/web/               Vite + React 19 SPA (TypeScript strict, Tailwind 4). Pure client side — no SSR.
packages/core/          Pure domain logic: types, normalizers, dedupe, lifecycle, RUP inference,
                        scoring, filters, presets, geo, market intel. No I/O. Vitest.
packages/secop-client/  Typed Socrata/SODA client: SoQL builder, retry/backoff, paging, dataset modules.
packages/scraper/       CLI: fetch → clean → SQLite (better-sqlite3) → export gzip JSON for the SPA.
packages/ui/            Shared Tailwind + Radix primitives (Button, Badge, Select, Dialog, …).
data/secop-radar.db     Local SQLite store (gitignored).
apps/web/public/data/   Exported artifacts the SPA reads (gitignored).
```

Turborepo + pnpm workspaces. Internal packages are consumed **as TypeScript source** (`exports` →
`./src/index.ts`), so there is no build step for libraries; Vite, `tsx` and Vitest all read TS directly.

### Data flow

```
datos.gov.co (SODA 2.1) ──secop-client──▶ scraper ──clean/dedupe──▶ SQLite ──export──▶ public/data/*.json.gz
                                                                                          │
                                                             browser fetch + gunzip + Zod ◀┘
                                                             enrich (lifecycle, RUP, score) → filter → UI
```

**Why static JSON instead of a local API server or SQLite-in-the-browser?** The brief forbids an SSR
framework and the dataset that matters (processes closing in the last ~45 days plus 24 months of IT
contracts) is ~15k + ~27k rows — 3 MB + 5 MB gzipped. Loading that once and filtering in memory is
instant (filtering 15k scored rows takes ~2 ms), needs zero extra processes, and `pnpm build` /
`pnpm preview` just work. SQLite stays the canonical, incremental store on disk; sql.js would add a
1.5 MB WASM runtime for no benefit at this size.

### Library choices

| Concern    | Choice                                                                                         | Why                                                                                                                                                                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Charts     | **Recharts**                                                                                   | Declarative React API, responsive containers, mature; bars + time series is its sweet spot. visx is lower-level and needs more code for the same result.                                                                                                                          |
| Map        | **react-leaflet + Leaflet + OSM raster tiles**                                                 | No API keys, ~40 KB, GeoJSON choropleth is first-class. MapLibre would need a hosted vector style and a 250 KB runtime for no gain at this scale. Department polygons are a vendored, simplified DANE GeoJSON (50 KB); municipality centroids come from DIVIPOLA on datos.gov.co. |
| Table      | **TanStack Table + TanStack Virtual**                                                          | Headless column model; virtualization keeps 15k rows smooth. Sorting is delegated to a tested pure function in `core` (nulls last).                                                                                                                                               |
| Search     | **MiniSearch**                                                                                 | Tiny in-memory index with prefix + fuzzy matching and a custom Spanish tokenizer (accents stripped, stopwords).                                                                                                                                                                   |
| State      | **Zustand** (filters, settings, shortlist — persisted) + **TanStack Query** (artifact loading) | Standard, minimal; persisted slices are validated with Zod on rehydrate.                                                                                                                                                                                                          |
| Validation | **Zod 4**                                                                                      | At both boundaries: raw Socrata rows (client) and JSON artifacts (web).                                                                                                                                                                                                           |
| UI         | **Tailwind 4 + Radix primitives + `motion`**                                                   | CSS-first tokens with light/dark, accessible primitives, subtle transitions that honour `prefers-reduced-motion`. The visual system ("Instrumento": one neutral family, one cobalt accent, Geist/Geist Mono, hairline density) is documented in [`DESIGN.md`](DESIGN.md).         |
| Local DB   | **better-sqlite3**                                                                             | Synchronous, transactional, ships prebuilt binaries (no native build).                                                                                                                                                                                                            |
| CLI        | **commander + consola + dotenv** run with `tsx`                                                | No build step for the scraper.                                                                                                                                                                                                                                                    |

---

## Socrata App Token (free, recommended)

The API works without a token but throttles per IP. A token raises the limit and is free:

1. Create an account at <https://www.datos.gov.co> (top-right _Iniciar sesión_ → _Regístrate_).
2. Open your profile → **Configuración del desarrollador / Developer Settings**.
3. **Create new App Token**; give it any name. Copy the _App Token_ (not the secret).
4. Put it in `.env` at the repo root:

```
SOCRATA_APP_TOKEN=your_token_here
```

`.env.example` documents every variable. The scraper logs a warning when it runs without a token.

---

## The scraper

```
pnpm scraper [options]
```

| Option                                              | Default                                        | Meaning                                                                                                                                                                                       |
| --------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--closing-window <days>`                           | 30                                             | Fetch processes whose closing date is ≥ today − N days (open ones plus recently closed). This is the default pass and is re-run every time, so status changes (cancelled, awarded) propagate. |
| `--since <date>`                                    | —                                              | Additionally fetch every process whose _last publication_ date is ≥ date (incremental catch-up).                                                                                              |
| `--published-from <date>` / `--published-to <date>` | —                                              | Fetch by publication range instead of the closing window (historical backfills).                                                                                                              |
| `-d, --department <name>`                           | all                                            | SECOP spelling, repeatable / comma-separated (`-d Antioquia -d "Valle del Cauca"`).                                                                                                           |
| `-k, --keyword <text>`                              | —                                              | Server-side substring filter on title or description, repeatable.                                                                                                                             |
| `-m, --modality <name>`                             | all                                            | Raw modality name, repeatable.                                                                                                                                                                |
| `-c, --category <prefix>`                           | all                                            | UNSPSC prefix such as `V1.43`, repeatable.                                                                                                                                                    |
| `--no-drafts`                                       | include                                        | Exclude Borrador / En aprobación / Aprobado rows.                                                                                                                                             |
| `--no-contracts`                                    | fetch                                          | Skip the contracts dataset.                                                                                                                                                                   |
| `--contracts-months <n>`                            | 24                                             | Months of contract history.                                                                                                                                                                   |
| `--contracts-category <prefix>`                     | `V1.43,V1.8111,V1.8116`                        | UNSPSC prefixes for contracts (IT + computer services).                                                                                                                                       |
| `--contracts-keyword <text>`                        | —                                              | Keyword filter for contracts.                                                                                                                                                                 |
| `--refresh-geo`                                     | cached 90 days                                 | Re-download DIVIPOLA tables.                                                                                                                                                                  |
| `--export-window <days>`                            | 45                                             | Export processes closing ≥ today − N days.                                                                                                                                                    |
| `--max-export <n>`                                  | 60 000                                         | Cap on exported processes.                                                                                                                                                                    |
| `--db <path>` / `--export-dir <path>`               | `data/secop-radar.db` / `apps/web/public/data` | Also via `SECOP_RADAR_DB`, `SECOP_RADAR_EXPORT_DIR`.                                                                                                                                          |
| `--dry-run`                                         | —                                              | Fetch and clean, write nothing.                                                                                                                                                               |
| `-v, --verbose`                                     | —                                              | Print the SoQL sent to the API.                                                                                                                                                               |

Examples:

```
pnpm scraper                                        # defaults: open + recent processes, 24 months of IT contracts
pnpm scraper --since 2026-09-01                     # plus everything updated since Sept 1
pnpm scraper -d Antioquia -k software -k "aplicación"
pnpm scraper --published-from 2026-06-01 --published-to 2026-06-30 --no-contracts
pnpm scraper --dry-run -v
```

### What a run does

1. **Geo** — DIVIPOLA municipalities (1,122, with centroids; note the comma decimals) and departments, cached in SQLite for 90 days.
2. **Procesos** — one pass per window, paged 10,000 rows at a time with a stable `$order=:id`.
   Each row is normalised (`packages/core/src/normalize/process.ts`), then **deduplicated**: the
   dataset publishes the same `id_del_proceso` several times (≈13 % of rows in a 7-day window) and
   the copies differ — one has the real process URL and phase, the other the login page. Duplicates
   are merged field-by-field (usable URL wins, counters take the max, the later publication wins
   status). Rows are then **reconciled with the stored copy** (the API is the truth for state; the
   store fills gaps such as a URL that a later snapshot lost) and upserted by content hash, so a
   second run reports `=N unchanged`.
3. **Contratos** — IT-category contracts signed in the window, same clean/upsert.
4. **Export** — `manifest.json`, `opportunities.json.gz`, `contracts.json.gz`, `geo.json`.

The summary box lists fetched / duplicates / dropped (with reasons) / repaired (e.g. `polluted-url`,
`invalid-date:<field>`) / without usable link, and inserted / updated / unchanged counts. Every pass is
recorded in the `sync_runs` table.

---

## Data source and its quirks (verified live on 2026-09-16)

| Dataset                             | ID          | Use                                 |
| ----------------------------------- | ----------- | ----------------------------------- |
| SECOP II – Procesos de Contratación | `p6dx-8zbt` | Opportunities (primary)             |
| SECOP II – Contratos Electrónicos   | `jbjy-vk9h` | Market intelligence, entity history |
| DIVIPOLA – Códigos municipios       | `gdxc-w37w` | Municipality centroids for the map  |
| DIVIPOLA – Códigos departamentos    | `vcjz-niiq` | Department centroids                |

Column names are taken from the live metadata (`/api/views/<id>.json`) and pinned in
`packages/secop-client/src/datasets/*.ts` with `satisfies ReadonlyArray<keyof RawProcesoRow>`, so a
renamed column is a type error, not a silent null. Things that bit us and are handled:

- The description column is literally `descripci_n_del_procedimiento`; the closing date is `fecha_de_recepcion_de`.
- `estado_de_apertura_del_proceso = "Abierto"` is true for 87 % of all 9.2 M rows — it means "public", not "receiving offers". Openness is **derived**: closing date ≥ today and `estado_del_procedimiento ∈ {Publicado, Abierto}` and not awarded.
- Placeholders instead of nulls: `No Definido`, `No definido`, `No Aplica`, `No Especificado`, `No Adjudicado`, and a bare `No` in `tipo_de_contrato`.
- `precio_base = 0` on ~10 % of open rows (mostly RFIs) → treated as unknown value.
- 18 spellings of the contracting modality (`Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes`, `Contratación Directa (con ofertas)`, …) → canonical enum.
- `fase` mixes languages (`Clarification submission`, `Estimate Phase`) and casing.
- `urlproceso` is an object `{url}`; a large share of rows carry `https://community.secop.gov.co/STS/Users/Login/Index` (the login page) instead of the process page. The real page (`…/OpportunityDetail/Index?noticeUID=CO1.NTC.n`) cannot be derived offline; dedupe/reconcile recovers most, the rest are flagged `url-missing` in the UI.
- The whole dataset is **re-published daily** (every row shares one `:updated_at`), so Socrata's system fields cannot drive incremental sync; `--since` keys off `fecha_de_ultima_publicaci` instead.
- Numbers arrive as strings; DIVIPOLA coordinates use comma decimals (`"6,246631"`).
- Supplier names carry contact junk (`ACME SAS (ventas@acme.co - 3155551234)`), stripped on load.

---

## Data model

`packages/core/src/types.ts` is the contract between scraper and app.

- **`Opportunity`** — one per `id_del_proceso`: `entity{name, nit, order, department, departmentCode (DANE), city}`, `title`, `description`, `phase`, `status` (canonical), `modality` (enum) + raw, `contractType`, UNSPSC `code/segment/family`, `value` (COP, null if unknown), `duration`, ISO dates (`publishedAt`, `lastPublishedAt`, `closesAt`, `responseOpensAt`), `awarded` + `award`, `url` + `urlStatus (ok|polluted|missing)`, `counters` (invited, views, responses, unique bidders…), `lots`, `searchText`.
- **`Contract`** — one per `id_contrato`, with `processPortfolioId` (joins to `Opportunity.portfolioId`), entity, supplier `{name, doc, isPyme}`, `value`, dates, modality, UNSPSC.
- **`GeoData`** — departments + municipalities with centroids.
- **`DatasetManifest`** — counts, windows, filters used, artifact file names.

Derived **at load time** in the browser (pure functions in `core`, today's date as input):
`lifecycle` (`draft | open | evaluating | awarded | cancelled | suspended | closed`), `daysLeft`,
`rup` (see below) and `score`.

SQLite tables: `processes`, `contracts` (indexed columns + full JSON + content hash + first/last seen),
`departments`, `municipalities`, `sync_state`, `sync_runs`, `meta`.

---

## RUP inference — read this caveat

The datasets have **no column** saying whether a process requires the _Registro Único de Proponentes_.
`packages/core/src/rup.ts` infers it from the modality and a few contract-type/category rules that
mirror the legal exception list (Ley 1150 de 2007 art. 6, Decreto 1082 de 2015 art. 2.2.1.1.1.5.1):

| Result                            | When                                                                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `not-required` (rule)             | Contratación directa, mínima cuantía, enajenación de bienes, concesión / APP                                                                                   |
| `not-required` (inference)        | UNSPSC segment 85 + health-services wording                                                                                                                    |
| `likely-not-required` (inference) | Régimen especial — the entity follows its own manual and _may_ still ask for it                                                                                |
| `required` (rule)                 | Licitación pública, selección abreviada (menor cuantía, subasta inversa), concurso de méritos, acuerdo marco (plus a note that you must already be in the AMP) |
| `not-applicable`                  | Solicitud de información (RFI)                                                                                                                                 |
| `unknown`                         | Anything else                                                                                                                                                  |

The UI always labels this as an **inference, not a guarantee** (badges carry a `*` when heuristic, the
detail view shows the reason and legal basis). Confirm in the pliego before investing time in a bid.

---

## The "¿Puedo competir?" score

`packages/core/src/scoring.ts`. Seven components, each a 0–1 sub-score with a weight; the score is the
weighted average × 100. Defaults: keywords 30, category 20, value 15, modality 10, RUP 10, timing 10,
region 5 — all tunable with sliders in _Ajustes_ (weight 0 disables a component).

- **Keywords** — strong (1.0) / medium (0.5) / weak (0.25) phrase lists matched with word boundaries over the accent-stripped text (so `api` ≠ `capital`); negative phrases halve the score, or zero it when nothing positive matched. Lists are editable.
- **Category** — affinity table for UNSPSC families/segments (4323 software, 8111 computer services = 1.0; 43xx = 0.5; 72xx construction = 0).
- **Value** — curve over your thresholds (too small / ideal / acceptable / too big); ≥ _too big_ also raises the `too-big` flag.
- **Modality** — mínima cuantía 1.0 … licitación 0.2, acuerdo marco 0.
- **RUP** — not required 1.0 … required 0.2.
- **Timing** — days left: 7–30 days is ideal; closing today ≈ 0.1; closed = 0.
- **Region** — your preference (prefer mine / neutral / prefer others).

The expensive part (keyword regexes, RUP, lifecycle) is computed once per profile; weight changes only
re-run the cheap aggregation (~8 ms for 15k rows), so sliders re-rank live.

---

## Development

```
pnpm dev          # web app (Vite, port 5173)
pnpm build        # production build → apps/web/dist
pnpm preview      # serve the build (port 4173)
pnpm scraper …    # data
pnpm verify       # typecheck + lint + tests + build + prettier check — must be green
pnpm test | lint | typecheck | format
```

Tests (Vitest) live next to the code: SoQL builder and client (mocked fetch, retry, paging), every
normaliser, dedupe/merge, lifecycle, RUP, scoring, filters, presets, intel, buckets, the scraper's
cleaning pipeline and SQLite upserts, and the exporter.

### Adding a filter

1. Add the field to `filterStateSchema` in `packages/core/src/filters.ts` (with a default) and the predicate in `matchesFilters`; bump `countActiveFilters` if it counts as "active". Add a test in `packages/core/src/__tests__/filters-intel.test.ts`.
2. Add the control to `apps/web/src/features/opportunities/FilterPanel.tsx` (the store's `set`/`toggleIn` already handle any key) and, if useful, a chip in `OpportunitiesPage.tsx` and a facet in `useFilteredOpportunities.ts`.
3. Optionally expose it as a preset in `packages/core/src/presets.ts`.

Persisted filter state is validated with the schema on rehydrate, so old localStorage never crashes the app.

### Adding a dataset

1. Fetch its live columns: `curl https://www.datos.gov.co/api/views/<id>.json | jq '.columns[] | {fieldName, dataTypeName}'`.
2. Add a raw row interface in `packages/core/src/types.ts` and a normaliser in `packages/core/src/normalize/`.
3. Add a dataset module in `packages/secop-client/src/datasets/` (id, field list `satisfies` the raw type, `rowSchema`, a `…Query()` helper and a predicate builder). Export it from `index.ts`.
4. Add a sync module in `packages/scraper/src/sync/`, a table in `db/schema.ts` + store methods, call it from `run.ts`, and export what the app needs in `export/exporter.ts` (+ `DatasetManifest.files`).
5. Load it in `apps/web/src/data/artifacts.ts` (Zod schema in `schemas.ts`) and a query hook in `queries.ts`.

`SECOP I – Procesos` and `Proveedores` follow exactly this path; they were left out of v1 because new
processes are published in SECOP II.

---

## Troubleshooting

- **First-run screen keeps showing** — `apps/web/public/data/manifest.json` is missing; run `pnpm scraper` and press _Ya ejecuté el scraper_.
- **`HTTP 429`** — you are being throttled; set `SOCRATA_APP_TOKEN` (the client already retries with back-off honouring `Retry-After`).
- **`Type mismatch for op$>=`** from the API — a date filter received a non-date; use `YYYY-MM-DD`.
- **Group-by queries on the contracts dataset time out** — always filter by `fecha_de_firma` and a category prefix (the scraper does).
- **A process has no link** — the dataset published the login page; use the reference shown in the detail view in SECOP II's public search.
- **Windows** — `better-sqlite3` ships prebuilt binaries for win32 x64/arm64; the `.gz` artifacts are read with the browser's `DecompressionStream` (Chrome 80+, Firefox 113+, Safari 16.4+).

## License

MIT — see `LICENSE`. Data © Colombia Compra Eficiente / datos.gov.co under their open-data terms;
map polygons derived from DANE MGN 2018; tiles © OpenStreetMap contributors.
