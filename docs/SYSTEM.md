# ETHICAL_ALTERNATIVES — System documentation

This document describes the **current state of the repository** as of the last full pass over the source files. Where behavior depends on deployment (database contents, secrets), that is called out explicitly.

---

## 1. Application overview

### What the app does

EthicalAlt is a React single-page app backed by an Express API. It supports **photo-based “tap” investigation** (point at a product or logo), **typed “deep” brand search**, and a **home feed** of local alternatives and chain context when geolocation or manual city is available. The server assembles **vision identification**, **optional PostgreSQL-backed corporate profiles**, **live AI investigations** (web search + structured JSON), **Etsy / Overpass / seller-registry** alternatives, **share-card** and **share-export** flows, and ancillary civic/local features.

### Core user loop (photo / tap)

1. User opens **Scan** (`mode === 'snap'`), loads an image (file, drag-drop, or live camera).
2. Client calls **`POST /api/tap`** with `preview_only: true` → server runs vision, optional scene enhancement, returns identification + tier + optional DB preview **without** charging the tap rate limit.
3. If client-side confidence is below `CONFIRM_THRESHOLD` (0.6 in `useTapAnalysis.js`), user sees **ConfirmTap** (confirm, retap, or region select).
4. If confidence is high enough, client sets partial `result` and kicks off **two parallel POSTs**: **`/api/tap/sourcing`** (alternatives) and **`/api/tap/investigation`** (investigation profile). Both are subject to **`tapRateLimit`** (preview is not).
5. Results render in **App.jsx** (investigation card, alternatives sidebar, etc.).

**Barcode shortcut:** if live camera reads a barcode (`BarcodeDetector`), **`POST /api/barcode`** resolves brand via Open Food Facts; **App.jsx** can set `result` and call **`runResearchPhase`** without an image (vision pipeline skipped).

### Intentionally parked / disabled (in code)

| Area | Location | Mechanism |
|------|-----------|-----------|
| **Witness registry UI** | `client/src/App.jsx` | `mode === 'witnesses'` renders `{false && (<WitnessRegistry .../>)}` — **nothing visible**. |
| **Worker profile UI** | `client/src/App.jsx` | `mode === 'worker-profile'` renders `{false && (<WorkerProfilePage .../>)}` — **blank**. |
| **Bottom-nav “Registry”** | `client/src/App.jsx` | `{false && (<button ... Registry />)}` — nav item hidden. |
| **HomeScreen civic entry** | `client/src/components/HomeScreen.jsx` | `onOpenWitnesses={() => {}}` (no-op) from `App.jsx`. |

Server routes for `/api/witness`, `/api/workers`, etc. **still exist**; only the primary client surfaces above are gated off.

---

## 2. Client architecture

### `client/src` file tree (purpose)

| Path | Role |
|------|------|
| `main.jsx` | Boots React; calls `initDisintegration()` then renders `App`. |
| `App.jsx` | Root layout, `mode` state machine, tap/deep/library/impact flows, error overlays, share, documentary, outcome prompt. |
| `App.css` | App shell styles. |
| `styles/globals.css` | Global CSS. |
| `hooks/useTapAnalysis.js` | Tap/session state: image, tap position, preview, analyze, sourcing + investigation fetches, geo, errors, region select, barcode-related exports (`setResult`, `runResearchPhase`). |
| `pages/Library.jsx` | Black Book list + dossier reader; filters/sort; fetches `/api/library`. |
| `pages/Library.css` | Library styles. |
| `pages/DirectoryPage.jsx` + `.css` | Directory of profiles from `/api/profiles/index`. |
| `pages/ImpactPublicPage.jsx` | Impact public page. |
| `pages/ImpactPublicPage.jsx` | Uses `VITE_API_URL` for API prefix. |
| `components/PhotoCapture.jsx` | Image upload, live camera, **barcode scanning** overlay. |
| `components/TapOverlay.jsx` | Tap vs hold-to-select region. |
| `components/RegionSelectOverlay.jsx` + `.css` | Drag rectangle → normalized box → `onConfirm(cx, cy, normRect)`. |
| `components/ConfirmTap.jsx` + `.css` | Low-confidence confirmation UI. |
| `components/HomeScreen.jsx` | Home feed: location phases, onboarding, local feed, chains, territory, events, community board, local commercial modal, privacy, **OnboardingDeck**. |
| `components/OnboardingDeck.jsx` | 5-card swipe/onboarding experience. |
| `components/InvestigationCard.jsx` + `.css` | Main investigation presentation. |
| `components/DossierCard.jsx` | Library dossier card. |
| `components/AlternativesSidebar.jsx` | Etsy + registry + local results. |
| `components/QuickAlternatives.jsx` | Compact alternatives list. |
| `components/ShareCard.jsx` | Share overlay; API prefix from env. |
| `components/ResearchNarrative.jsx` | Research backdrop narrative. |
| `components/LocalDocumentary.jsx` | Async “documentary” overlay during research. |
| `components/ImpactOutcomePrompt.jsx` | Post-tap impact consent outcome. |
| `components/LocationCitySheet.jsx` | City gate / manual city. |
| `components/HistoryScreen.jsx` | Session history UI. |
| `components/ErrorState.jsx` + `.css` | Generic error. |
| `components/LoadingState.jsx` + `.css` | Loading UI. |
| `components/ConfidenceBadge.jsx` | Badge from investigation confidence helpers. |
| `components/CommunityImpact.jsx` | Community impact block. |
| `components/CommunityBoard.jsx` | Community board client (API calls). |
| `components/EventsFeed.jsx` | Events feed UI. |
| `components/LocalCommercial.jsx` | Local commercial modal (API). |
| `components/TerritoryCard.jsx` | Native land / territory card. |
| `components/TrustStrip.jsx` | Trust strip. |
| `components/ActiveNowSection.jsx` + `.css` | Active-now section. |
| `components/ListYourShop.jsx` | List your shop. |
| `components/WitnessRegistry.jsx` | Witness registry (not mounted in App when disabled). |
| `components/WorkerProfilePage.jsx` | Worker profile page. |
| `components/WorkerRegistrationModal.jsx` | Worker registration. |
| `components/HireDirect*.jsx` | Hire Direct sections/modals. |
| `components/Civic/ShareSheet.jsx` | Share sheet. |
| `components/PrivacyConsentPanel.jsx` | Privacy panel. |
| `components/ProofBlock.jsx` | Proof block. |
| `components/HealthCallout.jsx` | Health callout. |
| `components/Timeline.jsx` | Timeline UI. |
| `components/CostAbsorption.jsx` | Cost absorption UI. |
| `components/WealthChart.jsx` | Wealth chart. |
| `components/SeverityMeter.jsx` | Severity meter. |
| `components/ResultCard.jsx` + `.css` | Legacy/alt result card. |
| `components/SecondhandLinks.jsx` | Secondhand links. |
| `components/DiySection.jsx` | DIY section. |
| `components/RegistryCard.jsx` | Registry card. |
| `components/LocalNewsTicker.jsx` | News ticker. |
| `components/icons/SectionIcons.jsx` | Icons. |
| `lib/api.js` | API base helper. |
| `lib/impactConsent.js` | Impact consent + `getImpactFetchHeaders`. |
| `lib/methodologyUrl.js` | Optional `VITE_METHODOLOGY_URL`. |
| `lib/fetchProportionality.js` | Proportionality fetch helper. |
| `constants/hireDirect.js` | Hire Direct constants. |
| `constants/witnessLegalNotice.js` | Legal notice text; can use `VITE_ETHICALALT_CONTACT`. |
| `services/location.js` | Cached location, persistence. |
| `services/cityIdentity.js` | City identity fetch. |
| `services/travelTracker.js` | Travel tracker for feed. |
| `utils/disintegrationEngine.js` | Global click disintegration effects. |
| `utils/haptics.js` | Haptic feedback. |
| `utils/sounds.js` | Sound helpers. |
| `utils/brandSlug.js` | Brand slugify. |
| `utils/investigationConfidence.js` | Badge / record presentation. |
| `utils/investigationSources.js` | Source helpers. |
| `utils/investigationHealth.js` | Health-related helpers. |
| `utils/localBusinessMaps.js` | Maps URL helpers. |
| `utils/dailyShuffle.js` | Deterministic daily shuffle for feed. |
| `utils/eaSessionId.js` | Session id helper (if used by features). |

### Hooks

**`useTapAnalysis`** (`client/src/hooks/useTapAnalysis.js`):

- **State:** `image`, `tapPosition`, `activeSelectionBox`, `loading`, `result`, `error`, `geo`, `tapSession`, `pendingConfirmation`, `regionSelectActive`, and refs for selection box / error haptic.
- **Key behavior:** `analyzeTap` → preview `POST /api/tap` with `preview_only: true`; if OK and confidence ≥ `CONFIRM_THRESHOLD` (0.6), sets `result` and `runResearchPhase`. `runResearchPhase` fires **`POST /api/tap/sourcing`** and **`POST /api/tap/investigation`** in parallel (async IIFEs). `CONFIRM_THRESHOLD` documented in file as boundary for confirm flow.
- **Exports:** includes `setResult`, `runResearchPhase`, `analyzeTap`, `reset`, `clearResult`, `investigateByBrand`, region-select and pending-confirmation handlers, etc.

No other custom hooks under `client/src/hooks/` in this repo (only `useTapAnalysis.js`).

### `App.jsx` mode system

**`mode` values** (string) observed in `App.jsx`: `home`, `snap`, `deep`, `history`, `witnesses`, `worker-profile`, `directory`, `impact`, `library`.

| Mode | What renders | Typical transition |
|------|----------------|-------------------|
| `home` | `HomeScreen` | Default; “Local” nav, start snap, search, open library/impact/directory. |
| `snap` | Photo capture → tap overlay → results | `onStartSnap`, FAB scan, bottom nav Scan. |
| `deep` | Typed investigation results (`deepResultsSection`) | Search from home, `/profile/:slug` URL. |
| `history` | `HistoryScreen` | Nav History. |
| `library` | `Library` (Black Book) | Open Black Book, rate-limit flows. |
| `impact` | `ImpactPublicPage` | Impact entry. |
| `directory` | `DirectoryPage` | Directory entry. |
| `witnesses` | **Empty** (WitnessRegistry wrapped in `false &&`) | `openWitnessRegistry` still pushes `/witnesses` history. |
| `worker-profile` | **Empty** (WorkerProfilePage wrapped in `false &&`) | URL `/workers/:slug`. |

**Routing:** No React Router. **`window.history.pushState` / `replaceState` + `popstate`** in `App.jsx` sync mode to paths: `/witnesses`, `/workers/:slug`, `/directory`, `/impact`, `/library`, `/library/:slug`, `/profile/:slug`.

### Client env usage

Primary client env: **`VITE_API_URL`** (optional base for API; otherwise relative `/api/...`). Others: **`VITE_METHODOLOGY_URL`**, **`VITE_ETHICALALT_CONTACT`** (see `lib/methodologyUrl.js`, `constants/witnessLegalNotice.js`).

---

## 3. Server architecture

### `server/` layout (high level)

- **`index.js`** — Express app: CORS, `express.json`, `registryHeaders`, health routes, proportionality GET, `app.listen`.
- **`env.js`** — Loads `server/.env` via `dotenv`.
- **`routes/*.js`** — HTTP routers (see below).
- **`middleware/*.js`** — Rate limits, headers, witness validation.
- **`services/*.js`** — Business logic (vision, investigation, Etsy, etc.).
- **`db/`** — `pool.js`, `schema.sql`, migrations, import scripts (`import_profiles_*.mjs`), `brand_aliases.json`, batch JSON profiles.
- **`data/*.json`** — Static data (chains, share destinations, etc.).
- **`utils/`** — Image validation, share guards, etc.
- **`constants/`** — e.g. witness legal.

### Middleware

| File | Behavior |
|------|----------|
| `registryHeaders.js` | Sets `X-EthicalAlt-Registry: civic-witness-v1` on every response. |
| `tapRateLimit.js` | See §6. |
| `witnessValidation.js` | See §6. |
| `workerRateLimit.js` | See §6. |

### `server/index.js` mount order

1. `cors`, `express.json({ limit: '10mb' })`, `registryHeaders`
2. `GET /health`, `GET /api/health/providers`, `GET /proportionality`
3. `app.use('/api/workers', workersRouter)`
4. `app.use('/api', tapRouter)` — tap routes live under `/api/tap`, etc.
5. `app.use('/api/barcode', barcodeRouter)`
6. `app.use('/api', impactRouter)`
7. `app.use('/api/profiles', profileIndexRouter)`
8. `app.use('/api/library', libraryRouter)`
9. `app.use('/api/perimeter', perimeterRouter)`
10. `app.use('/api/city-narrative', cityNarrativeRouter)`
11. `app.use('/api/sellers', sellersRouter)`
12. `app.use('/api/city-identity', cityIdentityRouter)`
13. `app.use('/api/local-feed', localFeedRouter)`
14. `app.use('/api/share-card', shareCardRouter)`
15. `app.use('/api/share-export', shareExportRouter)`
16. `app.use('/api/geocode', geocodeRouter)`
17. `app.use('/api/board', communityBoardRouter)`
18. `app.use('/api/territory', territoryRouter)`
19. `app.use('/api/events', localEventsRouter)`
20. `app.use('/api/local-commercial', localCommercialRouter)`
21. `app.use('/api/witness', witnessRouter)`
22. `app.use('/api/documentary', documentaryRouter)`

### Route files (paths are as mounted; combine with prefix above)

| File | Notable routes / role |
|------|------------------------|
| `routes/tap.js` | `POST /tap`, `POST /tap/sourcing`, `POST /tap/investigation`, `GET /history`, `GET /history/:id`, `POST /investigate` — all under `/api` because of `app.use('/api', tapRouter)`. |
| `routes/barcode.route.js` | `POST /` → `/api/barcode` |
| `routes/impact.js` | `GET /impact/public`, `POST /impact/outcome` |
| `routes/profiles.index.route.js` | `GET /index` → `/api/profiles/index` |
| `routes/library.route.js` | `GET /`, `GET /:slug` → `/api/library` |
| `routes/perimeter.route.js` | Perimeter checks (see service). |
| `routes/cityNarrative.route.js` | City narrative JSON for UI. |
| `routes/sellers.js` | Seller-related endpoints. |
| `routes/cityIdentity.js` | City identity. |
| `routes/localFeed.js` | Local feed for home. |
| `routes/shareCard.js` | Share card generation, risk tier, regulators. |
| `routes/shareExport.js` | Channel export; **TikTok blocked when `share_risk_tier === 'high'`**. |
| `routes/geocode.js` | Geocoding. |
| `routes/communityBoard.js` | `GET/POST` community board. |
| `routes/territory.js` | Territory / Native Land–related (uses `NATIVE_LAND_API_KEY` when set). |
| `routes/localEvents.js` | Events (`EVENTBRITE_API_KEY` when set). |
| `routes/localCommercial.js` | Local commercial AI assist. |
| `routes/witness.js` | `POST /` with `validateWitnessPost`, `GET` summary/brand. |
| `routes/documentary.js` | Documentary narration. |
| `routes/workers.js` | Worker registry, register, message; uses worker rate limit middleware. |

*(Exact method lists: grep `router.` in each file if you need exhaustive lists for a single router.)*

### Services (representative)

- **`vision.js`** — Claude vision + Gemini fallback; crops; `inventoryScene`, `inferSceneContext`, `identifyObject`; vision corroboration.
- **`investigation.js`** — `getInvestigationProfile`, DB vs realtime, `finalizeInvestigation`, `assignShareRiskTier` import, caching hooks.
- **`aiProvider.js`** — Gemini/Perplexity helpers; **parallel** investigation text fallback (`Promise.all` + first success).
- **`cacheStore.js`** — In-memory caches (§5).
- **`confidenceScorer.js`** — Three-track scoring (§4).
- **`shareRiskTier.js`** — Share risk tier (§4).
- **`corroboration.js`**, **`visionCorroboration.js`** — Layer C / vision corroboration; use `combineConfidenceTracks`.
- **`etsy.js`**, **`overpass.js`**, **`sellerRegistry.js`**, **`incumbentPreview.js`**, **`tapHistory.js`**, **`impactAnalytics.js`**, **`hireDirectCategories.js`**, **`proportionality.js`**, **`perimeterCheck.js`**, **`perimeterCache.js`**, **`rotationTheme.js`**, **`chainClassification.js`**, etc.

---

## 4. AI pipeline

### Tap flow: three client fetches

1. **`POST /api/tap`** with `preview_only: true`  
   - **Returns:** `identification`, `identification_tier`, `crop_base64`, `scene_inventory`, `db_preview`, `preview_only`, `version`, `response_ms`.  
   - **Rate limit:** skipped by `tapRateLimit` when `preview_only === true`.

2. **`POST /api/tap/sourcing`**  
   - **Body:** `identification`, `session_id`, optional `user_lat` / `user_lng`.  
   - **Returns:** Etsy results, registry, Overpass locals, `empty_sources`, `searched_sources`, etc.

3. **`POST /api/tap/investigation`**  
   - **Body:** `identification`, `session_id`, geo.  
   - **Returns:** `investigation`, `is_stub_investigation`, `searched_sources`, `response_ms`.  
   - **Rate limit:** **`tapRateLimit` applies** (counts toward daily cap).

Full **`POST /api/tap`** without `preview_only` also runs investigation + alternatives in one response when used (not the default client preview path).

### Vision (`server/services/vision.js`)

- **Primary:** Anthropic **`ANTHROPIC_VISION_MODEL`** or default **`claude-sonnet-4-6`** — two JPEG images (full + crop) + `buildVisionPrompt`.
- **Failover:** On Claude failure, **`geminiVisionCompletion`** (`GEMINI_VISION_MODEL`, default `gemini-2.0-flash`) with same prompt.
- **Post-processing:** Parse JSON identification; if `scene_inference` or confidence &lt; 0.6, optional **`inferSceneContext`** + **`mergeSceneInference`**. Then **`corroborateVisionIdentification`** (uses Gemini + confidence combiner in `visionCorroboration.js`).

### Investigation (`server/services/investigation.js`)

- **DB path:** Query `incumbent_profiles` by resolved slug; `incumbentRowToInvestigation` → `normalizeInvestigation` → `finalizeInvestigation`. Stub rows (small `profile_json`) may trigger **stub upgrade** via **`realtimeInvestigation`**.
- **Realtime path:** `buildResearchPrompt` → Anthropic with **`web_search_20250305`** tool → `runInvestigationAnthropicTurn` (multi-turn, tool results) → parse JSON → optional completion / **`runInvestigationTextFallbackChain`** (Perplexity + Gemini **in parallel**, first successful result) → `finalizeRealtimeFromParsed`.
- **Emergency / degraded:** `buildRealtimeEmergencyProfile`, `fetchDegradedCachedInvestigation`, etc.

### Confidence scorer (`server/services/confidenceScorer.js`)

- **Three tracks:** `documentary` (weight **0.5**), `model` (**0.3**), `crossref` adjustment (**0.2** weight on the adjustment value).
- **Clamp:** `CLAMP_MIN = 0.15`, `CLAMP_MAX = 0.97`.
- **Functions:** `scoreDocumentary`, `scoreModelAgreementVision`, `scoreModelAgreementText`, `crossRefAdjustmentVision`, `crossRefAdjustmentText`, **`combineConfidenceTracks`**.
- **Called from:** `visionCorroboration.js` and `corroboration.js` (grep `combineConfidenceTracks`).

### Share risk tier (`server/services/shareRiskTier.js`)

- **`assignShareRiskTier(inv)`** returns **`low` | `medium` | `high`** using:
  - High-risk **keywords** and **verdict_tags** sets,
  - `overall_concern_level` + `overall_investigation_confidence`,
  - Count of weak corroboration / `alleged` evidence grades.
- **Gates:** `server/routes/shareExport.js` blocks **TikTok** when tier is **`high`**. `shareCard.js` also computes tier for share payloads. Extended methodology may appear in `docs/SHARE_RISK_TIER_METHODOLOGY.md` (separate from this file).

---

## 5. Cache layer

### `CacheStore` (`server/services/cacheStore.js`)

- **Backing store:** `Map`; on `get` / successful read, entry is **deleted and re-inserted** at the end → **LRU touch** behavior.
- **`set`:** Computes expiry as `Date.now() + (ttlMs ?? this.ttlMs)`; calls **`_evict()`** if `size >= maxSize` (deletes **first** key = oldest insertion); then `delete(key)` + `set` (refresh position).
- **`get`:** Deletes expired entries; returns `undefined` if missing/expired.

### Shared instances

| Export | maxSize | ttlMs |
|--------|---------|--------|
| `investigationCache` | 300 | 6h |
| `barcodeCache` | 500 | 24h |
| `cityNarrativeCache` | 200 | 24h |

### Where wired

- **`investigation.js`:** `realtimeInvestigation` — get/set by `inv:brand:parent` key; **does not cache** when `is_stub_investigation`; DB path sets cache for non-stub finalized rows.
- **`barcode.route.js`:** Key = raw barcode string; caches JSON responses.
- **`cityNarrative.route.js`:** Key = `city:state` (lowercased); caches `{ headline, body }`.

### Cache stats endpoint

- **`GET /health`** returns `{ ok: true, cache: { investigation: { size, maxSize: 300 }, barcode: { size, maxSize: 500 }, cityNarrative: { size, maxSize: 200 } } }`.

---

## 6. Rate limiting

### `tapRateLimit` (`server/middleware/tapRateLimit.js`)

- **Window:** **24 hours** (`WINDOW_MS`).
- **Max:** **5** requests per bucket (`MAX_TAPS`).
- **Skip:** If `req.body?.preview_only === true` → **`next()` without incrementing**.
- **Key:** SHA-256 of salt (`TAP_RATE_SALT` or default `ethicalalt-tap-v1`) + client IP (from `x-forwarded-for` or socket).
- **429 response:** `error`, `message`, `resets_in_ms`, `limit`; header `X-EthicalAlt-Taps-Remaining` when allowed.
- **Routes:** `POST /api/tap` and `POST /api/tap/investigation` in `tap.js` (not sourcing).

### Witness (`validateWitnessPost` in `witnessValidation.js`)

- **Window:** **1 hour**; **max 3** posts per IP hash (`WITNESS_RATE_SALT` or default).
- Applied to **`POST /api/witness`** (see `witness.js`).

### Worker (`workerRateLimit.js`)

- **`assertWorkerRegisterAllowed`:** **2 registrations per IP per UTC day** (`WORKER_RATE_SALT`).
- **`assertWorkerMessageAllowed`:** **5 messages per rolling 24h** per `sender_session` + worker id.

---

## 7. Barcode detection

### `PhotoCapture.jsx`

- Uses **`window.BarcodeDetector`** when available with formats:  
  **`ean_13`, `ean_8`, `upc_a`, `upc_e`, `code_128`, `code_39`, `qr_code`**.
- **`setInterval` every 500ms** on the live `<video>`; requires `readyState >= 2`.
- **UI:** Pill “BARCODE DETECTED — LOOKING UP…” (amber); corner “SCANNING” while active.
- **Does not** capture a still; calls `onBarcodeDetected(rawValue, format)` once per detection.

### `POST /api/barcode` (`server/routes/barcode.route.js`)

- **Open Food Facts:** `GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json?fields=...` with **4s abort** timeout.
- **Response:** `{ found: true, brand, product_name, category, barcode }` or `{ found: false, barcode }`.
- **Cached** via `barcodeCache`.

### `App.jsx` integration

- **`onBarcodeDetected`** fetches `/api/barcode`; if `found && brand`, builds `identification` (including `identification_method: 'barcode'`), **`setResult`**, **`setMode('snap')`**, **`captureGeoOnce`**, **`runResearchPhase(identification)`**.

---

## 8. Hold-to-select gesture

### `TapOverlay.jsx`

- **`holdDurationMs`:** default **600** ms.
- **`MOVE_CANCEL_PX`:** **8** — pointer move beyond this distance cancels hold timer.
- **Hold:** `pointerdown` starts timer; on fire, **`onHoldSelect(normX, normY)`**, brief visual hold indicator, haptic `scan`.
- **Tap:** if hold did not complete and movement stayed within threshold, **`onTap`** on `pointerup`.

### `RegionSelectOverlay.jsx`

- User drags a rectangle; **confirm** requires **min width/height 0.02** normalized; calls **`onConfirm(cx, cy, { x, y, width, height })`**.

### API

- **`useTapAnalysis`** passes `selection_box` into `buildBody` → **`POST /api/tap`** with normalized box; **`vision.js`** uses **`generateSelectionBoxCrop`** when box present.

---

## 9. Database

### Schema source

- **`server/db/schema.sql`** defines core tables (and `ALTER` for `profile_type`).

### Tables (from `schema.sql` and migrations)

Includes at least: **`incumbent_profiles`**, **`tap_history`**, **`seller_registry`**, **`farmers_markets`**, **`community_board`**, **`chain_classifications`**, **`civic_witnesses`**, **`local_workers`**, **`worker_messages`**, **`impact_*`**, **`profile_activity_cache`**, etc. See file for full column lists.

### `incumbent_profiles`

- Relational columns + optional **`profile_json`** JSONB (preferred when present).
- **`profile_type`** column (e.g. `database`, `realtime_search` — values appear in code and imports).

**Profile JSON shape:** Varies; nested v3 sections are flattened in `investigation.js` via `flattenNestedProfileJson`. Imports live under `server/db/profiles_batch**`, `db/profiles_v*`, with scripts like `import_profiles_v*.mjs`, `import_all_profiles.mjs`.

**Row counts / “current counts”:** **Not fixed in the repo** — depend on **`DATABASE_URL`** and migration/import history.

### Board members

- Repo includes **`db/boards/*.json`** (per-entity board data used in tracking/docs). This is **file-based** alongside DB profiles, not a separate SQL table name in the snippets reviewed.

---

## 10. The Black Book

### How profiles are served

- **`GET /api/library`** — List from `incumbent_profiles` (slug, name, concern, headline snippet, etc.).
- **`GET /api/library/:slug`** — Full merged `profile` JSON for reader UI.

### `Library.jsx`

- Loads index from **`/api/library`**.
- **Search** filters name/slug/parent.
- **Concern filter:** `all` or **`significant`** only (client-side).
- **Type filter:** `all`, **`corporations`** (`profile_type === 'database'`), **`institutions`** (`religious_institution`), **`nonprofits`** (`nonprofit`).
- **Sort:** `az`, `za`, `recent`.
- **Note:** The list API mapper in `library.route.js` **does not include `profile_type` in each row** as of the current SELECT/map. The client filters by `p.profile_type` — **those filters may not match any rows until the API includes `profile_type`** (or the client derives it). This is an **implementation gap** visible by reading both files.

### Profile count by type

- **Not derivable from static files alone**; depends on DB. **`GET /api/library`** returns `total: profiles.length` for the index request.

---

## 11. Onboarding flow

### `OnboardingDeck.jsx`

- **`CARDS`:** **5** cards with distinct copy, colors, and **`exit`** effect names: **`shatter`**, **`explode`**, **`melt`**, **`float`**, **`none`** (see source for exact headlines/subtext).

### `HomeScreen` phase system

- **`ONBOARD_KEY`:** **`ea_geo_onboard`** (`sessionStorage`).
- **`initialPhase()`:**  
  - `'skipped'` if `sessionStorage.getItem(ONBOARD_KEY) === 'skipped'`  
  - `'loading'` if **`granted`**  
  - else **`'onboarding'`**
- Renders **`OnboardingDeck`** when **`phase === 'onboarding'`**; on complete → **`setPhase('prompt')`**.
- Other phases: `prompt`, `loading`, `ready`, `skipped` (see `HomeScreen.jsx`).

### When onboarding is skipped

- Setting **`ea_geo_onboard`** to **`skipped`** or **`granted`** changes initial phase (see above).

---

## 12. Disintegration engine

### `client/src/utils/disintegrationEngine.js`

- **`initDisintegration()`** (called from **`main.jsx`**) registers **`document.body` click listener**.
- **Targets:** `event.target.closest('button')` or **`[data-disintegrate]`**; skipped if **`data-no-disintegrate`** is set on the element.
- **Effects:** **`EFFECTS` array** — **8** runners: `runGravity`, `runExplode`, `runVortex`, `runFloat`, `runShatter`, `runGlitch`, `runMelt`, `runStatic` — one chosen at random.
- **Sound:** `playDisintegrationSound()` — short triangle-wave sweep via Web Audio API.

---

## 13. Research algorithm

### `RESEARCH_ALGORITHM.md` (summary)

- Procedural trust: verifiable events, receipts for claims, explicit absence of evidence.
- **Research sequence:** identity → financial → legal → patterns → allegations (with response types) → community impact → verification.
- **Three allegation response types:** Type 1 documented denial/dispute, Type 2 documented acknowledgment, Type 3 no documented response — must close with canonical **“EthicalAlt allegation response type: Type N — …”** line.
- **Source quality hierarchy:** eight tiers from primary government docs down to advocacy summaries (see file).
- **Concern calibration:** table for **significant / moderate / low** (note: runtime investigation schema also uses **`minor`**, **`clean`**, **`unknown`** handling in `normalizeInvestigation` — **not identical** to the doc table alone).

---

## 14. Environment variables

Representative list (non-exhaustive; grep `process.env` / `import.meta.env` for full sets):

| Variable | Role |
|----------|------|
| `DATABASE_URL` | PostgreSQL; if missing/short, **`pool` is null** — DB routes degrade (empty data, 503s where coded). |
| `ANTHROPIC_API_KEY` | Required for Claude vision, investigation, documentary, many routes. |
| `ANTHROPIC_VISION_MODEL`, `ANTHROPIC_INVESTIGATION_MODEL`, `ANTHROPIC_DOCUMENTARY_MODEL`, `ANTHROPIC_CITY_MODEL`, `ANTHROPIC_TERRITORY_MODEL`, `ANTHROPIC_CHAIN_MODEL`, `ANTHROPIC_LOCAL_COMMERCIAL_MODEL`, `ANTHROPIC_PERIMETER_MODEL` | Model overrides (see each service). |
| `GEMINI_API_KEY`, `GEMINI_VISION_MODEL`, `GEMINI_TEXT_MODEL` / `GEMINI_INVESTIGATION_MODEL` | Gemini vision/text fallbacks. |
| `PERPLEXITY_API_KEY`, `PERPLEXITY_MODEL`, `PERPLEXITY_CORROBORATION_*` | Perplexity corroboration + fallbacks. |
| `ETSY_API_KEY` | Etsy search. |
| `CORS_ORIGIN` | Comma-separated allowed origins (default localhost:5173). |
| `PORT` | Server port (default **3001**). |
| `TAP_RATE_SALT`, `WITNESS_RATE_SALT`, `WORKER_RATE_SALT` | Rate-limit hashing salts. |
| `EVENTBRITE_API_KEY` | Events feed. |
| `NEWS_API_KEY` / `NEWSAPI_KEY` | Local news. |
| `NATIVE_LAND_API_KEY` | Territory route. |
| `COURTLISTENER_API_KEY` | Perimeter check (when set). |
| `PERIMETER_ED25519_PKCS8_DER_B64` | Perimeter signing (see `perimeterCheck.js`). |
| `PUBLIC_SITE_URL` | Share text site URL fallback in `shareTextsCore.js`. |
| `ETHICALALT_CONTACT_EMAIL` | Witness legal contact default. |
| **Client:** `VITE_API_URL`, `VITE_METHODOLOGY_URL`, `VITE_ETHICALALT_CONTACT` | Browser-side API base and optional copy URLs. |

---

## 15. Deployment

### Render (`render.yaml`)

- **Server:** `rootDir: server`, **`buildCommand: npm install`**, **`startCommand: node index.js`**.
- **Static site:** `rootDir: client`, **`npm install && npm run build`**, publish **`dist`**, SPA rewrite to `index.html`.
- **Env vars** listed in blueprint include `NODE_ENV`, Anthropic models, `ETSY_API_KEY`, `DATABASE_URL`, `NEWS_API_KEY`, `CORS_ORIGIN`; client **`VITE_API_URL`**.

### Monorepo root

- **`npm run build`** → builds **client** workspace only (`package.json`).
- **`npm start`** → **`npm run start -w ethicalalt-server`** → `node index.js` in `server/`.

### Without `DATABASE_URL`

- **`pool`** is **null**; features using DB (library, tap history persistence, workers, board, etc.) return empty/error paths per route.

### Health

- **`GET /health`** — `{ ok: true, cache: { ... } }` (see §5).
- **`GET /api/health/providers`** — AI provider health from `getProviderHealthSnapshot()`.

---

## 16. What is parked / secondary flows

| Feature | Notes |
|---------|--------|
| **Witness registry** | Server + `WitnessRegistry.jsx` exist; **App** wraps UI in `false &&`. Home passes **no-op** `onOpenWitnesses`. |
| **Worker profiles / Hire Direct** | Components + API exist; worker profile mode **renders blank** in App. Hire Direct UI may still appear inside investigation components when enabled in those components — **not** globally removed. |
| **Share export / TikTok** | Implemented in `shareExport.js`; **high** `share_risk_tier` **blocks TikTok** only. |
| **Territory / Native Land** | `TerritoryCard`, `routes/territory.js`, `NATIVE_LAND_API_KEY`. |
| **Events feed** | `EventsFeed.jsx`, `localEvents.js`, optional Eventbrite key. |
| **LocalCommercial** | Modal still openable from `HomeScreen` (`localCommercialOpen`); user note: **accessible but not primary nav**. |
| **Directory** | **Active** (`mode === 'directory'`). |

---

*End of `docs/SYSTEM.md`. For deeper investigation-specific docs, see `docs/HOW_INVESTIGATIONS_WORK.md`, `docs/INVESTIGATION_PROFILES.md`, and `docs/SHARE_RISK_TIER_METHODOLOGY.md`.*
