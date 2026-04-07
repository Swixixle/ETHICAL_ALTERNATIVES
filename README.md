# EthicalAlt

**Point your camera at anything. Tap the brand. Get the record.**

Live at [ethicalalt-client.onrender.com](https://ethicalalt-client.onrender.com)

---

EthicalAlt is a mobile-first web app that turns your camera into an investigation. Point it at a product on a shelf, a storefront, a logo on a truck — tap the brand — and receive a structured record of that company's documented history across six categories: environmental violations, labor practices, political spending, legal settlements, tax structure, and product health.

Then find something better nearby.

---

## How it works

```
Point camera → Tap brand → See the record → Find the alternative
```

1. **Point** — open the camera, aim at any product or scene
2. **Tap** — touch any brand in the frame
3. **Identify** — Claude Vision resolves the brand and corporate parent; Gemini Vision independently corroborates with a weighted confidence score
4. **Investigate** — structured profile loads across six categories with sourced findings and evidence grades
5. **Act** — verified independent alternatives surface from Etsy, local sellers, and nearby businesses

---

## The record

Every investigation produces a structured record across six categories:

| Category | What it covers |
|---|---|
| **Environmental** | EPA enforcement, spills, emissions violations, cleanup costs |
| **Labor** | OSHA violations, wage theft, union suppression, worker safety |
| **Legal** | Criminal convictions, civil settlements, regulatory actions |
| **Political** | Lobbying spend, PAC donations, revolving door hires |
| **Tax** | Effective rate vs statutory rate, offshore entities, subsidies |
| **Product Health** | Documented harms, recalls, ingredient concerns |

Each category gets an evidence grade — `established`, `strong`, `documented`, `alleged` — based on source quality and model corroboration. Nothing is presented as fact without a source.

---

## The Black Book

94 pre-investigated profiles across corporations, religious institutions, and nonprofits — available without a camera tap at `/library`.

Filter by type. Read the record. Find the alternative.

The Black Book covers organizations including ExxonMobil, Purdue Pharma, Volkswagen, Goldman Sachs, the Roman Catholic Church, the Southern Baptist Convention, the LDS Church, the Boy Scouts of America, Goodwill Industries, the NRA, and dozens more — each with sourced timelines, board member records, allegation responses, and documented community impact.

---

## Neutral by design

EthicalAlt is a mirror. It finds what it finds.

A business with a clean record gets a clean record — sourced, scored, and displayed with the same rigor as a heavy file. A 55-year independent press with no documented violations, family owned, four primary sources: that is the finding, and that is what gets published.

For honest independent businesses that is not a liability. It is free verified documentation that no marketing budget can replicate.

EthicalAlt is not a law firm. It is not a regulator. It is not a news organization. It does not editorialize. The mirror reflects what the documented record contains.

---

## Technical overview

**Stack:** React 19 + Vite (client) / Node.js + Express (server) / PostgreSQL (profiles)

**AI pipeline:**
- Vision: Claude Vision primary, Gemini Vision failover
- Investigation: Claude multi-turn with web search, Perplexity + Gemini fallback chain
- Confidence: three-track weighted scoring (documentary 0.5, model agreement 0.3, cross-reference 0.2), clamped 0.15–0.97

**Data:**
- 94 pre-investigated profiles in PostgreSQL with `profile_json` JSONB
- 41 board member records across 8 institutions
- Allegation response standard applied across all profiles per documented research algorithm
- Alternatives sourced from Etsy API, OpenStreetMap/Overpass, local seller registry

**Rate limiting:** 5 investigations per IP per 24 hours. No account required.

**Privacy:** Location is used only to find nearby independents. Never stored. Never sold.

---

## Research standard

Every profile follows the documented research algorithm at [`RESEARCH_ALGORITHM.md`](./RESEARCH_ALGORITHM.md).

Core principle: if something happened, it should be verifiable. If something is claimed, there should be a receipt.

Every allegation section explicitly states the organization's documented response — or states that no formal response has been documented. Absence of evidence is stated explicitly, never silently omitted.

---

## Local development

```bash
# Install
npm install
cd client && npm install

# Environment — copy and fill in keys
cp .env.example .env

# Run
npm run dev          # server on :3001
cd client && npm run dev   # client on :5173
```

**Required env vars:**
```
ANTHROPIC_API_KEY=
DATABASE_URL=        # optional — degrades gracefully without it
```

**Optional:**
```
GEMINI_API_KEY=      # vision failover + investigation fallback
PERPLEXITY_API_KEY=  # Layer C corroboration
ETSY_API_KEY=        # Etsy alternatives
```

---

## Status

Functional MVP. Pre-user acquisition phase.

- Camera tap → investigation pipeline: operational
- Black Book (94 profiles): operational
- Local independents feed: operational
- City narrative on load: operational
- Rate limiting: operational
- Civic features (witness registry, worker profiles): built, currently parked

---

> *Clean businesses get a clean record here. Companies with documented issues get a documented record. The mirror does not editorialize.*
