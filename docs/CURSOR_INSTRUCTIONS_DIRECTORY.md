# CURSOR INSTRUCTIONS — EthicalAlt Directory (corrected for this repo)

## Files delivered

| File | Destination |
|------|-------------|
| `profiles.index.route.js` | `server/routes/profiles.index.route.js` |
| `DirectoryPage.jsx` | `client/src/pages/DirectoryPage.jsx` |
| `DirectoryPage.css` | `client/src/pages/DirectoryPage.css` |

---

## Step 1 — Server route

### 1a. Copy the file

```
server/routes/profiles.index.route.js  ← already correct
```

Pool import is `{ pool }` named export — matches this repo's pattern.
503 guard is already in the route.

### 1b. Mount in `server/index.js`

Find where the other profile routes are mounted. Add alongside them:

```js
import profileIndexRouter from './routes/profiles.index.route.js';

app.use('/api/profiles', profileIndexRouter);
```

If a profiles router already exists and you're mounting sub-routes on it,
add the import and `router.use('/index', ...)` there instead — match the
existing pattern exactly.

### 1c. Smoke test

```bash
curl -sS "https://YOUR_SERVER/api/profiles/index" | head -c 500
```

Expected: JSON array. Each object has `brand_slug`, `display_name`, `sector`,
`overall_concern_level`, `generated_headline`.

If you see `"Database not configured."` — the pool guard is working but pool
is null. Check env vars on Render.

---

## Step 2 — Client component

### 2a. Copy both files

```
client/src/pages/DirectoryPage.jsx
client/src/pages/DirectoryPage.css
```

### 2b. Props this component expects

```jsx
<DirectoryPage
  setMode={setMode}           // from App.jsx state setter
  investigateByBrand={investigateByBrand}  // same function used in the deep-dive flow
/>
```

Both are already in App.jsx — same pattern as the witnesses page.

### 2c. Row click behavior

When a user taps a row:
1. `pushState` to `/profile/:slug`
2. Calls `investigateByBrand(slug)` — resolves via the brand alias table, same
   as tapping a logo in the camera view.
3. Sets mode to `'deep'`

No additional wiring needed beyond passing the props.

---

## Step 3 — Wire in `App.jsx`

### 3a. Import the component

```js
import DirectoryPage from './pages/DirectoryPage';
```

### 3b. Add mode to the mode switch

Find the block that renders based on `mode`. Add:

```jsx
{mode === 'directory' && (
  <DirectoryPage
    setMode={setMode}
    investigateByBrand={investigateByBrand}
  />
)}
```

### 3c. Add to `syncPath`

In the effect that syncs URL to mode (same pattern as witnesses), add:

```js
if (pathname === '/directory') {
  setMode('directory');
  return;
}
```

Add `/directory` to the `syncPath` dependency list if it's explicit there.

### 3d. `goHome` — clear URL

Confirm `goHome` already does `window.history.pushState({}, '', '/')` and
`setMode('home')`. No change needed if it does.

---

## Step 4 — Footer link in `HomeScreen`

Find the footer_area in `HomeScreen` (the unobtrusive links area — same zone
as any existing secondary nav). Add:

```jsx
<button
  onClick={() => {
    window.history.pushState({}, '', '/directory');
    setMode('directory');
  }}
  className="footer-link"  // use whatever class the other footer links use
>
  Investigation Index
</button>
```

This stays entirely out of the tap/camera flow.

**Repo note:** `HomeScreen` does not receive `setMode`; use an `onOpenDirectory`
callback from `App.jsx` that runs the same `pushState` + `setMode('directory')` logic.

---

## Step 5 — Sector gap diagnostic (run on Render)

Many v1 profiles have no `sector` key in `profile_json`. The directory will
still load — those rows just show "—" for sector. Concern level should populate
from either `profile_json.overall_concern_level` or the relational column.

Run this to see scope of sector gaps:

```sql
SELECT brand_slug, profile_json->>'sector' AS sector
FROM incumbent_profiles
WHERE profile_json->>'sector' IS NULL
ORDER BY brand_slug;
```

Fix options (pick one):
- **One-time JSON patch:** add `"sector": "Consumer Goods"` etc. to each
  profile JSON during the next regeneration pass.
- **Relational column:** `ALTER TABLE incumbent_profiles ADD COLUMN sector TEXT;`
  then backfill with `UPDATE` statements. Update the import scripts to write
  the column going forward. Update the SQL in `profiles.index.route.js` to
  select `ip.sector` directly.

The relational column is cleaner long-term if you're going to keep adding
profiles and want sector to be queryable/indexable.
