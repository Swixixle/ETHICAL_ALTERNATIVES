# Architecture

EthicalAlt is a Node.js / React application with a PostgreSQL backend,
BullMQ job queue, and Claude Vision as the identification engine.

---

## Request Flow

```
User taps image at (x%, y%)
        │
        ▼
POST /api/tap
{
  image_base64: string,
  tap_x: number,        // 0.0–1.0
  tap_y: number,        // 0.0–1.0
  user_lat: number|null,
  user_lng: number|null,
  session_id: string
}
        │
        ▼
┌───────────────────────────────┐
│         VISION PIPELINE       │
│  Claude Sonnet vision call    │
│  Returns:                     │
│  - object (plain name)        │
│  - brand (if identifiable)    │
│  - product_line (if visible)  │
│  - specifications (cut,       │
│    material, color, etc.)     │
│  - corporate_parent           │
│  - category                   │
│  - search_keywords            │
│  - confidence (0–1)           │
│  - health_flag (bool)         │
│  ~1.5–3 seconds               │
└───────────────┬───────────────┘
                │
                ▼ (parallel fan-out — all start simultaneously)
┌───────┬───────┬───────┬──────────────┐
│ Etsy  │  OSM  │  DB   │  Visual      │
│ API   │ Over- │ Look  │  Similarity  │
│ v3    │  pass │  up   │  (pgvector)  │
│ ~0.8s │ ~0.6s │ ~0.1s │  ~0.2s      │
└───────┴───────┴───────┴──────────────┘
                │
                ▼
┌───────────────────────────────┐
│       RESULT ASSEMBLER        │
│  Merge, dedupe, rank          │
│  Apply chain exclusion        │
│  Attach investigation profile │
│  Build secondhand URLs        │
│  Build "we searched" block    │
└───────────────┬───────────────┘
                │
                ▼
Response: { identification, investigation, alternatives,
            secondhand_links, searched_sources, empty_sources }
```

---

## Database

PostgreSQL with pgvector extension.

**Key tables:**

| Table | Purpose |
|-------|---------|
| `incumbent_profiles` | Corporate investigation profiles (35+ companies) |
| `brand_aliases` | Maps brand names to incumbent slugs (Marlboro → philip-morris) |
| `brands` | Curated indie brand registry |
| `artisans` | Global fair trade artisans (NOVICA, WFTO, etc.) |
| `hobbyists` | Local maker self-submissions |
| `etsy_visual_index` | Etsy listing embeddings for visual similarity |
| `chain_exclusions` | Chains filtered from OSM local results |
| `sessions` | Anonymous session tracking |
| `tap_events` | Analytics (no PII) |

---

## Geolocation

Two-radius model:

```
User GPS
   ├─ Radius 1: 25km — OSM Overpass (immediate local)
   └─ Nearest major city
         └─ Radius 2: 50km — OSM Overpass (city ring)

Both queries run in parallel.
Results are chain-filtered and deduped.
```

City resolution uses a static GeoNames dataset (cities > 50K population)
bundled with the server. At session start, nearest city to user GPS is
computed and cached for the session.

---

## Visual Similarity

For fashion and home goods, results include visually similar Etsy listings.

```
User image → Claude Vision → style attributes
                                    │
                                    ▼
                         pgvector similarity query
                         against etsy_visual_index
                                    │
                                    ▼
                         Merge with keyword results
                         Filter by shop independence
                         Return top 10
```

The etsy_visual_index is built by a BullMQ background job:
- Fetches active Etsy listings in priority categories
- Sends listing images to Ximilar (fashion) or Imagga (general)
- Stores 512-dimension embeddings in pgvector

---

## Investigation Engine

```
getInvestigationProfile(brand, parent, options)
   │
   ├─ Check brand_aliases table (Marlboro → philip-morris)
   │
   ├─ Query incumbent_profiles by brand_slug
   │    └─ If found: return database profile (fast, verified)
   │
   └─ If not found: Claude web search
        - Query: "[brand] legal violations lawsuit settlement tax OSHA EPA"
        - Normalize response to investigation shape
        - Mark as profile_type: 'realtime_search'
        - Return (slower, less verified — labeled in UI)
```

---

## Tone Architecture

Every investigation response is:
- **Factual** — describes what records say
- **Sourced** — primary source URL on every claim
- **Neutral** — "the company settled X for $Y" not "the company is corrupt"
- **Complete** — coverage gaps are labeled, not hidden

The UI shows:
- `profile_type: 'database'` — verified, maintained profile
- `profile_type: 'realtime_search'` — live research, verify sources
- `profile_type: 'limited'` — insufficient public data found
