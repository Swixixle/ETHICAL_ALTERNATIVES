/**
 * Map vision category → OSM `shop=*` (and optionally `amenity=*`) for Overpass tap alternates.
 * Values are either `string[]` (shop only) or `{ shopTypes, amenityTypes }`.
 */
export const CATEGORY_TO_SHOP_TYPES = {
  clothing: ['clothes', 'tailor', 'vintage', 'thrift'],
  coffee: ['coffee', 'cafe'],
  food: {
    shopTypes: ['bakery', 'farm', 'deli', 'greengrocer'],
    amenityTypes: ['restaurant', 'fast_food', 'cafe', 'food_court'],
  },
  books: ['books'],
  personal_care: ['beauty', 'cosmetics'],
  home_goods: ['interior_decoration', 'antiques', 'second_hand'],
  electronics: ['electronics', 'mobile_phone', 'computer'],
  tools: ['hardware', 'doityourself'],
  tobacco: ['tobacco'],
};

/** Default shop types when category unknown */
export const DEFAULT_SHOP_TYPES = ['clothes', 'tailor', 'vintage', 'thrift', 'gift'];

/**
 * @param {string | undefined} category — vision identification.category
 * @returns {{ shopTypes: string[]; amenityTypes: string[] }}
 */
export function getLocalOsmTypes(category) {
  const key = typeof category === 'string' ? category.trim() : '';
  const def = key ? CATEGORY_TO_SHOP_TYPES[key] : null;
  if (!def) return { shopTypes: DEFAULT_SHOP_TYPES, amenityTypes: [] };
  if (Array.isArray(def)) return { shopTypes: def, amenityTypes: [] };
  const shopTypes = Array.isArray(def.shopTypes) ? def.shopTypes : [];
  const amenityTypes = Array.isArray(def.amenityTypes) ? def.amenityTypes : [];
  return { shopTypes, amenityTypes };
}
