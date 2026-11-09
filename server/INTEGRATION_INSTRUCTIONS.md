# Human-Scale Corporate Penalty Integration

## What Was Built

### 1. Data Infrastructure
- **61,679 real FY2024 federal sentencing records** from USSC
- CSV adapter with streaming support for large files
- Query engine with filters (offense type, amount, demographics)

### 2. Human-Scale Corporate Penalty Framework
```javascript
// Core calculation:
// If corporation has rights of N individuals,
// It should face liability of N individuals.

Human-Scale Penalty = median_sentence × decision_makers

Example:
- Board: 12 members
- C-Suite: 5 executives
- Total: 17 decision-makers
- Median sentence for securities fraud: 10 months
- Human-scale penalty: 17 × 10 = 170 months (14.2 years)
- Operational restriction: 14.2 years ineligible to operate
```

### 3. Files Created

| File | Purpose |
|------|---------|
| `data/offenseTaxonomy.js` | Maps corporate violations to USSC offense codes |
| `services/sentencingDataAdapter.js` | Queries 61,679 real sentencing records |
| `services/sentencingComparisonBrief.js` | Generates comparison briefs with Ed25519 signing |
| `services/humanScaleIntegration.js` | Wires into EthicalAlt investigation flow |

## Integration Steps

### Step 1: Import the integration service

In `server/services/investigation.js`, add import:

```javascript
import { attachHumanScaleToInvestigation } from './humanScaleIntegration.js';
```

### Step 2: Wire into investigation generation

In `incumbentRowToInvestigation` function (~line 1015), add after line 1050:

```javascript
// Attach Human-Scale Corporate Penalty analysis
if (!options?.skipHumanScale) {
  try {
    await attachHumanScaleToInvestigation(finalized, brandName, row.brand_slug);
  } catch (err) {
    console.error('[human-scale] Failed to attach analysis:', err.message);
  }
}
```

### Step 3: Include in cryptographic receipt

In `investigationReceipt.js`, ensure `human_scale_penalty` is included in the receipt body:

```javascript
// In buildReceiptPayloadFromProfileRow function,
// add to receiptBody:
if (profileJson?.human_scale_penalty) {
  receiptBody.human_scale_penalty = profileJson.human_scale_penalty;
}
```

## Example Output

### Investigation Report Structure

```json
{
  "brand": "Amazon.com Inc",
  "slug": "amazon",
  "overall_concern_level": "high",
  "executive_summary": "...",
  "tax_summary": "...",
  "legal_summary": "...",
  "human_scale_penalty": {
    "generated_at": "2026-04-23T18:25:33.074Z",
    "data_available": true,
    "categories": {
      "tax": {
        "offense_type": "tax_evasion",
        "civilian_statute": "26 U.S.C. § 7201",
        "corporate_governance": {
          "board_members": 15,
          "c_suite_authority": 7,
          "total_decision_makers": 22
        },
        "civilian_analog": {
          "median_sentence_months": 14,
          "median_sentence_years": 1.2,
          "prison_rate_percent": 95,
          "sample_size": 100
        },
        "human_scale_penalty": {
          "total_custody_years": 25.7,
          "per_person_years": 1.2,
          "decision_makers": 22
        },
        "operational_restriction": {
          "years_ineligible": 25.7,
          "simple_comparison": "Corporate: $850M fine, 0 years ineligible | Human-scale: 25.7 years ineligible"
        },
        "actual_outcome": {
          "fine": 850000000,
          "custody_years": 0,
          "operational_pause_years": 0
        },
        "disparity": {
          "severity": "catastrophic",
          "ratio": "INFINITE",
          "interpretation": "Complete accountability gap: Corporation pays $850M and continues operations while human-scale justice would require 25.7 years of complete operational shutdown."
        },
        "thesis_statement": "If Amazon.com Inc operates with the constitutional rights of 22 individuals...",
        "brief_id": "c337c613-4ea5-4d59-af90-8b354fdffdac",
        "generated_at": "2026-04-23T18:25:33.078Z"
      },
      "legal": { ... }
    },
    "summary": "Aggregate human-scale penalty: 44.0 years of operational ineligibility."
  }
}
```

### Display Format

```
HUMAN-SCALE CORPORATE PENALTY ANALYSIS
======================================================================

TAX VIOLATIONS:
----------------------------------------
  Civilian Analog: Tax evasion (26 U.S.C. § 7201)
  Median Sentence: 1.2 years per person (100 USSC cases)
  Decision-Makers: 22 (estimated)
  Human-Scale Penalty: 25.7 years ineligible to operate
  Actual Outcome: $850,000,000 fine, 0 years custody
  Disparity: CATASTROPHIC (∞:1)

  If Amazon.com Inc operates with the constitutional rights of 22 
  individuals, it should face the aggregate criminal liability of 22 
  individuals who committed this offense. Under human-scale justice, 
  this would result in 25.7 years of operational ineligibility.

SUMMARY: Aggregate human-scale penalty across 2 violation categories: 
44.0 years of operational ineligibility.
```

## Testing

Run the integration test:

```bash
cd /Users/alexmaksimovich/ETHICAL_ALTERNATIVES/server
node services/test_human_scale_integration.mjs
```

## Key Features

1. **Real Data**: Uses 61,679 actual FY2024 federal sentencing records
2. **CATASTROPHIC Disparity**: Shows when corporations pay fines but face zero custody
3. **Thesis Statement**: "If corporation has rights of N individuals, should face liability of N individuals"
4. **Ed25519 Signed**: Cryptographic tamper-evidence on every brief
5. **Production Ready**: Integration hooks ready for investigation flow

## Coverage

**Phase 1 (Working Now):**
- ✓ Securities fraud
- ✓ Tax evasion
- ✓ Wire fraud
- ✓ Money laundering
- ✓ Embezzlement
- ✓ Bribery

**Phase 2 (Future):**
- Environmental violations
- Antitrust
- Consumer fraud

**Phase 3 (Future):**
- Labor violations
- Workplace deaths

## Notes

- Labor/OSHA violations not yet in Phase 1 - would require Phase 3 offense taxonomy
- System uses estimated governance structure (can be overridden with actual SEC proxy data)
- Each brief takes ~50-60 seconds to generate (61K records)
- Consider caching briefs in database to avoid regeneration
