/** @param {string} str */
export function hashStringToUint32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** @param {number} a */
export function mulberry32(a) {
  return function mulberry() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace(arr, rng) {
  const a = arr;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** @returns {string} YYYY-MM-DD UTC */
export function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * Registry sellers first, then OSM — each tier shuffled deterministically per UTC day + place.
 * @param {object[]} feed
 * @param {{ dateKey: string; city?: string; state?: string }} opts
 */
export function dailyFeedShuffle(feed, { dateKey, city, state }) {
  if (!Array.isArray(feed) || feed.length < 2) return [...feed];
  const seed = hashStringToUint32(`${dateKey}|${city || ''}|${state || ''}`);
  const rng = mulberry32(seed);
  const registry = feed.filter((x) => x?.type === 'registry');
  const osm = feed.filter((x) => x?.type === 'osm');
  const other = feed.filter((x) => x?.type !== 'registry' && x?.type !== 'osm');
  shuffleInPlace(registry, rng);
  shuffleInPlace(osm, rng);
  shuffleInPlace(other, rng);
  return [...registry, ...osm, ...other];
}

/** @param {object[]} chainFeed */
export function dailyChainShuffle(chainFeed, { dateKey, city, state }) {
  if (!Array.isArray(chainFeed) || chainFeed.length < 2) return [...chainFeed];
  const seed = hashStringToUint32(`${dateKey}|chains|${city || ''}|${state || ''}`);
  const rng = mulberry32(seed);
  const copy = [...chainFeed];
  shuffleInPlace(copy, rng);
  return copy;
}

