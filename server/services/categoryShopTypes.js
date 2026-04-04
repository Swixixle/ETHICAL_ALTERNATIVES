/**
 * Map vision category → OSM `shop=*` values for Overpass (Prompt 12).
 */
export const CATEGORY_TO_SHOP_TYPES = {
  clothing: ['clothes', 'tailor', 'vintage', 'thrift'],
  coffee: ['coffee', 'cafe'],
  food: ['bakery', 'farm', 'deli', 'greengrocer'],
  books: ['books'],
  personal_care: ['beauty', 'cosmetics'],
  home_goods: ['interior_decoration', 'antiques', 'second_hand'],
  electronics: ['electronics', 'mobile_phone', 'computer'],
  tools: ['hardware', 'doityourself'],
  tobacco: ['tobacco'],
};

/** Default shop types when category unknown */
export const DEFAULT_SHOP_TYPES = ['clothes', 'tailor', 'vintage', 'thrift', 'gift'];
