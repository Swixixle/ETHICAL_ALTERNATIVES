# Contributing to EthicalAlt

Three ways to contribute. All are valuable.

---

## 1. Investigation Profiles

The most important contribution. We need documented corporate profiles
for every major brand a user might encounter.

**Requirements for a profile:**
- Every claim must have a primary source URL
- Sources must be: government databases, court records, regulatory filings,
  or established investigative journalism. Not Wikipedia. Not blogs.
- Tone: descriptive and source-anchored. "The company settled X case for $Y
  (per DOJ press release [link])" — not "the company is corrupt"
- Use the issue template: [Investigation Profile](.github/ISSUE_TEMPLATE/investigation_profile.md)

**Sources we accept:**
- EPA ECHO (echo.epa.gov) — environmental enforcement
- FEC (fec.gov) — political donations
- CourtListener (courtlistener.com) — federal cases
- OSHA (osha.gov) — worker safety
- DOL WHISARD — wage theft
- NLRB case database — labor disputes
- OpenSecrets — lobbying
- SEC EDGAR — corporate filings
- ProPublica Nonprofit Explorer — IRS 990s
- Good Jobs First (goodjobsfirst.org) — subsidies
- DOJ press releases — criminal cases
- FTC enforcement actions
- Established investigative outlets (NYT, ProPublica, Reuters, WSJ, The Guardian)

**Sources we do not accept:**
- Wikipedia (as a primary source)
- Company press releases (for negative claims)
- Social media
- Opinion pieces
- Unverified activist sites

---

## 2. Chain Exclusion List

`server/data/chain-exclusions.json`

The local business layer filters known chains from OpenStreetMap results.
This list is community-maintained.

**To add chains:**
1. Fork the repo
2. Edit `server/data/chain-exclusions.json`
3. Add entries in this format:
```json
{
  "chain_name": "starbucks",
  "canonical_name": "Starbucks Corporation",
  "category": "coffee",
  "match_type": "contains",
  "country_codes": null
}
```
4. `match_type`: `"contains"` (name contains this string) or `"exact"` (exact match)
5. `country_codes`: `null` for global, or `["US", "CA"]` for specific countries
6. Submit a pull request

**Guidelines:**
- Lowercase chain names
- Include major regional chains, not just national ones
- If a chain operates independently in some markets (e.g., some franchise systems),
  note this in a comment

---

## 3. Code Contributions

**Before opening a PR:**
- Open an issue describing what you want to build
- Wait for acknowledgment before building
- Keep PRs focused — one feature or fix per PR

**Code standards:**
- Node.js backend: ESM modules, async/await, no callbacks
- React frontend: functional components, hooks
- All API calls wrapped in try/catch
- Every new investigation source: must have a normalizer that produces
  the standard `investigation` response shape
- Test with `npm test` before submitting

**Good first issues:** Look for the `good-first-issue` label

---

## Code of Conduct

This project exists to route money toward independent makers and surface
the documented record of corporate harm. Contributions that serve that
mission are welcome. Contributions that undermine it are not.

Specifically:
- Don't submit false or unverified investigation claims
- Don't add independent businesses to the chain exclusion list
- Don't submit profiles designed to defame rather than inform

---

## Questions

Open an issue with the `question` label.
