/**
 * Auto investigation library: check DB cache, else run adapter pipeline, sign, persist.
 * Used by HTTP routes and batch scripts. Requires DATABASE_URL.
 */
import '../env.js';
import crypto from 'node:crypto';
import { pool } from '../db/pool.js';

// Import real adapters
import {
  perplexityAdapter,
  gdeltAdapter,
  epaAdapter,
  secAdapter,
  claudeAdapter,
} from './adapters/index.mjs';

/**
 * @typedef {{ forceRefresh?: boolean; onProgress?: (e: Record<string, unknown>) => void }} InvestigateOptions
 */

/**
 * @param {string} targetEntity
 * @param {InvestigateOptions} [options]
 */
export async function investigate(targetEntity, options = {}) {
  const { forceRefresh = false, onProgress } = options;
  const key = String(targetEntity || '').trim();
  if (!key) {
    throw new Error('targetEntity required');
  }

  if (!pool) {
    throw new Error('DATABASE_URL not configured');
  }

  if (!forceRefresh) {
    const cached = await checkLibrary(key);
    if (cached) {
      onProgress?.({ step: 'cache', message: 'Found in library', target_entity: key });
      return cached;
    }
  } else {
    onProgress?.({ step: 'refresh', message: 'Skipping cache (force refresh)', target_entity: key });
  }

  onProgress?.({ step: 'run', message: 'Running full investigation protocol', target_entity: key });
  const investigation = await runFullInvestigation(key, { onProgress });
  const signature = await saveToLibrary(investigation);
  investigation.signature = signature;
  return investigation;
}

/**
 * @param {string} targetEntity
 * @param {{ onProgress?: (e: Record<string, unknown>) => void }} [opts]
 */
async function runFullInvestigation(targetEntity, opts = {}) {
  const { onProgress } = opts;
  /** @type {Record<string, unknown>} */
  const results = {};

  const run = async (name, step, n, max, fn) => {
    onProgress?.({ step, name, n, max, message: `Starting ${name}` });
    try {
      const out = await fn(targetEntity);
      onProgress?.({ step, name, n, max, message: `Done ${name}`, ok: true });
      return out;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ✗ ${name} failed:`, msg);
      onProgress?.({ step, name, n, max, message: `Failed ${name}`, ok: false, error: msg });
      return { error: msg };
    }
  };

  // Run adapters in sequence
  results.perplexity = await run('Perplexity', 'adapter', 1, 5, (e) => perplexityAdapter.search(e));
  results.gdelt = await run('GDELT', 'adapter', 2, 5, (e) => gdeltAdapter.search(e));
  results.epa = await run('EPA', 'adapter', 3, 5, (e) => epaAdapter.search(e));
  results.sec = await run('SEC', 'adapter', 4, 5, (e) => secAdapter.search(e));
  results.corroboration = await run('Claude corroboration', 'adapter', 5, 5, (e) =>
    claudeAdapter.corroborate(e, results)
  );

  // Generate synthesis if Claude corroboration succeeded
  let synthesis = null;
  if (!results.corroboration.error) {
    try {
      synthesis = await claudeAdapter.synthesize(targetEntity, results.corroboration);
    } catch (err) {
      console.warn('Synthesis failed:', err.message);
    }
  }

  const confidence = Number(calculateConfidence(results));
  const investigated_at = new Date().toISOString();

  return {
    target_entity: targetEntity,
    findings: results,
    synthesis: synthesis?.summary || null,
    sources: ['perplexity', 'gdelt', 'epa', 'sec', 'claude'],
    confidence,
    corroborated: !(
      results.corroboration &&
      typeof results.corroboration === 'object' &&
      results.corroboration != null &&
      'error' in results.corroboration
    ),
    needs_human_review: hasDiscrepancies(results),
    investigated_at,
    from_cache: false,
  };
}

/**
 * @param {string} targetEntity
 */
async function checkLibrary(targetEntity) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `
    SELECT
      id,
      target_entity,
      findings,
      sources,
      investigated_at,
      signature,
      corroborated,
      needs_human_review,
      confidence,
      synthesis,
      ROUND(EXTRACT(EPOCH FROM (NOW() - investigated_at)) / 86400.0, 2) AS age_in_days
    FROM investigations
    WHERE target_entity = $1
    ORDER BY investigated_at DESC
    LIMIT 1
    `,
    [targetEntity]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    from_cache: true,
  };
}

/**
 * @param {Record<string, unknown>} investigation
 */
async function saveToLibrary(investigation) {
  if (!pool) {
    throw new Error('Database not available');
  }
  const signature = signReceipt(investigation);
  const te = investigation.target_entity;
  const conf =
    typeof investigation.confidence === 'number' && Number.isFinite(investigation.confidence)
      ? investigation.confidence
      : null;

  await pool.query(
    `
    INSERT INTO investigations (
      target_entity,
      findings,
      sources,
      signature,
      investigated_at,
      corroborated,
      needs_human_review,
      confidence,
      synthesis
    ) VALUES ($1, $2::jsonb, $3::jsonb, $4, $5::timestamptz, $6, $7, $8, $9)
    ON CONFLICT (target_entity) DO UPDATE SET
      findings = EXCLUDED.findings,
      sources = EXCLUDED.sources,
      signature = EXCLUDED.signature,
      investigated_at = EXCLUDED.investigated_at,
      corroborated = EXCLUDED.corroborated,
      needs_human_review = EXCLUDED.needs_human_review,
      confidence = EXCLUDED.confidence,
      synthesis = EXCLUDED.synthesis
    `,
    [
      te,
      JSON.stringify(investigation.findings ?? {}),
      JSON.stringify(Array.isArray(investigation.sources) ? investigation.sources : []),
      signature,
      investigation.investigated_at,
      Boolean(investigation.corroborated),
      Boolean(investigation.needs_human_review),
      conf,
      investigation.synthesis,
    ]
  );
  console.log(`✓ Saved ${te} to investigation library`);
  return signature;
}

/**
 * @param {Record<string, unknown>} data
 */
function signReceipt(data) {
  let keyInput = null;

  // Try PEM first (new standard)
  if (process.env.ED25519_PRIVATE_KEY) {
    keyInput = crypto.createPrivateKey(process.env.ED25519_PRIVATE_KEY);
  }
  // Fallback to existing PERIMETER key (DER format, base64 encoded)
  else if (process.env.PERIMETER_ED25519_PKCS8_DER_B64) {
    const derBuffer = Buffer.from(process.env.PERIMETER_ED25519_PKCS8_DER_B64, 'base64');
    keyInput = crypto.createPrivateKey({
      key: derBuffer,
      format: 'der',
      type: 'pkcs8'
    });
  }
  else {
    console.warn('No Ed25519 key found (checked ED25519_PRIVATE_KEY and PERIMETER_ED25519_PKCS8_DER_B64) - using unsigned receipt');
    return 'unsigned';
  }

  const dataString = JSON.stringify({
    target_entity: data.target_entity,
    findings: data.findings,
    sources: data.sources,
    investigated_at: data.investigated_at
  }, null, 0);

  const sign = crypto.sign(null, Buffer.from(dataString, 'utf8'), keyInput);
  return sign.toString('base64');
}

/**
 * @param {Record<string, unknown>} results
 */
function calculateConfidence(results) {
  let score = 0;
  let total = 0;
  for (const [source, data] of Object.entries(results)) {
    if (source === 'corroboration') continue;
    total += 1;
    if (data && typeof data === 'object' && data !== null) {
      const o = /** @type {Record<string, unknown>} */ (data);
      if ('error' in o && o.error != null) continue;
      if (Object.keys(o).length > 0) score += 1;
    }
  }
  if (total === 0) return 0;
  return Number((score / total).toFixed(2));
}

/**
 * @param {Record<string, unknown>} results
 */
function hasDiscrepancies(results) {
  const c = results.corroboration;
  if (c && typeof c === 'object' && c !== null) {
    const discrepancies = /** @type {Record<string, unknown>} */ (c).discrepancies;
    if (Array.isArray(discrepancies) && discrepancies.length > 0) return true;

    const humanReview = /** @type {Record<string, unknown>} */ (c).human_review_required;
    if (Array.isArray(humanReview) && humanReview.length > 0) return true;
  }
  const criticalSources = ['perplexity', 'epa', 'sec'];
  const failures = criticalSources.filter((s) => {
    const v = results[s];
    return v && typeof v === 'object' && v != null && 'error' in v;
  });
  return failures.length >= 2;
}
