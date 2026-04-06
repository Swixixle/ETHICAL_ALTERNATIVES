# How EthicalAlt investigations work

This page describes how an investigation is built — from the moment you tap an object to the structured record you see in the app and what can be shared from it. It is not marketing. It is the epistemic record of the system as shipped in this repository.

If you believe an investigation contains an error, the correction process is described toward the end of this page.

**Related:** For how `share_risk_tier` is computed and enforced on the server (especially TikTok-oriented export), see [`SHARE_RISK_TIER_METHODOLOGY.md`](./SHARE_RISK_TIER_METHODOLOGY.md).

---

## What EthicalAlt is and is not

EthicalAlt is a tool for surfacing publicly available information about companies in a structured, graded format — with explicit confidence and corroboration signals.

It is not a law firm. It is not a regulator. It is not a news organization. It does not make legal findings. It does not guarantee accuracy.

It is a mirror. Clean businesses get a clean record here — publicly, with sources. Companies with documented issues get a documented record. The mirror does not editorialize.

---

## The seven-layer guardrail system

### Layer 1 — Source extraction

Database profiles for 90+ brands are hand-curated against primary sources before any AI is involved. Each factual claim in a DB profile should carry traceable sourcing — SEC filings, court documents, regulatory orders, or verifiable news citations. Strong claims without sources should not be treated as “verified record” in the UI sense.

When no DB profile exists, Claude performs live research using a structured web search tool — fetching real URLs during generation, not recalling training data. The model is pointed at current documents, not just parametric memory.

### Layer 2 — Vision identification with corroboration

When you tap an object, Claude Vision identifies the brand, corporate parent, confidence, and method — for example direct logo read, text label, product shape, or scene context inference.

The same image is simultaneously sent to Gemini Vision for an independent second opinion when that integration is keyed. Neither model sees the other’s answer first.

Brand names are normalized and compared using a scoring function in the API. Agreement is a gate, not an average — explicit disagreement is a penalty, not a blended midpoint.

The identification method is surfaced in the client. If the brand was resolved from context rather than a direct logo read, that should be visible in the identification payload and related UI.

### Layer 3 — Evidence grading

Every finding in every category is graded before it is presented using the app’s evidence-grade model (for example `established` through `alleged`).

**Stronger grades** — documented patterns with citations.

**Weaker grades** — limited or alleged material; AI-inferred or thinly sourced paths are not silently promoted to “established.” The distinction is carried in the investigation JSON and in the accordion UI.

Each of the six investigation categories (labor, environmental, political, legal, tax, product health) can carry its own evidence grade and corroboration flags after processing.

### Layer 4 — Three-track confidence scoring

Each category receives a confidence score calculated from three independent tracks.

**Track 1: Documentary anchor (50% weight)**

The documentary track is the only one that can push a category into the highest band based on source depth. Models do not replace court filings or agency dockets.

| Sources | Score |
|---------|-------|
| 0 sources | 0.30 |
| 1–2 sources | 0.55 |
| 3–5 sources | 0.72 |
| 6–10 sources | 0.85 |
| 10+ sources | 0.93 |
| Court or regulatory record | +0.08 bonus |
| DB profile exists | +0.05 bonus |

**Track 2: Model agreement (30% weight)**

A gate, not an average.

| Condition | Score |
|-----------|-------|
| Both models agree, both high confidence | 0.90 |
| Both models agree, mixed confidence | 0.72 |
| One model found nothing | 0.50 |
| Explicit disagreement, different brands | 0.25 |
| Only one model ran | 0.45 |

**Track 3: Cross-reference adjustment (20% weight)**

Adds or subtracts based on whether evidence sources reinforce each other.

| Condition | Adjustment |
|-----------|------------|
| Photo matches documented brand profile | +0.15 |
| Direct logo identification | +0.08 |
| Photo contradicts documented profile | −0.25 |
| No documentary support for this brand | −0.10 |

**Final score:** Combined, weighted, and clamped. Per-category scores are shown separately. One aggregate number hides too much.

### Layer 5 — Layer C corroboration

Weaker / inferred category paths are independently spot-checked against Perplexity with a web-search-capable model when that integration is keyed.

Categories are checked in parallel — total added latency is dominated by the slowest check, not the sum of every category.

If corroboration cannot support a path, the UI should show that outcome — including flags like `*_corroboration_flag` on the investigation object — rather than presenting the claim as fully verified documentary record.

### Layer 6 — Structured output (the “receipt” today)

Completed investigations are **normalized on the server**: consistent fields, a `brand_slug`, concern flags, `profile_type`, `share_risk_tier`, per-category summaries, sources arrays, evidence grades, confidence fields, and timestamps.

This is the practical audit trail today: a JSON shape you can inspect in network tools and reason about — not a proprietary black box.

**Cryptographic signing** of that payload (for example Ed25519 over a canonical JSON representation) is explicitly **not** claimed here; it remains roadmap “receipt hardening” in the main README. Do not read marketing copy on other branches as a guarantee about this checkout unless the code paths exist here.

### Layer 7 — Share and distribution gates

Before share bundles are produced:

- A **`share_risk_tier`** (`low` | `medium` | `high`) is computed **only on the server** and recomputed on share endpoints. The client cannot override it.
- **High** tier blocks TikTok-oriented export on `POST /api/share-card` when `share_channel: "tiktok"` — see the methodology doc for the exact rules.
- **Medium** tier can include additional copy in the bundle reminding users to verify primary sources before acting.
- **Images are rejected** if a client tries to post photo bytes into share endpoints — those routes are text / investigation JSON only.
- The user’s original photograph is **not** part of the share payload returned by the API. The share card summarizes public-record claims.

---

## What the investigation and share bundle contain (high level)

Investigations returned to the client typically include identifiers (`brand`, parent, `brand_slug`), narrative summaries and structured fields per category (`tax_summary`, `legal_summary`, etc.), source URL arrays, `verdict_tags` and flag lists, timeline entries, overall concern level, overall investigation confidence when computed, per-category evidence grades, corroboration flags when present, and **`share_risk_tier`**.

A `POST /api/share-card` response adds human-facing **share texts**, regulator / press / institutional checklist metadata, a **`card_data`** object (headline, concern level, top tags, optional pull quote), a **`disclaimer`** string, and flags such as **`tiktok_export_blocked`** when tier is high.

That combination is what you are amplifying when you copy a caption or open a complaint form — not a court judgment, and not a guarantee that every sentence is true.

---

## Challenging or correcting an investigation

If you believe an investigation contains a factual error:

1. Note the brand and the **exact** field or sentence.
2. Gather **primary** sources that support your correction (URLs to filings, orders, or other first-party documents).
3. Contact **hello@ethicalalt.com** (unless the deployed app shows a different contact string), or open an issue in the **EthicalAlt** GitHub repository with the same detail.

Today this path is **manual** — it exists so complaints are not ignored, not because every step is already a polished ticketing product.

If you are counsel for a named company, use the repository contact paths rather than social DMs.

This process exists because the system can be wrong. Corroboration reduces error rates; it does not eliminate them.

---

## What this system does not claim

- It does not claim that any investigation is complete or current.
- It does not claim that an AI-generated finding is equivalent to a regulatory determination or court finding.
- It does not claim that the absence of documented violations means a company has no violations — only that none were found in the sources available to the pipeline in that session.
- It does not claim that a confidence score of 88% means the finding is “88% true” — it means the evidence supporting it is strong **relative to the scoring model**.

The system is designed to make its own uncertainty visible. That is the point.

---

*EthicalAlt — Nikodemus Systems, Indianapolis.*

*Procedural Trust Infrastructure: if something happened, it should be verifiable. If something is claimed, there should be a receipt.*
