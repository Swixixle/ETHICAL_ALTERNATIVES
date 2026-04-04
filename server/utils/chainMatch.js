/**
 * Case-insensitive chain name matching for independent-business feeds.
 * @param {string[]} excludeNameSubstrings needles from chain-exclusions.json
 * @returns {string[]} normalized lowercase needles
 */
export function normalizeChainNeedles(excludeNameSubstrings) {
  if (!Array.isArray(excludeNameSubstrings)) return [];
  return excludeNameSubstrings
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {string | null | undefined} name
 * @param {string[]} needles normalized lowercase needles
 */
export function nameMatchesChain(name, needles) {
  const hay = String(name ?? '').toLowerCase();
  return needles.some((n) => n.length && hay.includes(n));
}
