# EthicalAlt

**Point your camera at anything. Tap the brand. Get the record.**

[ethicalalt-client.onrender.com](https://ethicalalt-client.onrender.com)

---

You're standing in an aisle. You're about to buy something. EthicalAlt tells you what the company behind that product has done — sourced from public records, not opinion.

Point the camera. Tap the logo. See what's documented. Find something better nearby.

---

## What you get

Every investigation produces a structured record across six categories:

- **Environmental** — EPA enforcement, spills, emissions violations, cleanup orders
- **Labor** — OSHA citations, wage theft settlements, union suppression, worker injury records
- **Legal** — Criminal convictions, civil settlements, regulatory actions and outcomes
- **Political** — Lobbying spend, PAC donations, revolving door hires
- **Tax** — Offshore structures, effective rates vs statutory rates, government subsidies received
- **Product Health** — Documented harms, recalls, ingredient concerns

Every finding carries a source link. Every allegation includes the company's documented response, or states that none was found.

---

## The deep research database

20 major corporations have been fully investigated using a two-phase pipeline: Perplexity sonar-deep-research finds and cites the raw record, Claude normalizes and structures it. Each profile includes up to 90 sourced incidents across all six categories.

Target · Walmart · Amazon · Apple · Disney · Coca-Cola · UnitedHealth · BP · Shell · Chevron · McDonald's · Comcast · Cigna · Nestlé · Tyson Foods · Philip Morris · Altria · Humana · Kraft Heinz · PepsiCo

Every other scan runs a live investigation against real-time public records.

---

## The investigation index

184 additional company profiles are available in the investigation index — corporations, fast food chains, healthcare providers, gas stations, streaming services, and more.

These profiles are built from AI training data and live web search, not the deep research pipeline. They are accurate starting points, not exhaustive records. The documented incidents are real and sourced, but the coverage is shallower than the 20 fully researched profiles above.

When you scan a company from the index, EthicalAlt runs a live investigation on top of the stored profile — checking for anything new in the last 30 days and flagging recent developments.

The full deep research treatment is being extended to the full index. The 20 companies above are the first wave.

---

## Cryptographic receipts

Every completed investigation generates a signed receipt — Ed25519, verifiable at `/verify/:receipt_id`. The receipt includes:

- Subject, investigation timestamp, incident count, source URLs
- SHA-256 hash of the full incident array
- Signature from the Nikodemus Systems public key
- A downloadable JSON artifact you can hand to a journalist or attorney

A receipt is not a verdict. It is proof that this investigation happened, at this time, against these sources.

---

## Alternatives

Every investigation surfaces independent alternatives nearby — local businesses, Etsy sellers, verified independent stores — sorted by distance. Not sponsored. Not paid placement.

---

## What this is not

EthicalAlt is not a law firm. Not a regulator. Not a news organization.

It is a mirror. Clean businesses get a clean record. Companies with documented issues get a documented record. The mirror does not editorialize.

---

## Stack

React/Vite PWA · Node.js/Express · PostgreSQL · Ed25519 signing · Perplexity sonar-deep-research · Claude Vision · Gemini Vision · Render

Built by Alex Maksimovich / [Nikodemus Systems](https://swixixle.github.io)
