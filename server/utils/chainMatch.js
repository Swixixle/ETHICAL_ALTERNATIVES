/** ASCII-fold accents so e.g. "Fogo de Chão" matches needle "fogo de chao". */
function foldAccents(s) {
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\u2018\u2019\u201A\u2032\u2035`´]/g, "'");
}

/** Lowercase + accent-fold for incumbent name comparison (not substring heuristics). */
export function foldAccentsForMatch(s) {
  return foldAccents(String(s ?? '').trim().toLowerCase());
}

/** Same rules as investigation `brandSlug` — OSM/registry name → slug for exact incumbent match. */
export function brandSlugForMatch(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** @param {string} a @param {string} b */
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  /** @type {number[]} */
  let row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

/**
 * Similarity in [0, 1] from Levenshtein distance (accent-folded, lowercased).
 * @param {string} a
 * @param {string} b
 */
export function stringSimilarityRatio(a, b) {
  const s = foldAccentsForMatch(a);
  const t = foldAccentsForMatch(b);
  if (!s.length && !t.length) return 1;
  if (!s.length || !t.length) return 0;
  const d = levenshtein(s, t);
  return 1 - d / Math.max(s.length, t.length);
}

const MIN_NAME_LEN_FOR_SIMILARITY = 4;

/**
 * Exclude only when: (1) display name slug equals an incumbent `brand_slug`/subsidiary slug, or
 * (2) folded name is ≥80% similar to a stored brand/parent/subsidiary string (≥4 chars).
 * Does NOT use substring contains — avoids "Bovaconti Coffee" ↔ "starbucks" false positives.
 *
 * @param {string | null | undefined} displayName
 * @param {{ slugs: Set<string>; compareNames: string[] } | null | undefined} data
 * @param {{ minSimilarity?: number }} [opts]
 */
export function nameMatchesIncumbentProfiles(displayName, data, opts = {}) {
  const minSim = opts.minSimilarity ?? 0.8;
  if (!displayName || !data || (!data.slugs?.size && !data.compareNames?.length)) return false;

  const slug = brandSlugForMatch(displayName);
  if (slug && data.slugs?.has(slug)) return true;

  const hay = foldAccentsForMatch(displayName);
  if (hay.length < 3) return false;

  for (const cand of data.compareNames || []) {
    if (cand.length < MIN_NAME_LEN_FOR_SIMILARITY || hay.length < MIN_NAME_LEN_FOR_SIMILARITY) continue;
    if (stringSimilarityRatio(hay, cand) >= minSim) return true;
  }
  return false;
}

/**
 * Case-insensitive chain name matching for independent-business feeds.
 * @param {string[]} excludeNameSubstrings needles from chain-exclusions.json
 * @returns {string[]} normalized lowercase needles
 */
export function normalizeChainNeedles(excludeNameSubstrings) {
  if (!Array.isArray(excludeNameSubstrings)) return [];
  return excludeNameSubstrings
    .map((s) => foldAccents(String(s).trim().toLowerCase()))
    .filter(Boolean);
}

/**
 * @param {string | null | undefined} name
 * @param {string[]} needles normalized lowercase needles (already folded by normalizeChainNeedles)
 */
export function nameMatchesChain(name, needles) {
  const hay = foldAccents(String(name ?? '').toLowerCase());
  return needles.some((n) => {
    const needle = String(n).trim();
    return needle.length && hay.includes(needle);
  });
}
