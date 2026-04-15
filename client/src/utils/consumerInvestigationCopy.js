/**
 * Strip internal / machine-generated preambles from investigation copy before showing users.
 */

const VERIFIED_PUBLIC_RECORD_LEAD =
  /^\s*Verified public record \(deep research profile\):\s*/i;

const INSTITUTIONAL_STRUCTURED_LEAD =
  /^\s*Institutional enablement \(structured record\):\s*/i;

const OPERATIONS_GOVERNANCE_LEAD = /^\s*Operations & governance \(indexed record\):\s*/i;

/**
 * @param {string} s
 */
export function stripInternalFindingPreambles(s) {
  let t = String(s || '').trim();
  if (!t) return '';
  t = t.replace(VERIFIED_PUBLIC_RECORD_LEAD, '').trim();
  t = t.replace(INSTITUTIONAL_STRUCTURED_LEAD, '').trim();
  t = t.replace(OPERATIONS_GOVERNANCE_LEAD, '').trim();
  return t.trim();
}

/**
 * Incident lines produced by deep-research merge (`buildFindingFromCategory` bullet list).
 * @param {string} s
 */
export function isMachineAssembledIncidentFindingList(s) {
  const lines = String(s || '')
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return false;
  return lines.every((l) => /^[•\-\*](\s|$)/.test(l));
}

/**
 * @param {string} s
 */
function looksLikeJsonObjectDump(s) {
  const t = String(s || '').trim();
  return t.startsWith('{') && t.includes('}');
}

/**
 * Machine-assembled bullet dumps that leak into section finding prose (e.g. `• The Export-Import Bank…`,
 * `• California provided…`, or date-prefixed incident rows from deep-research merge). Strips whole lines only.
 * @param {string} s
 */
export function stripMachineDateBulletLines(s) {
  const lines = String(s || '').split(/\r?\n/);
  const machineBulletLine = /^\s*[•*\u2022\u2013\u2014-]\s+\S/;
  const kept = lines.filter((line) => !machineBulletLine.test(line));
  return kept
    .join('\n')
    .replace(/\n[ \t]*\n([ \t]*\n)+/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @param {string | null | undefined} rawFinding
 * @param {boolean} hasDeepResearchCategories
 * @returns {string | null}
 */
export function consumerFacingSectionFinding(rawFinding, hasDeepResearchCategories) {
  if (typeof rawFinding !== 'string' || !rawFinding.trim()) return null;
  let t = stripInternalFindingPreambles(rawFinding);
  if (!t) return null;
  t = stripMachineDateBulletLines(t);
  if (!t) return null;
  if (looksLikeJsonObjectDump(t)) return null;
  if (hasDeepResearchCategories && isMachineAssembledIncidentFindingList(t)) return null;
  return t;
}
