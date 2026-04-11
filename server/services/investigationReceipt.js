/**
 * Build and sign investigation receipts (Ed25519 via PERIMETER_ED25519_PKCS8_DER_B64).
 */

import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { extractDeepResearchFromProfileJson } from './deepResearchMerge.js';

const VERIFY_BASE =
  typeof process.env.CLIENT_VERIFY_BASE_URL === 'string' && process.env.CLIENT_VERIFY_BASE_URL.trim()
    ? process.env.CLIENT_VERIFY_BASE_URL.trim().replace(/\/$/, '')
    : 'https://ethicalalt-client.onrender.com';

const SCHEMA_VERSION = '1.0';
const ISSUER = 'EthicalAlt / Nikodemus Systems';
const DISCLAIMER =
  'This receipt documents public records and credible reporting. It is not a legal finding. Sources are linked directly and independently verifiable.';
const METHODOLOGY_URL = 'https://ethicalalt-client.onrender.com/methodology';

/** @param {unknown} val */
function stableStringify(val) {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return `[${val.map((x) => stableStringify(x)).join(',')}]`;
  }
  const o = /** @type {Record<string, unknown>} */ (val);
  const keys = Object.keys(o).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
}

function loadPrivateKey() {
  const b64 = process.env.PERIMETER_ED25519_PKCS8_DER_B64;
  if (!b64 || !String(b64).trim()) return null;
  try {
    return createPrivateKey({
      key: Buffer.from(String(b64).trim(), 'base64'),
      format: 'der',
      type: 'pkcs8',
    });
  } catch {
    return null;
  }
}

/** @returns {string | null} SPKI DER as base64url */
export function getReceiptPublicKeyB64Url() {
  const priv = loadPrivateKey();
  if (!priv) return null;
  try {
    const pub = createPublicKey(priv);
    const der = pub.export({ type: 'spki', format: 'der' });
    if (!Buffer.isBuffer(der)) return null;
    return der.toString('base64url');
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} receiptBody — no signature field
 * @returns {string | null}
 */
export function signReceiptBody(receiptBody) {
  const priv = loadPrivateKey();
  if (!priv) return null;
  const msg = Buffer.from(stableStringify(receiptBody), 'utf8');
  const sig = sign(null, msg, priv);
  return `ed25519:${Buffer.from(sig).toString('base64url')}`;
}

/**
 * @param {Record<string, unknown>} receiptBody
 * @param {string} signature ed25519:...
 */
export function verifyReceiptSignature(receiptBody, signature) {
  const priv = loadPrivateKey();
  if (!priv) return false;
  let pub;
  try {
    pub = createPublicKey(priv);
  } catch {
    return false;
  }
  const m = String(signature || '').match(/^ed25519:(.+)$/);
  if (!m) return false;
  let sigBuf;
  try {
    sigBuf = Buffer.from(m[1], 'base64url');
  } catch {
    return false;
  }
  const msg = Buffer.from(stableStringify(receiptBody), 'utf8');
  try {
    return verify(null, msg, pub, sigBuf);
  } catch {
    return false;
  }
}

/**
 * @param {unknown[]} incidents
 */
export function hashIncidentsSorted(incidents) {
  const sorted = [...incidents].sort((a, b) => {
    const ua =
      a && typeof a === 'object' && typeof /** @type {any} */ (a).source_url === 'string'
        ? /** @type {any} */ (a).source_url
        : '';
    const ub =
      b && typeof b === 'object' && typeof /** @type {any} */ (b).source_url === 'string'
        ? /** @type {any} */ (b).source_url
        : '';
    return String(ua).localeCompare(String(ub));
  });
  return createHash('sha256').update(JSON.stringify(sorted), 'utf8').digest('hex');
}

/**
 * @param {unknown} profileJson
 * @param {{ slug: string; brand_name?: string | null; ultimate_parent?: string | null; parent_company?: string | null; overall_concern_level?: string | null; data_source?: string | null; investigation_id?: string | null }} opts
 */
export function buildReceiptPayloadFromProfileRow(profileJson, opts) {
  const dr = extractDeepResearchFromProfileJson(profileJson);
  if (!dr || typeof dr !== 'object') {
    return { ok: false, error: 'no_deep_research' };
  }

  const perCategory = Array.isArray(dr.per_category) ? dr.per_category : [];
  if (perCategory.length === 0) {
    return { ok: false, error: 'no_deep_categories' };
  }

  /** @type {unknown[]} */
  let incidents = Array.isArray(dr.incidents) ? [...dr.incidents] : [];
  if (incidents.length === 0) {
    for (const cat of perCategory) {
      if (!cat || typeof cat !== 'object') continue;
      const inc = /** @type {Record<string, unknown>} */ (cat).incidents;
      if (Array.isArray(inc)) incidents.push(...inc);
    }
  }

  const category_summary = perCategory
    .map((cat) => {
      if (!cat || typeof cat !== 'object') return null;
      const c = /** @type {Record<string, unknown>} */ (cat);
      const category = typeof c.category === 'string' ? c.category : '';
      const tf = typeof c.total_found === 'number' && Number.isFinite(c.total_found) ? c.total_found : null;
      const oc = typeof c.overflow_count === 'number' && Number.isFinite(c.overflow_count) ? c.overflow_count : 0;
      const incLen = Array.isArray(c.incidents) ? c.incidents.length : 0;
      const count = tf != null ? Math.floor(tf) : incLen;
      if (!category) return null;
      return { category, count, overflow: Math.max(0, Math.floor(oc)) };
    })
    .filter(Boolean);

  const sourceSet = new Set();
  for (const inc of incidents) {
    if (!inc || typeof inc !== 'object') continue;
    const u = /** @type {Record<string, unknown>} */ (inc).source_url;
    if (typeof u === 'string' && u.startsWith('http')) sourceSet.add(u.trim());
  }

  const source_urls = [...sourceSet].sort((a, b) => a.localeCompare(b));
  const incidents_hash = hashIncidentsSorted(incidents);
  const investigated_at =
    typeof dr.generated_at === 'string' && dr.generated_at.trim()
      ? new Date(dr.generated_at.trim()).toISOString()
      : new Date().toISOString();

  const generated_at = new Date().toISOString();
  const topIncidents = Array.isArray(dr.incidents) ? dr.incidents.length : 0;
  const incident_count =
    topIncidents > 0
      ? topIncidents
      : category_summary.reduce(
          (s, row) => s + (row && typeof row.count === 'number' ? row.count : 0),
          0
        );

  const brandName =
    opts.brand_name && String(opts.brand_name).trim()
      ? String(opts.brand_name).trim()
      : opts.slug;
  const ultimate =
    opts.ultimate_parent && String(opts.ultimate_parent).trim()
      ? String(opts.ultimate_parent).trim()
      : opts.parent_company && String(opts.parent_company).trim()
        ? String(opts.parent_company).trim()
        : brandName;

  const data_source =
    opts.data_source && String(opts.data_source).trim()
      ? String(opts.data_source).trim()
      : 'deep_research+database';

  const receipt_id = randomUUID();

  /** @type {Record<string, unknown>} */
  const receiptBody = {
    receipt_id,
    subject: {
      brand_name: brandName,
      brand_slug: opts.slug,
      ultimate_parent: ultimate,
    },
    investigated_at,
    generated_at,
    incident_count,
    category_summary,
    source_urls,
    source_count: source_urls.length,
    incidents_hash,
    data_source,
    last_deep_researched: investigated_at,
    disclaimer: DISCLAIMER,
    methodology_url: METHODOLOGY_URL,
    issuer: ISSUER,
    schema_version: SCHEMA_VERSION,
    overall_concern_level:
      opts.overall_concern_level && String(opts.overall_concern_level).trim()
        ? String(opts.overall_concern_level).trim()
        : null,
  };

  if (opts.investigation_id && String(opts.investigation_id).trim()) {
    receiptBody.investigation_id = String(opts.investigation_id).trim();
  }

  return { ok: true, receiptBody, incidents_for_pdf: incidents };
}

export function receiptVerifyUrl(receiptId) {
  return `${VERIFY_BASE}/verify/${encodeURIComponent(receiptId)}`;
}

export { VERIFY_BASE, SCHEMA_VERSION, ISSUER, DISCLAIMER, METHODOLOGY_URL };
