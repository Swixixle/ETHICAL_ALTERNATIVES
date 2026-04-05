/** URL-safe slug for API params (brand investigative record). */
export function slugifyBrandName(name) {
  const s = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'brand';
}
