# Cursor Task: Black Book — Company Library Browser

## What this is

A self-directed reader view for all company profiles in the DB.
No algorithm. No feed. No rage. Just: pick a company, read the dossier, move on.

The user calls it a "black book." Build it to feel like one — structured,
dense, document-like. Not a social feed. Not a news app. A reference.

---

## Step 0: Read first

1. `server/db/schema.sql` — find the `incumbent_profiles` table. Note columns:
   `brand_slug`, `brand_name`, `parent_company`, `ultimate_parent`,
   `overall_concern_level`, `profile_type`, `profile_json`, `updated_at`

2. `server/routes/` or `server/index.js` — find where existing API routes live.
   You're adding two new GET endpoints here.

3. `client/src/` — find the existing router setup (likely React Router in `App.jsx`
   or `main.jsx`). You're adding two new routes: `/library` and `/library/:slug`

Read all three before writing anything.

---

## Backend: Two new API endpoints

### GET /api/library

Returns a paginated list of all profiles — enough to render the browse grid.
Does NOT return full profile_json (that's heavy — only load on detail view).

```javascript
// Query:
SELECT brand_slug, brand_name, parent_company, overall_concern_level,
       profile_json->>'generated_headline' AS headline,
       profile_json->>'executive_summary' AS summary_snippet,
       updated_at
FROM incumbent_profiles
ORDER BY brand_name ASC
```

Response shape:
```json
{
  "profiles": [
    {
      "slug": "adidas",
      "name": "Adidas",
      "parent": "Adidas AG",
      "concern_level": "significant",
      "headline": "ADIDAS PAID KANYE...",
      "summary_snippet": "First 200 chars of executive_summary...",
      "updated_at": "2026-04-06T..."
    }
  ],
  "total": 122
}
```

Truncate `summary_snippet` to 220 characters in the query or in the route handler.
No pagination needed yet — 122-200 profiles load fine as a single JSON array.

### GET /api/library/:slug

Returns the full `profile_json` for one company.

```javascript
SELECT profile_json FROM incumbent_profiles WHERE brand_slug = $1
```

If not found, return 404 `{ error: 'Profile not found' }`.

---

## Frontend: Two new views

### Route 1: /library — The Index

**File:** `client/src/pages/Library.jsx` (create new)

**Layout:** Two-column on desktop, single-column on mobile.

Left column (fixed, scrollable): alphabetical index list — just company names as
clickable items. Group by first letter with letter headers (A, B, C...).
Highlight the currently selected company.

Right column (scrollable): shows the card for the currently selected company.
On mobile: index collapses, only the detail card is shown when one is selected.

**Index item component:**
```jsx
// Each company in the left-column list
<div className="library-index-item" data-concern={profile.concern_level}>
  <span className="company-name">{profile.name}</span>
  <span className="concern-dot" /> {/* colored dot: red=significant, amber=moderate */}
</div>
```

**Default state:** On desktop, auto-select the first company alphabetically and
show its card on the right. On mobile, show the list with no pre-selection.

**Header bar (top of page):**
- Title: "Black Book" (left-aligned)
- Count: "122 companies" (muted, right-aligned)  
- Search input: filters the left-column list in real-time (client-side filter on
  the loaded name array, no API call needed)
- Filter button: dropdown with options:
  - All (default)
  - Significant concern only
  - Sort: A→Z (default) | Z→A | Most recent

No other chrome. No navigation prompts. No "share this." No social buttons.

---

### Route 2: /library/:slug — The Dossier Card

This renders the full profile. It can render as the right-column content on desktop
OR as a standalone page on mobile (when navigated to directly or via share link).

**File:** `client/src/components/DossierCard.jsx` (create new, used by both routes)

**Layout — strict section order, no deviation:**

```
┌─────────────────────────────────────────────────────┐
│  [concern badge: SIGNIFICANT / MODERATE]            │
│                                                      │
│  BRAND NAME                                          │
│  Parent: [parent_company]                            │
│                                                      │
│  [GENERATED HEADLINE — ALL CAPS, large, prominent]  │
│                                                      │
│  [EXECUTIVE SUMMARY — full text, readable prose]    │
│                                                      │
│  [VERDICT TAGS — pill row]                           │
├─────────────────────────────────────────────────────┤
│  LABOR  |  LEGAL  |  ENVIRONMENTAL  |  POLITICAL    │  ← tab row
│  TAX    |  HEALTH |  EXECUTIVES     |  CONNECTIONS  │
├─────────────────────────────────────────────────────┤
│  [selected tab content — summary + flags]            │
├─────────────────────────────────────────────────────┤
│  TIMELINE                                            │
│  [year] [event] ● [severity dot]                    │
│  [year] [event] ● [severity dot]                    │
├─────────────────────────────────────────────────────┤
│  COMMUNITY IMPACT                                    │
│  Displacement / Price Illusion / Tax Math /          │
│  Wealth Velocity — each as labeled paragraph         │
├─────────────────────────────────────────────────────┤
│  THE GAP                                             │
│  [cost_absorption.the_gap — large, weighted text]   │
├─────────────────────────────────────────────────────┤
│  ALTERNATIVES                                        │
│  Cheaper | Healthier | DIY — three columns           │
├─────────────────────────────────────────────────────┤
│  [←  Previous]              [Next →]                │
│  [Company Name]          [Company Name]              │
└─────────────────────────────────────────────────────┘
```

**The Gap** is the most important element. Style it:
- Larger font than body
- Medium-heavy weight (not bold, not light — solid)
- Slight left border or background treatment to set it apart
- No quotes. No attribution. Just the text.

**Tab behavior:** Tabs switch which category section is visible.
Each tab shows: `summary` text + `flags` as a list + `sources` as small links.
Default open tab: `legal` (most people want the legal record first).

**Verdict tags:** Rendered as small pill badges in a wrapping row.
Replace underscores with spaces. All lowercase.

**Timeline:** Render each entry with:
- Year (monospace or tabular)
- Event text
- Severity dot: red = critical, amber = high, grey = moderate/neutral

**Prev/Next navigation:**
- Uses the alphabetically ordered list loaded in the Library view
- Simple `←` and `→` buttons at the bottom
- Shows the adjacent company name so the user knows what they're navigating to
- Updates URL to `/library/[slug]` on navigation

---

## Styling notes

This is NOT the investigation card from the main app flow (which is optimized for
mobile-camera-tap UX). This is a reader. Style accordingly:

- More whitespace between sections
- Section headers in small caps or uppercase tracking (LEGAL, TIMELINE, etc.)
- Background: near-black or very dark grey (#0f0f0f or similar) — black book aesthetic
- Text: off-white (#e8e8e8) not pure white
- Concern levels: red chip for "significant", amber chip for "moderate"
- Severity dots on timeline: same color logic
- The left index column: slightly lighter background than the card column
- Concern dot in index: 8px circle, right-aligned in each list item
- Monospace font for the generated headline (it reads like a dossier stamp)
- Tab bar: subtle underline style, not pill/button style

No card shadows. No gradients. Flat. Document-like.
If the existing app uses a design system or CSS variables, use them.
If not, inline styles are fine for this feature — it's standalone.

---

## Navigation integration

Add "Black Book" to whatever top navigation or menu the app currently has.
Route: `/library`

If the app has no navigation (it's primarily a camera-first mobile app),
add a floating button on the home screen:
```jsx
<Link to="/library" className="black-book-fab">
  📋 Black Book
</Link>
```

Or add it as a tab in whatever tab bar structure exists.
Do not disrupt the existing camera/investigation flow.

---

## Data notes

- `profile_json` is a PostgreSQL JSONB column — all fields accessible via `->>`
- All profiles use the same schema — safe to render all fields without null guards
  EXCEPT: add `|| []` fallbacks on arrays and `|| ''` on strings just in case
- `verdict_tags` is an array: `profile.verdict_tags?.join(' ') || ''`
- `concern_flags` is an object: `{labor: true, environmental: false, ...}`
- Timeline `severity` values: "critical", "high", "moderate", "neutral"
- `cost_absorption.who_benefited` and `who_paid` are arrays of `{group, how}` objects

---

## What NOT to build

- No sharing buttons on the dossier card (this is a personal reader, not a broadcast tool)
- No comments
- No ratings or reactions
- No "suggested companies" algorithm
- No notification prompts
- No user accounts required — this is a public read-only view of the DB
- No infinite scroll — the alphabetical list is finite and that's correct

---

## Priority order if time-constrained

1. API endpoints (GET /api/library and GET /api/library/:slug) — without these nothing works
2. DossierCard.jsx rendering the full profile correctly
3. Library.jsx with the two-column layout and alphabetical index
4. The Gap styling — this is the product's voice, get it right
5. Prev/Next navigation
6. Search and filter in the index
7. Mobile layout adjustments

---

## Done when

- `/library` loads, shows alphabetical list of all companies in DB
- Clicking any company renders its full dossier without page reload
- The Gap is visually distinct and reads clearly
- Timeline severity is color-coded
- Tabs work for all 8 category sections
- Prev/Next navigates correctly through the alphabet
- Works on mobile (single-column, no broken layout)
- `/library/[slug]` is a valid direct URL (shareable, works on refresh)
