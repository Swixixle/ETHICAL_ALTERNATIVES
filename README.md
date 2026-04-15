# EthicalAlt

A corporate accountability scanner for the physical world.

Take a photo of anything. Tap what you want to know about. EthicalAlt identifies the brand, pulls its public enforcement record, and surfaces local independent alternatives near you. Every investigation is cryptographically signed and independently verifiable.

**Philosophy:** A mirror, not a verdict. This is a record of public actions, not a legal finding. Sources are linked directly.

## What it does

1. Take a photo or upload an image containing any product, logo, or brand
2. Tap the specific object or brand you want to investigate
3. EthicalAlt identifies what you tapped — logo, label, packaging, clothing tag
4. If the brand is recognized, its full corporate accountability record loads
5. If the brand isn't in the database, local independent alternatives near you are surfaced instead
6. Every investigation generates a cryptographically signed receipt

---

## Live at

[ethicalalt-client.onrender.com](https://ethicalalt-client.onrender.com)

---

## Profile database

**264 corporate profiles** including corporations, institutions, nonprofits, and religious organizations.

**20 deep research profiles** with structured incident timelines, per-category source citations, and signed receipts. Remaining profiles are standard AI-generated records.

Deep research profiles include: Altria, Amazon, Apple, BP, Chevron, Cigna, Coca-Cola, Comcast, Disney, Humana, Kraft Heinz, McDonald's, Nestlé, PepsiCo, Philip Morris, Shell, Target, Tyson Foods, UnitedHealth, Walmart.

---

## Enforcement action taxonomy

Every incident is classified at ingest:

| Type | Meaning |
|------|---------|
| `disposition` | Completed settlement, conviction, consent decree, or agency penalty |
| `regulator_action` | Stop-sale order, notice of violation, ongoing investigation |
| `recall` | FDA, CPSC, or state product recall |
| `civil_allegation` | Class action, plaintiff complaint, unresolved lawsuit |
| `contextual` | Background, self-reported data, narrative context |

Contextual items do not increment enforcement counts. Category tab totals are higher than unique incident counts because incidents can appear in multiple tabs.

---

## Source authority

Every source link is labeled:

- `GOV` — .gov domains and major regulatory agencies (DOJ, EPA, SEC, CARB, FDA, etc.)
- `SECONDARY` — Wikipedia, advocacy organizations, aggregators
- No label — primary press (NYT, Reuters, ProPublica, AP, etc.)

---

## Receipt and export

Every investigation generates a signed Ed25519 receipt including:
- Subject, disclaimer, investigated date
- Source URLs and source count
- Incident count and incidents hash
- Category summary
- Signature and verify URL

Structured JSON export available at `/api/profiles/:slug/export` — deduplicated incidents with action type, jurisdiction, amount, and source provenance.

Receipt counts:
- **Verified enforcement matters** — deduplicated Tier 1 canonical incidents
- **Category placements** — higher because incidents appear across multiple tabs
- **Sources indexed** — full source universe
- **Verified sources** — curated subset with direct links

---

## AI provider chain

Claude → Perplexity → Gemini → cached → emergency fallback

Perplexity and Gemini run in parallel on investigation text path. Provider failures return null and the chain continues.

---

## Project structure

```
client/
  src/
    components/       InvestigationCard, Timeline, DossierCard, TapOverlay,
                      InvestigationReceipt, AlternativesSidebar, PhotoCapture,
                      HireDirect*, Library, and more
    hooks/            useTapAnalysis — snap session state and async race management
    pages/            DirectoryPage, Library, VerifyReceiptPage, ReportPermalinkPage
    utils/            enforcementDisplay, enforcementActionType, sourceAuthorityTier,
                      consumerInvestigationCopy, incidentIndexCounts, investigationHealth
    services/         location, cityIdentity, travelTracker
    lib/              api, profileExportUrl, fetchProportionality
server/
  routes/             tap, profiles, library, barcode, workers, receipt, perimeter
  services/           investigation, deepResearchMerge, aiProvider, corroboration,
                      perimeterCheck, investigationReceipt, profileIncidentExport
  scripts/            deep_research_profile, corroborate_profiles, report_deep_research_sources,
                      resignDeepResearchReceipts
  db/                 migrations, import_all_profiles, corroborate_profiles
```

---

## Key endpoints

```
POST   /api/tap                              Identify brand from image tap
POST   /api/tap/investigation               Full investigation for resolved brand
GET    /api/profiles/index                  Browsable profile list (filter, sort, deep record flag)
GET    /api/profiles/:slug                  Full profile
GET    /api/profiles/:slug/export           Structured JSON export — deduplicated incidents
POST   /api/receipt/generate               Generate signed investigation receipt
GET    /verify/:receipt_id                 Verify receipt
POST   /api/workers                        Hire Direct worker registration
GET    /api/local                          Local alternatives by location
```

---

## Black Book

Browsable index of all 264 profiles at `/black-book`. Filter by:
- Entity type (Corporations / Institutions / Nonprofits)
- Concern category
- Deep Record — profiles with full research pass

---

## Hire Direct

Local worker marketplace built into the app. Workers register with a civic verification badge. Contact receipts are signed with Ed25519 for safety and accountability.

---

## Setup

```bash
# Clone
git clone https://github.com/Swixixle/ETHICAL_ALTERNATIVES.git
cd ETHICAL_ALTERNATIVES

# Server
cd server
cp .env.example .env
# Required: DATABASE_URL, ANTHROPIC_API_KEY
# Optional: PERPLEXITY_API_KEY, GEMINI_API_KEY
npm install
node index.js

# Client
cd client
npm install
npm run dev
```

**Production:** Client deploys as Render static site. Server deploys as Render web service. `render.yaml` routes `/api/*` to the server and `/*` to the SPA fallback.

---

## Running deep research

```bash
# Research a single profile
node server/scripts/deep_research_profile.mjs walmart

# Corroborate profiles
node server/db/corroborate_profiles.mjs --type database --batch-size 3

# Re-sign all deep research receipts (from repo root)
cd server && npm run db:resign:receipts:dry    # dry run
cd server && npm run db:resign:receipts        # apply
```

---

## License

See LICENSE. All findings link directly to primary sources. This is a record of public actions, not a legal finding. No inference of guilt or wrongdoing is made or implied.
