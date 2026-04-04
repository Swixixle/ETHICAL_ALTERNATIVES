<div align="center">

# ETHICALALT

**Tap anything. Know everything. Find the independent version.**

[Live App](#) · [Investigation Database](#investigation-database) · [Chain Exclusion List](#chain-exclusion-list) · [Add Your Shop](#add-your-shop)

---

*Photo → Tap → Corporate investigation → Real independent alternatives*

</div>

---



---

## What This Is

EthicalAlt is a visual ethical shopping lens. You photograph your surroundings — a party, a hotel lobby, a store, a street corner — tap any object in the photo, and receive two things:

**The record.** Everything documented in the public record about the company behind what you tapped. Tax strategies, court cases, corruption charges, labor violations, environmental enforcement actions, health implications, executive ownership web. Sourced to primary documents.

**The alternatives.** Real independent sellers matched to what you actually tapped. If it's a Levi's 501 in raw indigo, we find you the closest ethical equivalent at that specification level — not just "some jeans." Independent shops near you on a map. Global fair trade artisans. Worker-owned alternatives. Pre-populated secondhand searches.

No barcode required. No product in hand. Any photograph of anything.

---

## The Problem

Every tool that tried this before — Buycott (2012, peaked at 1M users, died 2016) — was limited to barcode scanning. You could not scan a storefront, clothing someone was wearing, a photo from last week, or anything handmade. The entire barcode-era ethical shopping space was frozen at the checkout counter.

Google Lens and Amazon Lens solved visual identification and immediately used it to route you back to Amazon and corporate commerce. The technology exists. The ethical application of it didn't.

EthicalAlt is the visual identification layer pointed in the opposite direction.

---

## How It Works

```
SNAP → TAP → KNOW → FIND
```

1. **SNAP** — photograph anything. No barcode. No specific framing. Any photo.

2. **TAP** — tap any object. The app attempts maximum-precision identification:
   not just "jeans" but "Levi's 501, straight fit, raw indigo." Not just "coffee"
   but "Starbucks Pike Place, paper cup with plastic lid."

3. **KNOW** — the investigation card fires:
   - Corporate parent chain (brand → parent → conglomerate)
   - Tax record (effective rate, offshore structures, government subsidies)
   - Legal record (court cases, settlements, criminal charges)
   - Labor record (OSHA violations, wage theft, union suppression)
   - Environmental record (EPA enforcement, penalties)
   - Political (lobbying spend, PAC donations, revolving door)
   - Product health (category-specific implications)
   - Executive ownership web (other businesses, documented concerns)

4. **FIND** — alternatives grid, ordered by proximity:
   - 📍 Near you (OSM Overpass + GPS, chain-filtered)
   - 🏙️ Nearest city ring (50mi radius from your nearest major city)
   - 📦 Ships to you (Etsy indie sellers, geocoded)
   - 🌍 Global artisans (NOVICA, WFTO verified, fair trade)
   - ♻️ Secondhand (pre-populated Depop, Vinted, Poshmark searches)

---

## Investigation Database

35+ corporate profiles built from public records. Every claim has a primary source URL.

Sources queried per profile:
| Source | Data |
|--------|------|
| [EPA ECHO](https://echo.epa.gov) | Environmental violations, penalties |
| [FEC API](https://api.open.fec.gov) | Political donations, PAC activity |
| [CourtListener](https://www.courtlistener.com) | Federal court cases |
| [OSHA Data](https://www.osha.gov/pls/imis/establishment.html) | Worker safety violations |
| [DOL WHISARD](https://www.dol.gov/agencies/whd/data) | Wage theft cases |
| [NLRB Case DB](https://www.nlrb.gov/cases-decisions) | Labor dispute cases |
| [OpenSecrets](https://www.opensecrets.org) | Lobbying expenditures |
| [SEC EDGAR](https://www.sec.gov/edgar) | Corporate filings |
| [Good On You](https://goodonyou.eco) | Fashion brand ethics ratings |
| [ProPublica Nonprofit Explorer](https://projects.propublica.org/nonprofits/) | IRS 990s |

Volume 1 (16 profiles): Starbucks, Nike, H&M, Apple, Amazon, Nestlé, Shein,
Philip Morris, Altria, Coca-Cola, McDonald's, P&G, Unilever, Gap, J&J, LVMH

Volume 2 (20 profiles): ExxonMobil, Tyson Foods, Bayer/Monsanto, PepsiCo,
Meta, Google, Microsoft, Tesla, Reynolds American, Kraft Heinz, Mars,
PVH Corp, Dollar General, Target, Sysco + 5 positive profiles
(Ben & Jerry's, Patagonia, REI, Cotopaxi, Eileen Fisher)

[→ See all profiles](server/db/profiles_v1/) · [→ Contribute a profile](#contributing)

---

## Chain Exclusion List

The local business layer (OpenStreetMap) excludes known chains.
This list is open source and maintained by the community.

[→ server/data/chain-exclusions.json](server/data/chain-exclusions.json)

Submit additions via pull request. See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

---

## Architecture

```
Client (React PWA → React Native + Expo)
    │
    └─ POST /api/tap { image_base64, tap_x, tap_y, user_lat, user_lng }
         │
    ┌────▼────────────────────────────────────────┐
    │            API GATEWAY (Express)            │
    │         Auth · Rate Limiting · Sessions     │
    └────┬────────────────────────┬───────────────┘
         │                        │
    ┌────▼────────┐     ┌─────────▼──────────────┐
    │   VISION    │     │   SEARCH ORCHESTRATOR  │
    │   Claude    │     │   Parallel fan-out     │
    │   Sonnet    │     │   Result normalization │
    │   Object ID │     │   Chain exclusion      │
    │   Exact spec│     │   Ethics scoring       │
    └────┬────────┘     └─────────┬──────────────┘
         │                        │
    ┌────▼────────────────────────▼──────────────┐
    │              DATA LAYER                    │
    ├──────────────┬──────────────┬──────────────┤
    │  Etsy API v3 │ OSM Overpass │  Postgres    │
    │  Visual Index│ Chain Excl.  │  pgvector    │
    │  Ximilar /   │  Nominatim   │  Profiles DB │
    │  Imagga      │  GeoNames    │  Hobbyist DB │
    └──────────────┴──────────────┴──────────────┘
```

**Stack:**
- Backend: Node.js / Express
- Database: PostgreSQL + pgvector extension
- Queue: BullMQ / Redis
- Vision: Claude Sonnet (`claude-sonnet-4-6`)
- Visual similarity: Ximilar (fashion) + Imagga (general)
- Geocoding: Nominatim (OSM, free)
- Local discovery: OpenStreetMap Overpass API (free)
- Deploy: Render
- Mobile (v1): React Native + Expo

---

## Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Redis
- API keys: Anthropic, Etsy

### Setup

```bash
# Clone
git clone https://github.com/Swixixle/ethicalalt.git
cd ethicalalt

# Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Environment
cp server/.env.example server/.env
# Edit server/.env — add ANTHROPIC_API_KEY and ETSY_API_KEY

# Database
psql "$DATABASE_URL" -f server/db/schema.sql
cd server && npm run db:import:v1 && npm run db:import:v2

# Start
npm run dev
```

Open `http://localhost:5173`

### Environment Variables

```env
# Required
ANTHROPIC_API_KEY=        # console.anthropic.com
ETSY_API_KEY=             # developer.etsy.com

# Optional (enables full features)
DATABASE_URL=             # PostgreSQL connection string
REDIS_URL=                # Redis connection string
CORS_ORIGIN=              # Production frontend URL
```

---

## Add Your Shop

Independent maker? Local artisan? Worker-owned business?

EthicalAlt surfaces independent sellers to users who are looking for exactly what you make.
Listing is free during beta.

[→ Submit your listing](.github/ISSUE_TEMPLATE/seller_listing.md)

We verify every submission. Listing is free. Requirements:
- Independent — no corporate parent,
- Makes or sources what you sell
- Has a way for people to buy from you (Etsy, website, Instagram, farmers market)

---

## Contributing

Contributions welcome in three areas:

**1. Investigation profiles** — research and submit a corporate profile
for a brand not yet in the database. [Template](.github/ISSUE_TEMPLATE/investigation_profile.md)

**2. Chain exclusion list** — add chains missing from the local business filter.
[→ chain-exclusions.json](server/data/chain-exclusions.json)
Submit a PR with additions. One chain per line. Lowercase. Global or country-scoped.

**3. Code** — see [CONTRIBUTING.md](.github/CONTRIBUTING.md)



---

## License

MIT for the application code.

Investigation profile data is sourced from public records and is freely usable
with attribution. See [LICENSE](LICENSE).

---

<div align="center">

*Nikodemus Systems · Indianapolis · 2026*

</div>
