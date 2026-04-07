# EthicalAlt profile research standard

This document defines how EthicalAlt profiles are researched, written, and verified. It is procedural trust infrastructure: **if something happened it should be verifiable; if something is claimed there should be a receipt.**

---

## Core principle: procedural trust infrastructure

Research and profile text are built so that:

- **Verifiable events** tie to identifiable records (filings, court documents, audited statements, government reports, contemporaneous journalism with traceable provenance).
- **Claims** carry receipts: citations, quotes with sources, or explicit classification as allegation vs. established fact.
- **Absence of evidence** is stated explicitly where the standard requires it, not implied by silence.

The profile is not a verdict machine; it is a structured disclosure of what the record shows, what is disputed, and what remains unknown.

---

## Research sequence

Work proceeds in this order. Later sections may refine earlier ones; do not publish until the verification check passes.

1. **Identity and structure** — Legal name(s), governance, parent or sovereign body, key subsidiaries or affiliates, geography, and what “the organization” means in practice for accountability.
2. **Financial footprint** — Revenue scale, major funding types, pay practices where relevant, material disclosures (e.g., Form 990, annual reports), and notable financial controversies with sources.
3. **Legal record** — Material litigation, settlements, regulatory actions, criminal matters, and structural features (e.g., bankruptcy, sovereign or charitable immunity) that affect liability or transparency.
4. **Documented patterns** — Recurring behaviors evidenced across multiple independent sources (not one-off anecdotes framed as systemic without support).
5. **Allegations and response** — Credible allegations that remain contested or unadjudicated, plus **documented organizational responses** where they exist (see [Allegation response standard](#allegation-response-standard)).
6. **Community impact** — Harms and benefits that affect workers, beneficiaries, or the public, with proportionate sourcing.
7. **Verification check** — Cross-review: every strong claim has a receipt; every required field is either populated or has an explicit no-data statement; allegations section meets the response-type rule; gap section is complete where applicable.

---

## Allegation response standard

The `allegations.summary` field addresses allegations that are **documented in credible sources** but **not necessarily adjudicated**. It must close with a single explicit classification from this list:

| Type | Name | When to use |
|------|------|----------------|
| **Type 1** | Documented denial or dispute | The organization (or its authorized spokespeople) **on the record** denied, disputed, or rebutted the allegations in a way that can be tied to a source (statement, filing, interview, official site). |
| **Type 2** | Documented acknowledgment | The organization **on the record** acknowledged wrongdoing, harm, failure, or the need for reform—partial or full—or confirmed specific facts critics raised. |
| **Type 3** | No documented response found | After good-faith search of primary and secondary credible sources, **no** formal or clearly attributable public response to **these specific allegations** was located. |

**Rule:** Every `allegations.summary` must end with one of these three types **explicitly**, using the canonical closing form:

`EthicalAlt allegation response type: Type N — [documented denial or dispute | documented acknowledgment | no documented response found].`

Substitute `N` with `1`, `2`, or `3` to match the table.

Do not imply Type 3 if the organization has issued a documented response; do not use Type 1 or 2 without a receipt (who said what, where).

---

## Source quality hierarchy

Prefer sources higher on this list; when relying on lower tiers, say so and do not treat them as proof of fact without corroboration.

1. **Primary government documents** — Court filings, judgments, indictments, agency orders, statutes, regulations, certified administrative records.
2. **Primary organizational documents** — Audited financials, official annual reports, securities filings, signed contracts where public, official statements on organizational letterhead or verified channels.
3. **Official data releases** — Statistical agencies, regulators’ datasets, FOIA responses with document IDs.
4. **Investigative and court-adjacent records** — Grand jury reports where published, inspector general reports, legislative hearing transcripts with exhibits.
5. **Established newsrooms and specialist reporters** — Contemporaneous reporting with bylines; institutional corrections policies matter.
6. **Academic and peer-reviewed work** — Where methodology and limits are clear.
7. **Firsthand sworn testimony** — Depositions, sworn affidavits, trial testimony (tier depends on cross-examination and corroboration).
8. **Secondary summaries and advocacy reports** — Use for leads and context; verify claims against primary material when stakes are high.

---

## Concern level calibration

`overall_concern_level` is one of: **significant**, **moderate**, **low**. Calibrate from the **whole profile**, not a single headline.

| Level | Criteria (non-exhaustive) |
|-------|---------------------------|
| **significant** | Pattern of serious harm or systemic failure with strong documentation; major legal/regulatory exposure; egregious governance or accountability gaps; or scale of impact large relative to sector norms. Reserved for profiles where a reasonable reader would want alternatives first. |
| **moderate** | Mixed record: material documented issues together with mitigations, geographic or segment variation, or disputes where the record is partial. Common for large institutions with both documented harms and documented benefits. |
| **low** | Limited documented material issues relative to peers; issues are minor, isolated, or well-mitigated; or harms are largely speculative without a developed record. |

If the evidence straddles moderate and significant, **moderate** unless the severe elements are sustained and well-sourced across multiple dimensions.

---

## Prohibited practices

- **Unsourced factual assertions** where the standard expects a receipt.
- **Conflating allegations with findings** — label allegations clearly; separate adjudicated facts.
- **Anonymous smears** — no naming individuals for serious misconduct without documented sources meeting the hierarchy.
- **Cherry-picking** — omitting major exculpatory or mitigating primary material already in the public record.
- **Synthetic certainty** — phrases like “it is clear that” without citation; statistical leaps beyond methodology.
- **Treating opinion or advocacy** as government or court fact without verification.
- **Backdating** — implying a response existed at a date before it did without evidence.

---

## Fields requiring explicit no-data statements

When research does not support a substantive section, **do not leave a misleading empty implication**. Use a short explicit statement such as:

- “No major documented [labor | environmental | …] issues were identified in available sources.”
- “No material enforcement actions were identified for [scope].”

Apply especially to structured sections (e.g., labor, environmental, tax, legal) when databases and credible searches return nothing material. Distinguish **no data found** from **no wrongdoing**.

---

## Gap section standard

When important questions remain **after good-faith research**, document the gap rather than guessing.

A gap entry should state:

- **What is unknown or unresolved** (specific question, not vague “more research needed”).
- **Why** it is unknown (records sealed, jurisdiction opaque, conflicting primary sources, etc., when known).
- **What would change the picture** (e.g., a specific filing, dataset, or whistleblower document).

Gaps belong in the appropriate section narrative or a dedicated gap note if the product schema provides one; they must not be used to smuggle unsubstantiated claims.

---

## Revision

When new primary evidence appears, update the profile and the response-type closing if the organization’s documented position changes.
