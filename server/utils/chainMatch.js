/** ASCII-fold accents so e.g. "Fogo de Chão" matches needle "fogo de chao". */
function foldAccents(s) {
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\u2018\u2019\u201A\u2032\u2035`´]/g, "'");
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
