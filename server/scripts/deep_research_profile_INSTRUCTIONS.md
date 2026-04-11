# EthicalAlt — Deep Research Expansion Script (Perplexity-first architecture)

Create `server/scripts/deep_research_profile.mjs`. Perplexity handles all research and citation retrieval. Claude handles normalization, deduplication, and structuring. The LLM never invents facts — it only organizes what Perplexity found and cited.

## Architecture

```
Perplexity (research + citations) → Claude (normalize + structure) → Database (append)
```

## Step 1 — Perplexity query engine

Create a function `queryPerplexity(companyName, subsidiaries, category, prompt)` that:

- Uses `model: "sonar-deep-research"` if available, otherwise `"sonar"`
- Sets `search_recency_filter` to `null` (all time, not just recent)
- Sets `return_citations: true`
- Runs against the Perplexity API at `https://api.perplexity.ai/chat/completions`
- Returns: response text + array of citation objects `{url, title, snippet}`

Run one query per category per company. Queries are structured like:

```javascript
const CATEGORY_QUERIES = {
  labor_and_wage: `Find every documented labor violation, wage theft settlement, OSHA citation, NLRB unfair labor practice case, union suppression campaign, and worker discrimination case involving {company} and all its subsidiaries. Include case numbers, dollar amounts, dates, and direct links to OSHA, NLRB, DOJ, EEOC, or court records. Go back as far as records exist.`,

  environmental: `Find every EPA enforcement action, Clean Air Act violation, Clean Water Act violation, Superfund site involvement, state environmental penalty, and greenwashing enforcement action involving {company} and all its subsidiaries. Include EPA ECHO records, state agency actions, and NGO documented cases with dates and dollar amounts.`,

  regulatory_and_legal: `Find every DOJ prosecution, FTC enforcement action, state attorney general settlement, consent decree, deferred prosecution agreement, and criminal conviction involving {company} and all its subsidiaries. Include case names, courts, outcomes, and dollar amounts going back as far as records exist.`,

  product_safety: `Find every FDA warning letter, product recall, CPSC enforcement action, black box warning, mass tort litigation (MDL), and consumer safety enforcement action involving {company} products. Include dates, products affected, and direct links to FDA or CPSC records.`,

  financial_misconduct: `Find every SEC enforcement action, accounting fraud, financial restatement, auditor resignation, tax shelter ruling, transfer pricing dispute, and PCAOB enforcement action involving {company}. Include case numbers, amounts, and direct links to SEC EDGAR or DOJ records.`,

  data_and_privacy: `Find every data breach, FTC privacy enforcement, state AG privacy action, GDPR fine, worker surveillance controversy, and dark pattern enforcement involving {company}. Include dates, number of users affected, and regulatory records.`,

  antitrust_and_market_power: `Find every DOJ antitrust lawsuit, FTC monopolization case, EU competition fine, price-fixing scheme, bid rigging case, and market allocation agreement involving {company}. Include case names, courts, outcomes, and dollar amounts.`,

  discrimination_and_civil_rights: `Find every EEOC pattern-or-practice lawsuit, DOJ Civil Rights Division action, redlining or discriminatory lending case, algorithmic bias settlement, and class action discrimination case involving {company}. Include dates, populations affected, and settlement amounts.`,

  institutional_enablement: `Find documented cases where regulators failed to act on known violations by {company}, revolving door officials who moved between {company} and regulatory agencies (with names, roles, and dates), government subsidies and tax breaks received by {company} especially after major violations, and any congressional investigations or inspector general reports naming {company}.`,

  executive_and_governance: `Find the CEO-to-median-worker pay ratio for {company}, any related-party transactions, insider loans, dual-class share controversies, board independence issues, and executive compensation controversies. Also find any executives convicted of crimes or named in major enforcement actions.`,

  supply_chain: `Find documented use of prison labor, forced labor, or child labor in {company}'s supply chain, conflict mineral controversies, and major safety or labor violations at key suppliers that exist primarily because of {company}'s purchasing power. Include NGO reports, congressional investigations, and journalist investigations with sources.`,

  subsidies_and_bailouts: `Find every government subsidy, tax incentive, bailout, loan guarantee, and special tax break received by {company} using Good Jobs First Subsidy Tracker data and other sources. Include amounts, dates, granting agencies, and any conditions attached. Compare total subsidies received to total penalties paid.`,
}
```

## Step 2 — Subsidiary map

Before running category queries, build the corporate tree:

```javascript
async function buildSubsidiaryMap(companyName) {
  const result = await queryPerplexity(
    companyName,
    [],
    'corporate_structure',
    `Find the complete corporate structure for ${companyName}: ultimate parent company, holding companies, major operating subsidiaries, and known DBA names. Use SEC 10-K Exhibit 21 filings and any other authoritative sources. Return as a structured list with source URLs.`
  )
  // Pass to Claude to normalize into corporate_tree schema
}
```

Store as:

```json
{
  "brand_name": "Visible brand",
  "operating_entity": "Legal name",
  "parent": "Holding company",
  "ultimate_parent": "Top of tree",
  "known_subsidiaries": [],
  "dbas": [],
  "sources": []
}
```

Include all subsidiary names in every subsequent Perplexity query by appending: `"Also search under these subsidiary names: {subsidiaries.join(', ')}"`

## Step 3 — Claude normalization pass

After each Perplexity category query returns, send the response + citations to Claude with this system prompt:

```
You are a structured data extractor for an investigative journalism accountability tool. You receive raw research text and citation URLs from Perplexity. Your job is to extract every distinct incident and normalize it to a JSON schema. Rules:
- Never invent facts not present in the provided text
- Every incident must have a source_url from the provided citations
- If no citation URL exists for an incident, set confidence to "low" and source_url to null
- Descriptions are one neutral sentence — no adjectives asserting guilt, no editorializing
- Return only a valid JSON array, no prose, no markdown fences
```

Incident schema Claude must output:

```json
{
  "date": "YYYY or YYYY-MM or YYYY-MM-DD",
  "entity": "exact legal entity named in source",
  "parent_attribution": "ultimate parent if different",
  "jurisdiction": "federal | state | international",
  "agency_or_court": "e.g. EPA, NLRB, S.D.N.Y.",
  "description": "one neutral sentence",
  "outcome": "settlement | conviction | consent_decree | dismissed | ongoing | fine | recall | subsidy",
  "amount_usd": 0,
  "workers_affected": null,
  "source_url": "direct URL from Perplexity citations",
  "source_type": "regulator | court | investigative_journalism | ngo | secondary_news",
  "confidence": "high | medium | low",
  "category": "labor_and_wage | environmental | etc"
}
```

## Step 4 — Deduplication pass

After all 12 category passes complete, send the full combined incident array to Claude:

```
You receive a JSON array of corporate misconduct incidents. Some may be duplicates reported by different sources. Merge exact duplicates (same event, same date, same entity) keeping the highest-confidence source_url. Flag clusters of related incidents. Return the deduplicated array plus a gaps array: time periods where records seem sparse given the surrounding pattern.
```

## Step 5 — Institutional enablement pass

Send the full deduplicated incident list plus company name to Claude:

```
From this incident record, identify:
1. Revolving door: any officials named who moved between this company and regulatory agencies. Return {name, company_role, agency_role, years, decisions_influenced_if_known}
2. Subsidy-after-violation: any subsidies received within 3 years of a major penalty. Return pairs with dates and amounts.
3. Net public transfer: total subsidies_received minus total penalties_paid. Return the number and the math.
4. Regulatory non-enforcement: any documented cases where agencies knew of violations and delayed or declined action.
```

## Step 6 — Summary generation pass

Final Claude call:

```
Generate three plain-language summary fields for this company profile. Tone: neutral, factual, like a government report appendix. No accusations, only documented record.

one_line: One sentence. Max 20 words. What this company is known for in public records.
worker_summary: One paragraph. Labor, wage, discrimination, and union record only.
community_summary: One paragraph. Environmental, product safety, and civil rights record only.
public_transfer_note: One sentence. Net public money received vs penalties paid if calculable.
```

## Step 7 — Database write

Append to `incumbent_profiles` — never overwrite existing confirmed incidents:

```javascript
// Merge new incidents with existing profile_json
// Deduplicate by source_url
// Update: last_researched, overall_concern_level recalculated from incident severity
// Add new top-level fields: corporate_tree, institutional_enablement, executive_governance
```

## Step 8 — Script interface

```bash
# Single company dry run (outputs to JSON file, no DB write)
node server/scripts/deep_research_profile.mjs --slug walmart --dry-run

# Single company live
node server/scripts/deep_research_profile.mjs --slug walmart

# Full database pass
node server/scripts/deep_research_profile.mjs --all --batch-size 2 --delay 60000

# Single category only
node server/scripts/deep_research_profile.mjs --slug walmart --category labor_and_wage --dry-run
```

Dry run output: `server/deep_research_output/[slug]_deep.json`

## Cost controls

- Hard cap: stop if cumulative Perplexity cost exceeds $5.00 in a single run
- Log token counts and estimated cost after every slug
- `--dry-run` never writes to database
- Batch delay minimum 60 seconds between companies to respect rate limits

## Do not

- Let Claude invent source URLs
- Overwrite existing incidents — append and deduplicate only
- Run `--all` without testing `--dry-run` on at least 2 companies first
- Add any frontend changes

## Test first

```bash
node server/scripts/deep_research_profile.mjs --slug walmart --dry-run
node server/scripts/deep_research_profile.mjs --slug hca-healthcare --dry-run
```

Paste both JSON outputs before any live database writes.
