/**
 * Structured incident export (JSON) for indexed profiles — GET /api/profiles/:slug/export
 */
export function profileStructuredExportUrl(brandSlug) {
  const raw = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL;
  const base = typeof raw === 'string' ? raw.replace(/\/$/, '') : '';
  const slug = String(brandSlug || '').trim();
  if (!slug) return '';
  const enc = encodeURIComponent(slug);
  return `${base}/api/profiles/${enc}/export`;
}
