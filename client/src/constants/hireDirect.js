export const WORKER_CATEGORY_OPTIONS = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'handyman', label: 'Handyman' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'transport', label: 'Transport' },
  { value: 'lawn_garden', label: 'Lawn & Garden' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'tech_help', label: 'Tech Help' },
];

/** @param {string} value */
export function hireDirectCategoryLabel(value) {
  const f = WORKER_CATEGORY_OPTIONS.find((o) => o.value === value);
  return f ? f.label : value;
}
