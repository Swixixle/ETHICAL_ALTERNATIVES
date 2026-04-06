# Share risk tier methodology

**Audience:** Legal, compliance, and platform trust-and-safety reviewers.  
**Scope:** How EthicalAlt assigns `share_risk_tier` (`low` | `medium` | `high`) to an investigation record for **server-side** control of short-form social export (TikTok).  
**Last updated:** April 2026  

For the full user-facing methodology (layers, scoring mindset, disputes), see [`HOW_INVESTIGATIONS_WORK.md`](./HOW_INVESTIGATIONS_WORK.md).

## Purpose

`share_risk_tier` is computed **only on the server** (see `server/services/shareRiskTier.js`). It is attached to normalized investigations in `finalizeInvestigation()` and recomputed on every `POST /api/share-card` request. The client cannot override it.

The tier exists so the product can **automatically block** TikTok-oriented export when an automated assessment indicates elevated defamation, misinformation, or viral-amplification risk, while still allowing in-app review of primary sources.

## Outputs

| Tier   | Meaning (for enforcement) |
|--------|---------------------------|
| `low`  | Default share bundle; TikTok caption path allowed. |
| `medium` | Share bundle allowed; user-facing copy includes an extra “verify before acting” line. |
| `high` | **TikTok export blocked**: `POST /api/share-card` with `share_channel: "tiktok"` returns `blocked: true` before any share card payload is built. The standard bundle response still sets `tiktok_export_blocked: true` so the client can hide TikTok actions. |

## Inputs (all from investigation JSON)

1. **Verdict tags** (`verdict_tags`) — e.g. structured labels such as `child_labor`, `criminal_charges`.  
2. **Category text** — `executive_summary`, `investigation_summary`, `tax_summary`, `legal_summary`, `labor_summary`, `environmental_summary`, `political_summary`, `product_health` (string), plus `timeline[].event` strings.  
3. **Overall concern** — `overall_concern_level` (`significant` | `moderate` | `minor` | `clean`).  
4. **Model confidence** — `overall_investigation_confidence` (0–100), when present.  
5. **Per-category evidence grades** — `tax_evidence_grade`, `legal_evidence_grade`, etc., each an object with `level` (`established` … `alleged`).  
6. **Corroboration flags** — `tax_corroboration_flag`, etc., set when Layer C corroboration marks a category as below threshold.

## Rules (deterministic)

### Always `high` if any of:

- **High-risk lexical match:** A fixed list of phrases appears in the concatenated category text (e.g. child labor, human trafficking, criminal conviction language, bribery, cartel, money laundering). The list is conservative and public in code.  
- **High-risk verdict tag:** Any tag in a fixed allowlist (e.g. `child_labor`, `forced_labor_risk`, `rico_conviction`, `criminal_charges`, `sanctions_violations`, `bribery`).  
- **Severity + low confidence:** `overall_concern_level === "significant"` **and** `overall_investigation_confidence < 60` (when confidence is present).  
- **Weak corroboration breadth:** Three or more categories are either flagged with `*_corroboration_flag === true` **or** have evidence grade level `alleged`.

### Else `medium` if any of:

- `overall_concern_level === "significant"`, **or**
- `overall_investigation_confidence < 55` (when present), **or**
- At least one category is `alleged` / corroboration-flagged.

### Else `low`

## Enforcement points

1. **`POST /api/share-card`** and **`POST /api/share-export`**  
   - Reject bodies that include image / capture fields (`photo_payload_rejected`).  
   - Never return binary image data; responses include `photo_included: false`.  
   - **Share-card:** TikTok-specific block when `share_channel === "tiktok"` and tier is `high`.  
   - **Share-export:** the only channel blocked at high tier is `channel: "tiktok"`; `instagram`, `facebook`, `x`, `email`, `image_download`, and `copy_caption` still receive text payloads with the standard disclaimer.  
   - Successful requests log a row to `impact_shares` (slug, channel, tier, `was_blocked`). Blocked TikTok attempts log `was_blocked = true`.

2. **Client**  
   - Hides TikTok checklist actions when `tiktok_export_blocked` is true. The server gate remains authoritative if the client is bypassed.

## Limitations (explicit)

- Tiers are **heuristics**, not legal conclusions. They do not assert valid truth or falsity of any allegation.  
- **`medium` and `low` are not “safe”** — users always receive disclaimers that content is AI-assisted summaries of public material requiring primary-source verification.  
- **No user identifiers** are stored in `impact_shares`; the table is for aggregate audit and product accountability only.

## Change control

Any change to keyword lists, tag lists, numeric thresholds, or enforcement behavior should be treated as a **risk-bearing product change** and reviewed accordingly. The implementation source of truth is `server/services/shareRiskTier.js` and `server/routes/shareCard.js`.
