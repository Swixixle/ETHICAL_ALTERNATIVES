import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {Record<string, { outlets?: unknown[] }> | null} */
let catalogCache = null;

function loadCatalog() {
  if (catalogCache) return catalogCache;
  try {
    const raw = readFileSync(join(__dirname, '../data/press-outlets.json'), 'utf8');
    catalogCache = JSON.parse(raw);
  } catch {
    catalogCache = { _default: { outlets: [] } };
  }
  return catalogCache;
}

function normalizeHandle(h) {
  let s = String(h || '').trim();
  if (!s) return '';
  if (!s.startsWith('@')) s = `@${s.replace(/^@+/, '')}`;
  return s;
}

/**
 * @param {string | null | undefined} slug
 * @returns {{ name: string; handle: string; beat: string }[]}
 */
export function getPressOutletsForSlug(slug) {
  const cat = loadCatalog();
  const key = typeof slug === 'string' && slug.trim() ? slug.trim() : '';
  const block = (key && cat[key]) || cat._default;
  const raw = Array.isArray(block?.outlets) ? block.outlets : [];
  const out = [];
  const seen = new Set();
  for (const o of raw) {
    if (!o || typeof o !== 'object') continue;
    const name = String(o.name || '').trim();
    const handle = normalizeHandle(o.handle);
    const beat = String(o.beat || '').trim();
    if (!name || !handle || seen.has(handle)) continue;
    seen.add(handle);
    out.push({ name, handle, beat });
  }
  return out;
}
