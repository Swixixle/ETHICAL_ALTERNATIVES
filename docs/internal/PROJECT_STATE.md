# EthicalAlt (ETHICAL_ALTERNATIVES) — project state

**Living document:** describes what exists in the repo **as of 2026-04-10**, not a roadmap.  
**Remote:** `https://github.com/Swixixle/ETHICAL_ALTERNATIVES.git` (public).  
**Handoff:** paste this at the start of a session instead of re-deriving context.

---

## 1. Repository structure

Monorepo (npm workspaces: `client`, `server`). High-level tree:

| Path | Role |
|------|------|
| `package.json` | Root: `npm run dev` runs server + client via `concurrently`; `npm run build` builds client; `npm start` starts server. |
| `render.yaml` | Render Blueprint: `ethicalalt-server` (Node, `server/`) + `ethicalalt-client` (static Vite build). |
| `.env.example` | Server/client env template (copy to `server/.env`; Vite uses `client/` for `VITE_*`). |
| `README.md` | Public product + dev overview. |
| `RESEARCH_ALGORITHM.md` | Research / allegation-response standard (linked from README). |
| `docs/` | Extra docs (e.g. `HOW_INVESTIGATIONS_WORK.md`); **`docs/internal/`** internal handoff. |
| `.github/` | Issue templates. |
| `client/` | React 19 + Vite SPA; `src/App.jsx` is the main shell; `src/components/`, `src/pages/`, `src/hooks/`, `src/services/`, `src/lib/`, `src/utils/`. |
| `server/` | Express app `index.js`; `routes/`, `services/`, `middleware/`, `data/` (JSON catalogs), `constants/`, `utils/`, `db/` (schema, imports, profile JSON batches), `scripts/` (operational scripts). |
| `db/` | **Legacy / parallel** tree: profile JSON (`profiles_v*`, `boards/`), `import_all_profiles.mjs`, `corroborate_profiles.mjs`, backfills, seeds — not all paths wired to current `server/db` imports; treat as archive + alternate entrypoints. |

**Large asset dirs (not every file listed):**

- `server/db/profiles_v1` … `profiles_v13`, `profiles_batch02` … `profiles_batch08` — source JSON for imports.
- `client/public`, `docs/readme/screenshots` — static assets / README images.

---

## 2. Stack

### Root

| Dependency | Version | Use | Critical |
|------------|---------|-----|----------|
| `concurrently` | ^9.1.2 | Run server + client in dev | Dev-only |

**Engines:** Node `>=20`.

### Client (`client/package.json`)

| Dependency | Version | Use | Critical |
|------------|---------|-----|----------|
| `react` / `react-dom` | ^19.0.0 | UI | Yes |
| `recharts` | ^3.8.1 | Charts in investigation UI | For chart views |
| `vite` | ^6.0.3 | Build / dev server | Dev + build |
| `@vitejs/plugin-react` | ^4.3.4 | React in Vite | Dev + build |

### Server (`server/package.json`)

| Dependency | Version | Use | Critical |
|------------|---------|-----|----------|
| `express` | ^4.21.2 | HTTP API | Yes |
| `cors` | ^2.8.5 | CORS | Yes (browser client) |
| `dotenv` | ^16.4.7 | Env loading | Yes |
| `pg` | ^8.13.1 | PostgreSQL | No* |
| `@anthropic-ai/sdk` | ^0.52.0 | Claude (vision + investigation + many routes) | Yes for full product |
| `@google/generative-ai` | ^0.21.0 | Gemini (vision corroboration, text fallback) | Optional |
| `sharp` | ^0.34.5 | Image processing (vision path) | Optional but used in vision pipeline |

\*Without `DATABASE_URL`, pool is disabled; Black Book / previews degrade; many flows still run with live AI + caches.

**Implicit / documented in `.env.example` but not always in `server/package.json`:** API usage via `fetch` to Perplexity, Etsy, external geocoding/news — keys optional per feature.

---

## 3. Data layer

### 3.1 Database schema (`server/db/schema.sql`)

**`incumbent_profiles`** — primary dossier store.

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `brand_name` | TEXT NOT NULL | |
| `brand_slug` | TEXT UNIQUE NOT NULL | canonical slug |
| `parent_company`, `ultimate_parent` | TEXT | |
| `known_subsidiaries` | TEXT[] | |
| `effective_tax_rate`, `statutory_rate` | DECIMAL(5,2) | |
| `offshore_entities` | TEXT[] | |
| `government_subsidies_usd` | BIGINT | |
| `criminal_cases`, `civil_settlements`, `regulatory_actions` | JSONB | legacy structured fields |
| `lobbying_annual_usd`, `lobbying_year` | INTEGER | |
| `pac_donations_usd`, `pac_year` | INTEGER | |
| `osha_violations_5yr` | INTEGER | |
| `wage_theft_settlements_usd` | BIGINT | |
| `living_wage_certified`, `union_suppression_documented` | BOOLEAN | |
| `epa_enforcement_actions_5yr` | INTEGER | |
| `investigation_summary` | TEXT | |
| `verdict_tags` | TEXT[] | GIN index |
| `overall_concern_level` | TEXT | |
| `last_researched` | DATE | |
| `research_confidence` | TEXT | |
| `primary_sources` | TEXT[] | |
| **`profile_json`** | JSONB | **Authoritative blob when present** (overrides sparse columns) |
| `updated_at` | TIMESTAMPTZ | |
| `profile_type` | TEXT | added via migration |

Indexes: `brand_slug`, GIN on `verdict_tags`.

**`tap_history`** — session-linked investigation saves (`session_id`, `investigation_json`, `identification_json`, geo, etc.).

**`seller_registry`** — community seller listings (location, categories, verification flags).

**`farmers_markets`** — USDA-style market directory (import script).

**`community_board`** — daily labor board posts (`offer` / `need`).

**`chain_classifications`** — cached chain vs independent classification for OSM names.

**`civic_witnesses`** — witness registry rows (civic feature).

**`local_workers`**, **`worker_messages`** — Hire Direct worker marketplace.

**`impact_daily_aggregates`**, **`impact_brand_monthly`**, **`civic_actions_daily`**, **`impact_outcomes_raw`**, **`impact_outcomes_monthly`**, **`impact_shares`** — analytics / outcomes / share audit (no PII in share log).

**`profile_activity_cache`** — on-demand perimeter layer (`activity_json`, TTL `expires_at`, FK `brand_slug` → `incumbent_profiles`).

**Optional migration:** `server/db/migrations/optional_incumbent_sector.sql` — `sector` on `incumbent_profiles` if applied.

**Other:** `server/db/migrations/20260406_profile_activity_cache.sql` aligns with `profile_activity_cache`.

### 3.2 `profile_json` shape (actual)

There is **no single JSON Schema** checked in. Production shape is the **investigation / import union**:

**Common top-level keys** (from imports + live investigation normalization), exemplified by `server/db/profiles_batch02/walmart.json`:

- Identity: `brand_name`, `brand_slug`, `parent_company`, `ultimate_parent`, `subsidiaries`, `profile_type`
- Headline / summary: `generated_headline`, `executive_summary`, `overall_concern_level`, `verdict_tags`, `concern_flags`
- **Axis objects** (each often has `summary`, `flags`, `sources`): `labor`, `environmental`, `political`, `legal`, `tax`, `executives`, `connections`, `health_record` (product health)
- `allegations` — structured allegations + disclaimer + `organization_response` patterns per `RESEARCH_ALGORITHM.md`
- `alternatives` — `cheaper` / `healthier` / `diy` string arrays
- `timeline` — `{ year, event, severity, source_url }[]`
- `community_impact` — `displacement`, `price_illusion`, `tax_math`, `wealth_velocity`, etc.
- `cost_absorption` — `who_benefited`, `who_paid`, `the_gap` arrays

**Merged at runtime / by tools:**

- `_corroborated_at`, `_corroboration_*` — corroboration script annotations
- `deep_research` — object written by `server/scripts/deep_research_profile.mjs` when run: `corporate_tree`, `incidents`, `gaps`, `related_clusters`, `institutional_enablement`, `executive_governance`, `summaries`, `costs`, `generated_at`, model metadata
- Perimeter / Layer C fields may be merged via `corroboration.js` / investigation pipeline

**Incident shape (deep research)** — see §6.4.

### 3.3 Profile count and sector breakdown

**Not stored in repo** — run against production DB, e.g.:

```sql
SELECT COUNT(*) FROM incumbent_profiles;
SELECT profile_type, COUNT(*) FROM incumbent_profiles GROUP BY 1 ORDER BY 2 DESC;
-- If sector migration applied:
SELECT sector, COUNT(*) FROM incumbent_profiles GROUP BY 1 ORDER BY 2 DESC;
```

README currently claims **171** Black Book profiles; verify with `COUNT(*)`.

### 3.4 Scripts that read/write the database

| Script / module | Action |
|-----------------|--------|
| `server/db/import_profiles_v*.mjs` | Upsert JSON files into `incumbent_profiles` |
| `server/db/import_all_profiles.mjs` | Batch import orchestration |
| `server/db/import_profiles_from_dir.mjs` | Import from directory |
| `server/db/import_farmers_markets.mjs` | Fill `farmers_markets` |
| `server/db/setup_profiles.mjs`, `setup_profiles_v11.mjs` | Larger setup / batch utilities |
| `server/db/handAuthoredProfileImport.mjs` | Hand-authored profile ingest |
| `server/db/corroborate_profiles.mjs` | Live Claude + Perplexity vs `profile_json`; optional merge of discrepancy metadata |
| `server/scripts/deep_research_profile.mjs` | Perplexity + Claude deep pass; **merge** into `profile_json.deep_research` + relational `overall_concern_level`, `last_researched` |
| `server/services/*.js` (investigation, library, tap, etc.) | Read profiles via `pool` |
| `db/import_all_profiles.mjs`, `db/corroborate_profiles.mjs` | Alternate cwd entrypoints — confirm paths before running |

---

## 4. Server (Express)

### 4.1 API surface (by router)

Base URL in dev: `http://localhost:3001` (or `PORT`). Client uses `VITE_API_URL` in production.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness + in-memory cache sizes |
| GET | `/api/health/providers` | AI provider health snapshot |
| GET | `/proportionality` | Proportionality packet by `category` + query params |
| POST | `/api/tap` | Image + tap → vision identify (+ rate limit) |
| POST | `/api/tap/sourcing` | Alternatives sourcing pass |
| POST | `/api/tap/investigation` | Full investigation for identification (+ rate limit) |
| GET | `/api/history` | List tap history |
| GET | `/api/history/:id` | One history row |
| POST | `/api/investigate` | Typed / brand investigation without new photo |
| POST | `/api/barcode` | Barcode → brand / product lookup |
| POST | `/api/report-error` | User factual error reports |
| POST | `/api/executive-pay` | Executive pay lookup (Perplexity-backed route) |
| GET | `/api/impact/public` | Public impact stats |
| POST | `/api/impact/outcome` | Outcome telemetry |
| GET | `/api/profiles/index` | Profile index for search |
| GET | `/api/library` | Black Book list |
| GET | `/api/library/:slug` | Black Book detail |
| GET | `/api/perimeter/:slug` | Live perimeter / activity cache layer |
| POST | `/api/city-narrative` | City narrative generation |
| POST | `/api/sellers` | Seller registry query |
| GET | `/api/sellers/categories` | Seller categories |
| POST | `/api/city-identity` | City identity / classification |
| GET | `/api/local-feed` | Local feed (OSM + classifiers) |
| POST | `/api/share-card` | Share card payload / risk tier (see open issues) |
| POST | `/api/share-export` | Share export logging / gated content |
| GET | `/api/geocode` | Geocode helper |
| GET/POST | `/api/board` | Community board |
| GET | `/api/territory` | Territory / civic card data |
| GET | `/api/events` | Local events |
| POST | `/api/local-commercial` | Local commercial classification |
| POST | `/api/witness` | Witness registry |
| GET | `/api/witness/brand/:slug`, `/api/witness/summary` | Witness reads |
| POST | `/api/documentary` | Documentary narration stream |
| GET | `/api/workers/nearby`, `/category-map`, `/registry`, `/profile/:slug` | Hire Direct reads |
| POST | `/api/workers/register`, `/:id/message` | Hire Direct writes (rate limited) |

**Note:** `server/routes/localNews.js` exists but is **not** mounted in `server/index.js` as of this snapshot.

### 4.2 Live investigation flow (summary)

1. **Tap / barcode** — Client posts image (or barcode-only path) to `/api/tap` or `/api/barcode`.
2. **Vision** — `vision.js`: Claude Vision primary; Gemini corroboration in `visionCorroboration.js`; optional crop sharpen (`sharp` / `imageUtils`).
3. **Slug resolution** — `investigation.js` `resolveIncumbentSlug` + `brand_aliases.json` + DB check.
4. **Investigation** — `getInvestigationProfile`: cache check (`investigationCache`); DB row → `relationalRowToParsed` or live Claude multi-turn with web search; fallbacks Perplexity/Gemini via `aiProvider.js`; Layer C corroboration `corroboration.js`; proportionality attach; share risk tier; optional perimeter kick (`perimeterCache.js`).
5. **Response** — Normalized investigation JSON + identification + alternatives + `db_preview` when incumbent known.

### 4.3 Cache layer (`server/services/cacheStore.js`)

| Cache | TTL | Max entries |
|-------|-----|-------------|
| `investigationCache` | 6 h | 300 |
| `barcodeCache` | 24 h | 500 |
| `cityNarrativeCache` | 24 h | 200 |

LRU-ish eviction when at cap. `/health` exposes sizes.

### 4.4 Rate limiting

| Middleware | Rule | Where |
|------------|------|--------|
| `tapRateLimit.js` | **5** investigations per IP per **24 h** (`preview_only` skips); headers `X-EthicalAlt-Taps-Remaining` | `POST /api/tap`, `POST /api/tap/investigation` |
| `workerRateLimit.js` | **2** worker registrations / IP / UTC day; message limits per worker+session | `POST /api/workers/register`, `POST /api/workers/:id/message` |

Salt env: `TAP_RATE_SALT`, `WORKER_RATE_SALT` (optional).

### 4.5 Authentication

**No user accounts.** Public API with IP-based rate limits and optional CORS lock (`CORS_ORIGIN`). Admin operations are **CLI scripts**, not HTTP.

---

## 5. Client (React / Vite)

### 5.1 Routing / navigation

**Not React Router** — `App.jsx` uses `mode` state + `window.history` for clean URLs:

| URL-ish | `mode` | Screen |
|---------|--------|--------|
| `/` | `home` | `HomeScreen` |
| `/library` | `library` | `Library` (Black Book) |
| `/directory` | `directory` | `DirectoryPage` |
| `/impact` | `impact` | `ImpactPublicPage` |
| (default capture) | `snap` / `deep` | Camera, tap, investigation, narrative |

`HistoryScreen` for past taps; `researchNarrativeOn` drives `ResearchNarrative` overlay.

### 5.2 State management

- **Local React state** in `App.jsx` (image, result, mode, modals, etc.).
- **`useTapAnalysis`** — tap pipeline, calls `/api/tap`, `/api/tap/sourcing`, `/api/tap/investigation`, `/api/investigate`; session id in `sessionStorage` (`ea_session_id`).
- **Location** — `services/location.js` + geolocation hooks.
- **Impact consent** — `lib/impactConsent.js` gates some fetch headers / outcomes.

No Redux / Zustand.

### 5.3 Components (49 JSX files under `client/src/components/`)

Abbreviated by function:

| Component | Role |
|-----------|------|
| `PhotoCapture` | Camera + barcode detection |
| `TapOverlay`, `RegionSelectOverlay`, `ConfirmTap` | Tap / crop / confirm |
| `ResearchNarrative` | Long-form narrative during research (scroll behavior recently adjusted) |
| `InvestigationCard`, `ResultCard`, `DossierCard` | Record presentation |
| `AlternativesSidebar`, `QuickAlternatives`, `SecondhandLinks` | Alternatives UI |
| `ShareCard`, `Civic/ShareSheet` | Share flows |
| `HomeScreen`, `HistoryScreen` | Shell / history |
| `Library` (page) uses `DossierCard` | Black Book |
| `HealthCallout`, `SeverityMeter`, `ProofBlock`, `Timeline`, `CostAbsorption`, `CommunityImpact`, `CompanyCharts`, `WealthChart` | Record sections |
| `LocalDocumentary`, `LocalNewsTicker`, `EventsFeed`, `ActiveNowSection` | Local context |
| `WorkerRegistrationModal`, `WorkerProfilePage`, `HireDirect*` | Hire Direct / worker UI |
| `WitnessRegistry` | Civic witness |
| `ReportErrorSheet` | Error reporting |
| `ImpactOutcomePrompt` | Post-investigation outcome |
| `PrivacyConsentPanel`, `TrustStrip`, `LoadingState`, `ErrorState` | UX chrome |

**Pages:** `Library.jsx`, `DirectoryPage.jsx`, `ImpactPublicPage.jsx`.

### 5.4 Key flow: camera → investigation → share1. User captures image → `useTapAnalysis` POST `/api/tap` → identification + optional `db_preview`.
2. Sourcing `/api/tap/sourcing` → Etsy, registry, Overpass locals.
3. Investigation `/api/tap/investigation` → full profile merge + loading states.
4. `ResearchNarrative` + `InvestigationCard` render record; `assignShareRiskTier` on server informs share/export.
5. Share: client uses `/api/share-card`, `/api/share-export` (see issues).

---

## 6. AI pipeline detail

### 6.1 Vision

- **Primary:** Claude Vision (`ANTHROPIC_VISION_MODEL`, default `claude-sonnet-4-6` in Render template).
- **Failover / corroboration:** Gemini Vision (`GEMINI_API_KEY`).
- **Client:** `imageEnhance.js` contrast/sharpen on selection crop before upload.
- **Confidence:** `visionCorroboration.js` + `confidenceScorer.js`; tiers in `tap.js` (`getIdentificationTier`).

### 6.2 Investigation

- **Primary:** Claude `messages` + web search tool loop (`investigation.js`, model `ANTHROPIC_INVESTIGATION_MODEL`).
- **Fallback chain:** `runInvestigationTextFallbackChain` — Perplexity then Gemini (`aiProvider.js`).
- **Layer C:** `corroborateLayerC` — Perplexity fact check style pass; merged into profile JSON (`corroboration.js`).
- **Caching:** `investigationCache` keyed by investigation request fingerprint.

### 6.3 Corroboration script (`server/db/corroborate_profiles.mjs`)

- Loads `incumbent_profiles` rows; runs **Claude live investigation** vs stored `profile_json` and **Perplexity** in parallel.
- **Compares** concern levels, amounts, timeline years, verdict tags, etc.; can set `NEEDS_HUMAN_REVIEW`.
- **Optional `--upsert`:** merges discrepancy annotations into `profile_json` for severe cases.
- Outputs JSON report (e.g. `corroboration_report.json`, tier JSON files in `server/`).
- **Healthcare batch note:** `server/tier5_corroboration_healthcare.json` shows **12** `ERROR` rows (e.g. `401 invalid x-api-key` at time of run) — **rerun** when keys valid.

### 6.4 Deep research (`server/scripts/deep_research_profile.mjs`)

- **Architecture:** Perplexity (research + citations) → Claude (extract / dedupe / institutional / summaries) → DB append.
- **12 categories:** `labor_and_wage`, `environmental`, `regulatory_and_legal`, `product_safety`, `financial_misconduct`, `data_and_privacy`, `antitrust_and_market_power`, `discrimination_and_civil_rights`, `institutional_enablement`, `executive_and_governance`, `supply_chain`, `subsidies_and_bailouts` (see script `CATEGORY_QUERIES`).
- **Subsidiary map** first (Perplexity + Claude corporate tree).
- **Incident fields:** `date`, `entity`, `parent_attribution`, `jurisdiction`, `agency_or_court`, `description`, `outcome`, `amount_usd`, `workers_affected`, `source_url`, `source_type`, `confidence`, `category`.
- **Merge rules:** incidents merged with `mergeIncidentsPreserveConfirmed`; `confirmed: true` rows not overwritten.
- **Cost cap:** `PERPLEXITY_COST_CAP_USD` from `--cost-cap` → `PERPLEXITY_DEEP_RESEARCH_COST_CAP_USD` env → default **15**; logged at startup.
- **Dry run:** writes `server/deep_research_output/{slug}_deep.json`.
- **Full instructions:** `server/scripts/deep_research_profile_INSTRUCTIONS.md`.

**Status note:** Walmart dry run may be in progress as of doc date.

---

## 7. Scripts

### `server/scripts/`

| File | Purpose |
|------|---------|
| `deep_research_profile.mjs` | Deep research pipeline (§6.4). Run from `server/`: `node scripts/deep_research_profile.mjs --slug walmart --dry-run` |
| `deep_research_profile_INSTRUCTIONS.md` | Spec for deep research |
| `run_corroboration_new_healthcare.sh` | Shell helper for healthcare corroboration batches |
| `run_corroboration_retry_and_batches.sh` | Shell helper for corroboration retries |

### `server/db/*.mjs`

Import and maintenance scripts (see §3.4). Typical pattern: `node db/import_profiles_v13.mjs` from `server/` (see each file header).

### `db/*.mjs` (repo root)

| File | Purpose |
|------|---------|
| `import_all_profiles.mjs` | Alternate bulk import |
| `corroborate_profiles.mjs` | Duplicate entrypoint — verify cwd/paths |
| `backfill_*.mjs`, `seed_boards_religious.mjs` | Data backfills / seeds |

---

## 8. Environment variables

**Documented in** `.env.example` **and** `README.md`. Summary:

| Variable | Required | Without it |
|----------|----------|------------|
| `ANTHROPIC_API_KEY` | Yes for full AI | Investigation / vision fail |
| `DATABASE_URL` | No | No Black Book DB, no relational previews; pool disabled |
| `GEMINI_API_KEY` | No | No Gemini vision / text fallback |
| `PERPLEXITY_API_KEY` | No | No Perplexity investigation fallback / corroboration / deep research |
| `ETSY_API_KEY` | No | Etsy alternatives empty |
| `NEWS_API_KEY` | No | Local news ticker degraded |
| `EVENTBRITE_API_KEY` | No | Events curated-only |
| `CORS_ORIGIN` | No in dev | Production: set for static site origin(s) |
| `PORT` | No | Defaults `3001` |
| `VITE_API_URL` | Client prod | Client must point to API origin |
| `VITE_DEV_API` | No | Vite proxy override |
| `TAP_RATE_SALT`, `WORKER_RATE_SALT` | No | Default salts for rate-limit hashing |
| `PERPLEXITY_API_URL` | No | Perplexity endpoint override |
| `PERPLEXITY_MODEL` | No | Sonar model fallback name |
| `PERPLEXITY_DEEP_RESEARCH_COST_CAP_USD` | No | Deep research Perplexity cap (see script) |
| `PERIMETER_ED25519_PKCS8_DER_B64` | No | Optional Ed25519 signing for perimeter payload (`perimeterCheck.js`) |

---

## 9. Deployment

### Render (`render.yaml`)

| Service | Type | Root | Build | Start |
|---------|------|------|-------|-------|
| `ethicalalt-server` | Web | `server` | `npm install` | `node index.js` |
| `ethicalalt-client` | Static | `client` | `npm install && npm run build` | publish `dist` |

**Secrets (dashboard):** `ANTHROPIC_API_KEY`, `ETSY_API_KEY`, `DATABASE_URL`, `NEWS_API_KEY`, `CORS_ORIGIN`, etc.

**Live vs parked**

- **Live:** client static site + API per README (`ethicalalt-client.onrender.com` pattern).
- **Parked / low exposure:** civic witness + worker marketplace routes exist but README marks civic as **parked**; Hire Direct tables exist — product emphasis is camera + Black Book + alternatives.

### Known production issues

See §10. Health check: GET `/health` (no auth).

---

## 10. Open issues and known bugs

| Issue | Notes |
|-------|--------|
| **ShareCard** | Broken / incomplete: no stable permalink, no dedicated social endpoint as desired |
| **Healthcare corroboration** | **12** errored slugs in `server/tier5_corroboration_healthcare.json` (e.g. auth errors) — **rerun** with valid keys |
| **Citation quality** | Some profile `source_url` / timeline links point at homepages vs direct articles |
| **ResearchNarrative scroll** | Fix shipped; **needs mobile verification** |
| **Deep research** | Walmart dry run may be in progress; pipeline cost + runtime heavy |

---

## 11. Philosophy and constraints

- **Receipts, not verdicts** — evidence grades, sources, allegation responses typed per `RESEARCH_ALGORITHM.md`.
- **Never overwrite confirmed incidents** (deep research merge preserves `confirmed: true` rows by URL).
- **Source URL** required for high-trust incidents in deep research extractor rules; low confidence + `null` URL when uncited.
- **Ed25519** — optional **`PERIMETER_ED25519_PKCS8_DER_B64`** signs subset of perimeter payload in `perimeterCheck.js`; **deep research output signing** called out as roadmap / handoff constraint, not fully productized for all exports.
- **Budget** — **~$200/mo** production AI + infra target (operational discipline; not enforced in code).

---

## 12. Explicitly parked — do not build yet

- **Civic features** — witness registry, worker profiles as *primary* product surface (API partially exists).
- **Phase 11 equivalent** — treat as label for deferred tranche; no implementation commitment in this doc.
- **Social / gamification layer** — no feed, likes, or reputation system in scope.

---

*End of document. Update this file when schema, routes, or pipeline behavior changes materially.*
