import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {Record<string, string[]> | null} */
let mapCache = null;

function loadMap() {
  if (mapCache) return mapCache;
  const raw = readFileSync(join(__dirname, '../data/corporate-category-map.json'), 'utf8');
  mapCache = JSON.parse(raw);
  return mapCache;
}

/**
 * Worker categories (Hire Direct) for a corporate brand slug.
 * @param {string | null | undefined} slug
 * @returns {string[]}
 */
export function hireDirectCategoriesForSlug(slug) {
  const s = String(slug || '')
    .trim()
    .toLowerCase();
  if (!s) return [];
  const m = loadMap();
  const v = m[s];
  return Array.isArray(v) ? v : [];
}

/**
 * @param {Record<string, unknown> | null | undefined} investigation
 * @returns {Record<string, unknown> | null | undefined}
 */
export function attachHireDirectCategories(investigation) {
  if (!investigation || typeof investigation !== 'object') return investigation;
  const slug =
    typeof investigation.brand_slug === 'string' ? investigation.brand_slug.trim().toLowerCase() : '';
  const cats = hireDirectCategoriesForSlug(slug);
  if (!cats.length) return investigation;
  return { ...investigation, hire_direct_categories: cats };
}
