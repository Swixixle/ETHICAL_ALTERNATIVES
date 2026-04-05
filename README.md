<div align="center">

# ETHICALALT

**Photograph anything. Tap any object. Get the full corporate record.**

[![Live](https://img.shields.io/badge/Live-ethicalalt--client.onrender.com-D4A017?style=flat-square&labelColor=0A1F3D)](https://ethicalalt-client.onrender.com)
[![Profiles](https://img.shields.io/badge/Profiles-92%2B_companies-A8C4D8?style=flat-square&labelColor=0A1F3D)](#investigation-database)
[![License](https://img.shields.io/badge/License-MIT-6A8A9A?style=flat-square&labelColor=0A1F3D)](LICENSE)

</div>

---

## What It Does

EthicalAlt is a mobile-first investigative shopping lens. You photograph your environment — a store shelf, a logo on a cup, a brand on someone's shirt — tap any object, and receive two things:

**The record.** A full corporate investigation sourced to public primary documents: EPA enforcement actions, DOJ settlements, NLRB complaints, FEC filings, SEC EDGAR, OSHA violations, congressional testimony. Tax exposure, legal history, labor violations, environmental penalties, political spend, documented health impacts, and the executives who run it.

**The alternatives.** Independent local businesses near you, CSA farms, Etsy sellers, and secondhand options matched to what you actually tapped. Not generic alternatives — the closest independent equivalent.

No barcode required. Any photograph of anything.

---

## Flow

```
PHOTOGRAPH → TAP → INVESTIGATE → ACT
```

1. **Photograph** your surroundings. No barcode, no specific framing.

2. **Tap** any object. Claude Vision identifies it with maximum precision — brand, parent company, product category.

3. **Investigate** — the card loads:
   - Five-state confidence badge: `VERIFIED RECORD` (from indexed database) down to `NO PUBLIC RECORD`
   - Generated headline from documented facts
   - Verdict tags sourced to primary records
   - Collapsible sections: Tax · Legal · Labor · Environmental · Political · Executives · Connections · Allegations · Health Record
   - Cost absorption breakdown: who benefited, who paid, the gap
   - Timeline of documented events
   - Sources ledger with provenance

4. **Act:**
   - **Find local alternatives** — OSM-sourced independents, Etsy sellers, CSA farms near you
   - **Share to regulators** — FTC, SEC, NLRB, EPA, DOL, OSHA, FDA, plus your state AG
   - **Share to press** — pre-mapped journalists who cover that company
   - **Share to institutional actors** — ESG raters, pension funds, union locals, investor relations
   - **Register as a civic witness** — opt-in public attestation that you reviewed this record

---

## Investigation Database

92+ company profiles across 10 sectors. Every profile built from public primary records.

| Sector | Coverage |
|--------|----------|
| Consumer Goods | Coca-Cola, Nike, H&M, Nestlé, Shein, P&G, Unilever, LVMH, Philip Morris, Altria, Starbucks, McDonald's, Amazon, Apple |
| Finance | Goldman Sachs, JPMorgan Chase, Wells Fargo, Bank of America, Koch Industries |
| Energy | ExxonMobil, Chevron, Shell, BP, Koch Industries |
| Healthcare | UnitedHealth, HCA, Cigna, CVS Health, McKesson, DaVita, Steward, Tenet, Ascension, Cardinal Health |
| Pharma | Pfizer, Merck, Eli Lilly, Bayer/Monsanto |
| Tech | Meta, Google, Microsoft, Tesla, Samsung, TikTok/ByteDance |
| Streaming & social | Disney, LinkedIn, Netflix, Pinterest, Reddit, Snapchat, Spotify, Twitch, X (Twitter), YouTube |
| Retail | Walmart, Target, Kroger, Dollar General |
| Auto | Toyota, General Motors, Ford |
| Gambling | MGM Resorts, Caesars Entertainment, DraftKings, FanDuel, Las Vegas Sands, Penn Entertainment |
| Sweepstakes Casinos | VGW/Chumba Casino, High 5 Games, Stake.us, Pulsz, sector overview |
| Food/Agri | Tyson Foods, Cargill, Kraft Heinz, Mars, PepsiCo, Sysco |
| Telecom | Comcast, AT&T, Verizon |
| Positive profiles | Patagonia, REI, Ben & Jerry's, Cotopaxi, Eileen Fisher |

**Sources queried per profile:**

| Source | Data |
|--------|------|
| [EPA ECHO](https://echo.epa.gov) | Environmental violations, penalties |
| [DOJ Press Releases](https://www.justice.gov/news) | Criminal charges, settlements |
| [FEC API](https://api.open.fec.gov) | Political donations, PAC activity |
| [CourtListener](https://www.courtlistener.com) | Federal court cases |
| [NLRB Case DB](https://www.nlrb.gov) | Labor dispute cases |
| [OSHA](https://www.osha.gov) | Worker safety violations |
| [SEC EDGAR](https://www.sec.gov/edgar) | Corporate filings |
| [Senate LDA](https://lda.senate.gov) | Lobbying disclosures |
| [OpenSecrets](https://www.opensecrets.org) | Lobbying expenditures |

---

## Civic Witness Registry

When sharing an investigation, users can opt in to add their name to a public ledger:

> *"I have reviewed this documented investigation and choose to be on record as having seen it."*

This is not a legal filing. It is a public attestation — a ledger of named people who have documented their review of corporate conduct. The registry is public at `/witnesses`, sortable by witness count per company, and shareable as a press-ready record.

Rate limited. Abuse controlled. Legal notice on every surface.

---

## Share System

Every investigation card routes to:

- **Press** — journalists pre-mapped to each company by beat (ProPublica, The Markup, STAT News, ICIJ, The Guardian, Reuters, and 30+ others)
- **Federal regulators** — FTC, SEC, IRS, NLRB, DOL, OSHA, EPA, FDA
- **State AG** — geolocated to the user's state, all 50 mapped
- **Institutional** — MSCI ESG, Sustainalytics, CDP, ISS, CalPERS, TIAA, NYC Pension Funds
- **Labor** — UFCW, UAW, CWA, SEIU, AFL-CIO, mapped by brand category
- **Investor Relations** — direct IR contact for 16 major companies

---

## Hire Direct *(in development)*

Post-investigation, users can connect with local workers who do what the corporation does — directly, at their own rates, keeping everything they earn.

Someone reads a DoorDash investigation. The card surfaces local independent couriers near them. One tap. Direct contact. No platform cut.

Worker profiles include a **Corporate Alternatives** section: which companies they left, when, and why. Civic Verified badge for workers with 2+ witness attestations.

Zero platform fee. No ratings at MVP. Trust through transparency and civic attestation.

---

## Stack

```
Client          React · Vite · PWA
Server          Node.js · Express
Database        PostgreSQL (Render)
Queue           BullMQ · Redis
Vision          Claude Vision (Anthropic)
Investigation   Claude Sonnet
Local data      OpenStreetMap Overpass API
Sellers         Etsy API
```

---

## Running Locally

```bash
git clone https://github.com/Swixixle/ETHICAL_ALTERNATIVES
cd ETHICAL_ALTERNATIVES

# Server
cd server
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY, DATABASE_URL
npm run dev

# Client
cd ../client
npm install
npm run dev
```

The app runs at `localhost:5173`. Server at `localhost:3001`.

For the full investigation pipeline you need an Anthropic API key. For local business data, the OSM Overpass API requires no key.

---

## Architecture Notes

**Profile lookup:** Incoming brand slugs query `incumbent_profiles` first. If a profile exists with more than 5,000 characters, it returns immediately as `VERIFIED RECORD`. If the profile is a stub (under 5,000 chars) or missing, the live investigation pipeline runs, the result is upserted back to the database, and the upgraded profile is returned — the database self-heals on first access.

**Confidence system:** Five states driven by source depth and profile origin. `VERIFIED RECORD` requires `profile_type = 'database'` with a full indexed profile. Realtime investigation results are capped at `PARTIAL RECORD` regardless of source count.

**Share routing:** State AG URLs are mapped for all 50 states. ESG rater and pension fund contacts are static. Union routing uses a brand slug → union category map. Press routing uses a per-company journalist mapping built from documented beat coverage.

---

## Contributing

**Profiles** — each profile is a JSON document in `server/db/profiles_v*/`. If you have documented primary-source information that updates or adds to an existing profile, open a PR. Every claim requires a source URL to a primary document (EPA, DOJ, NLRB, FEC, SEC, OSHA).

**Local business exclusions** — the OSM layer filters known chains. If a chain is missing from the exclusion list, open an issue.

**Bug reports** — open an issue with the brand you tapped, what was expected, and what happened.

---

## Built By

Alex Maksimovich · Indianapolis · [Nikodemus Systems](https://github.com/Swixixle)

Self-taught. Respiratory therapist background. AI-assisted development: Claude for architecture, Cursor for implementation.

> *If something happened, it should be verifiable. If something is claimed, there should be a receipt.*
