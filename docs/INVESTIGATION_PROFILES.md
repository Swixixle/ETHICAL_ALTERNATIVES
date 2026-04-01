# Investigation Profiles

EthicalAlt maintains a database of corporate investigation profiles.
Each profile is built from public records.

---

## Current Database

### Volume 1

| Slug | Company | Concern Level |
|------|---------|--------------|
| starbucks | Starbucks | Significant |
| nike | Nike Inc. | Moderate |
| hm | H&M Group | Significant |
| apple | Apple Inc. | Significant |
| amazon | Amazon.com | Significant |
| nestle | Nestlé S.A. | Significant |
| shein | SHEIN | Significant |
| philip-morris | Philip Morris International | Significant |
| altria | Altria Group | Significant |
| coca-cola | Coca-Cola Company | Significant |
| mcdonalds | McDonald's Corporation | Moderate |
| procter-gamble | Procter & Gamble | Moderate |
| unilever | Unilever PLC | Moderate |
| gap | Gap Inc. | Moderate |
| johnson-johnson | Johnson & Johnson | Significant |
| lvmh | LVMH | Minor |

### Volume 2

| Slug | Company | Concern Level |
|------|---------|--------------|
| exxonmobil | ExxonMobil | Significant |
| tyson-foods | Tyson Foods | Significant |
| bayer-monsanto | Bayer/Monsanto | Significant |
| pepsico | PepsiCo | Moderate |
| meta | Meta Platforms | Significant |
| google | Alphabet/Google | Significant |
| microsoft | Microsoft | Moderate |
| tesla | Tesla | Significant |
| bat-reynolds | British American Tobacco | Significant |
| kraft-heinz | Kraft Heinz | Moderate |
| mars | Mars Inc. | Moderate |
| pvh-corp | PVH Corp | Moderate |
| dollar-general | Dollar General | Significant |
| target | Target | Minor |
| sysco | Sysco | Moderate |

### Positive Profiles (Clean Cards)

| Slug | Company | Status |
|------|---------|--------|
| ben-jerrys | Ben & Jerry's | Clean (minor caveats) |
| patagonia | Patagonia | Clean |
| rei | REI Co-op | Clean (minor caveats) |
| cotopaxi | Cotopaxi | Clean |
| eileen-fisher | Eileen Fisher | Clean |

---

## Profile Format

Each profile is a JSON file in `server/db/profiles_v1/` or `profiles_v2/`.

```json
{
  "brand_slug": "example",
  "brand_name": "Example Corp",
  "parent_company": "Example Holdings",
  "ultimate_parent": "Example Holdings",
  "known_subsidiaries": ["Brand A", "Brand B"],
  "overall_concern_level": "significant",
  "verdict_tags": ["labor_violations", "tax_avoidance"],
  "investigation_summary": "Plain language 3-5 sentence summary...",
  "primary_sources": ["https://...", "https://..."],
  "research_confidence": "high",
  "profile": {
    "tax": {
      "summary": "...",
      "flags": ["effective rate below statutory"],
      "sources": ["https://..."]
    },
    "legal": {
      "summary": "...",
      "flags": ["DOJ settlement $X"],
      "sources": ["https://..."]
    },
    "labor": { ... },
    "environmental": { ... },
    "political": { ... },
    "product_health": { ... },
    "executive": { ... }
  }
}
```

---

## Contributing a Profile

Use the [Investigation Profile issue template](.github/ISSUE_TEMPLATE/investigation_profile.md).

Requirements:
- Every claim has a primary source URL
- Sources are government records, court filings, or established journalism
- Tone is descriptive, not editorial
- You have read the [contributing guidelines](.github/CONTRIBUTING.md)

We review every submission. If claims cannot be verified to primary sources,
we will ask for corrections before merging.

---

## Brand Aliases

Many brands are known by names different from their parent company.
The `server/data/brand_aliases.json` file maps these:

```
Marlboro → philip-morris
Tide → procter-gamble
Instagram → meta
YouTube → google
...
```

When vision identifies "Marlboro," the alias lookup fires the
Philip Morris investigation profile.

[→ Add an alias](https://github.com/Swixixle/ethicalalt/edit/main/server/data/brand_aliases.json)
