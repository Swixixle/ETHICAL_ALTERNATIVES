/**
 * Filters alternative results to retail / independent shopping only — excludes staffing,
 * gig-marketplace, recruiting, and similar non-retail listings (heuristic by text).
 */

const NON_RETAIL_RE =
  /staffing|temp(?:orary)?\s+agency|employment\s+agency|gig\s+platform|recruit(?:er|ing|ment)?|headhunter|workforce\s+solutions|day\s+labor|labor\s+hire|talent\s+acquisition|contractor\s+placement|indeed|linkedin\s+jobs|taskrabbit|fiverr\s+for\s+work/i;

/**
 * @param {Array<Record<string, unknown>> | undefined} places
 * @returns {Array<Record<string, unknown>>}
 */
export function filterLocalRetailPlaces(places) {
  if (!Array.isArray(places)) return [];
  return places.filter((p) => {
    const name = String(p?.name || '');
    return name.trim().length > 0 && !NON_RETAIL_RE.test(name);
  });
}

/**
 * Registry / seller rows (independent websites shipped to you).
 * @param {Array<Record<string, unknown>> | undefined} sellers
 * @returns {Array<Record<string, unknown>>}
 */
export function filterOnlineSellerRows(sellers) {
  if (!Array.isArray(sellers)) return [];
  return sellers.filter((s) => {
    const parts = [
      s?.seller_name,
      s?.description,
      s?.product_description,
      ...(Array.isArray(s?.categories) ? s.categories : []),
      ...(Array.isArray(s?.keywords) ? s.keywords : []),
    ].map((x) => String(x || ''));
    const blob = parts.join(' ');
    return blob.trim().length > 0 && !NON_RETAIL_RE.test(blob);
  });
}
