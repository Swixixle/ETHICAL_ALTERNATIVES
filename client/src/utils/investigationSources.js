const FLAT_SOURCE_KEYS = [
  'tax_sources',
  'legal_sources',
  'labor_sources',
  'environmental_sources',
  'political_sources',
  'product_health_sources',
  'executive_sources',
];

const NESTED_SOURCE_KEYS = ['connections', 'allegations', 'health_record'];

/** User-facing sources only — excludes internal pipeline tokens (e.g. coverage layer ids). */
export function isHttpProfileSourceUrl(raw) {
  const s = String(raw ?? '').trim();
  return /^https?:\/\//i.test(s);
}

/** @param {Record<string, unknown> | null | undefined} inv */
/** @param {Record<string, unknown> | null | undefined} result */
export function countIndexedSources(inv, result) {
  let n = 0;
  const countHttpStrings = (arr) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((acc, x) => acc + (isHttpProfileSourceUrl(x) ? 1 : 0), 0);
  };

  if (!inv || typeof inv !== 'object') {
    const extra = Array.isArray(result?.searched_sources) ? countHttpStrings(result.searched_sources) : 0;
    return extra;
  }
  for (const k of FLAT_SOURCE_KEYS) {
    n += countHttpStrings(inv[k]);
  }
  for (const k of NESTED_SOURCE_KEYS) {
    const block = inv[k];
    if (block && typeof block === 'object' && Array.isArray(block.sources)) {
      n += countHttpStrings(block.sources);
    }
  }
  const hr = inv.health_record;
  if (hr && typeof hr === 'object' && Array.isArray(hr.studies)) {
    for (const st of hr.studies) {
      if (st && typeof st === 'object' && isHttpProfileSourceUrl(st.url)) n += 1;
    }
  }
  const extra = Array.isArray(result?.searched_sources) ? countHttpStrings(result.searched_sources) : 0;
  return n + extra;
}

/** @param {string} raw */
function hostLabel(raw) {
  try {
    const u = new URL(raw);
    return u.hostname.replace(/^www\./, '') || raw;
  } catch {
    return raw.slice(0, 48);
  }
}

/**
 * Unique URLs with display metadata for the sources ledger card.
 * @param {Record<string, unknown> | null | undefined} inv
 * @param {Record<string, unknown> | null | undefined} result
 */
export function collectSourceLedgerRows(inv, result) {
  const seen = new Set();
  /** @type {{ url: string; name: string }[]} */
  const rows = [];
  const push = (u) => {
    const url = String(u).trim();
    if (!isHttpProfileSourceUrl(url) || seen.has(url)) return;
    seen.add(url);
    rows.push({ url, name: hostLabel(url) });
  };

  if (inv && typeof inv === 'object') {
    for (const k of FLAT_SOURCE_KEYS) {
      const arr = inv[k];
      if (Array.isArray(arr)) arr.forEach((x) => push(x));
    }
    for (const k of NESTED_SOURCE_KEYS) {
      const block = inv[k];
      if (block && typeof block === 'object' && Array.isArray(block.sources)) {
        block.sources.forEach((x) => push(x));
      }
    }
    const hr = inv.health_record;
    if (hr && typeof hr === 'object' && Array.isArray(hr.studies)) {
      for (const st of hr.studies) {
        if (st && typeof st === 'object' && st.url) push(st.url);
      }
    }
  }
  if (result && typeof result === 'object' && Array.isArray(result.searched_sources)) {
    result.searched_sources.forEach((x) => {
      const s = typeof x === 'string' ? x : x != null && typeof x === 'object' && 'url' in x ? String(/** @type {{url:unknown}} */ (x).url) : String(x);
      push(s);
    });
  }
  return rows;
}
