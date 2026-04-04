/**
 * True when the investigation documents health-related concerns (tags, flags, or product_health copy).
 * @param {Record<string, unknown> | null | undefined} investigation
 */
export function hasDocumentedHealthConcerns(investigation) {
  if (!investigation) return false;
  const verdict = Array.isArray(investigation.verdict_tags)
    ? investigation.verdict_tags.map(String)
    : [];
  const flags = Array.isArray(investigation.concern_flags)
    ? investigation.concern_flags.map(String)
    : [];
  const all = [...verdict, ...flags];
  if (all.some((t) => /health|product_safety|pfas|toxic|chemical/i.test(t))) return true;
  const ph = investigation.product_health;
  return typeof ph === 'string' && ph.trim().length > 0;
}
