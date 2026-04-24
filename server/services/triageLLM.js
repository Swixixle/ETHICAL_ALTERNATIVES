/**
 * Triage Layer - Ollama (local, free)
 * Determines investigation path: 'use_cache' | 'check_recent' | 'full_research'
 * Conservative mode: catch everything, prefer checking over skipping
 */

import { pool } from '../db/pool.js';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 30000);

/**
 * Check if cached deep research exists in database
 * @param {string} brandSlug
 * @returns {Promise<{exists: boolean, ageDays: number | null, hasDeepResearch: boolean}>}
 */
export async function checkCachedResearch(brandSlug) {
  if (!pool || !brandSlug) {
    return { exists: false, ageDays: null, hasDeepResearch: false };
  }

  try {
    const { rows } = await pool.query(
      `SELECT profile_json, last_researched, created_at
       FROM incumbent_profiles
       WHERE brand_slug = $1
       LIMIT 1`,
      [brandSlug]
    );

    const row = rows[0];
    if (!row) {
      return { exists: false, ageDays: null, hasDeepResearch: false };
    }

    // Check if profile has deep research
    let hasDeepResearch = false;
    if (row.profile_json) {
      const data = typeof row.profile_json === 'string'
        ? JSON.parse(row.profile_json)
        : row.profile_json;
      hasDeepResearch = Boolean(
        data?.deep_research?.per_category?.length > 0 ||
        data?.per_category?.length > 0
      );
    }

    // Calculate age
    const lastResearched = row.last_researched;
    let ageDays = null;
    if (lastResearched) {
      const lastDate = lastResearched instanceof Date
        ? lastResearched
        : new Date(lastResearched);
      ageDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      exists: true,
      ageDays,
      hasDeepResearch,
    };
  } catch (e) {
    console.error('[triageLLM] cache check failed:', e?.message || e);
    return { exists: false, ageDays: null, hasDeepResearch: false };
  }
}

/**
 * Build triage prompt for Ollama
 * @param {Object} params
 * @returns {string}
 */
function buildTriagePrompt({ brandName, corporateParent, slug, cacheInfo }) {
  const { exists, ageDays, hasDeepResearch } = cacheInfo;

  return `You are a triage system for a brand investigation service. Your job is to decide the fastest path to accurate results.

BRAND: "${brandName || corporateParent || slug}"
CORPORATE PARENT: "${corporateParent || 'Unknown'}"

CACHED DATA STATUS:
- Cache exists: ${exists ? 'YES' : 'NO'}
${exists ? `- Age: ${ageDays} days old` : ''}
${exists ? `- Has deep research: ${hasDeepResearch ? 'YES' : 'NO'}` : ''}

DECISION OPTIONS:
1. "use_cache" - Use cached data if it exists and is recent enough
2. "check_recent" - Quick check for new developments (last 30-90 days)
3. "full_research" - Full investigation from scratch

RULES (apply in order):
- If no cache exists → "full_research"
- If cache is > 90 days old → "check_recent" (verify for new enforcement actions)
- If cache has NO deep research → "full_research"
- If cache is 30-90 days old → "check_recent" (conservative: better to check than miss something)
- If cache is < 30 days old with deep research → "use_cache"

Be conservative. Missing a new enforcement action is worse than an extra API call.

Respond with ONLY one of these exact words: use_cache | check_recent | full_research
No explanation, no punctuation, just the decision.`;
}

/**
 * Call Ollama for triage decision
 * @param {string} prompt
 * @returns {Promise<string | null>}
 */
async function callOllama(prompt) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response?.trim() || null;
  } catch (e) {
    if (e.name === 'AbortError') {
      console.warn('[triageLLM] Ollama timeout');
    } else {
      console.warn('[triageLLM] Ollama call failed:', e?.message || e);
    }
    return null;
  }
}

/**
 * Parse triage response into valid decision
 * @param {string | null} response
 * @param {Object} cacheInfo
 * @returns {'use_cache' | 'check_recent' | 'full_research'}
 */
function parseTriageDecision(response, cacheInfo) {
  if (!response) {
    // Fallback: conservative decision based on cache info
    const { exists, ageDays, hasDeepResearch } = cacheInfo;
    if (!exists) return 'full_research';
    if (!hasDeepResearch) return 'full_research';
    if (ageDays === null) return 'check_recent';
    if (ageDays > 90) return 'check_recent';
    if (ageDays > 30) return 'check_recent';
    return 'use_cache';
  }

  const normalized = response.toLowerCase().replace(/[^a-z_]/g, '');

  if (normalized.includes('usecache') || normalized === 'use_cache') {
    return 'use_cache';
  }
  if (normalized.includes('checkrecent') || normalized === 'check_recent') {
    return 'check_recent';
  }
  if (normalized.includes('fullresearch') || normalized === 'full_research') {
    return 'full_research';
  }

  // Conservative fallback
  return parseTriageDecision(null, cacheInfo);
}

/**
 * Determine investigation path using Ollama triage
 * @param {Object} params
 * @returns {Promise<{decision: 'use_cache' | 'check_recent' | 'full_research', cacheInfo: Object, ollamaResponse: string | null}>}
 */
export async function triageInvestigation({ brandName, corporateParent, slug }) {
  const startTime = Date.now();

  // Check cache status
  const cacheInfo = await checkCachedResearch(slug);

  // Build prompt
  const prompt = buildTriagePrompt({ brandName, corporateParent, slug, cacheInfo });

  // Call Ollama
  const ollamaResponse = await callOllama(prompt);

  // Parse decision
  const decision = parseTriageDecision(ollamaResponse, cacheInfo);

  const duration = Date.now() - startTime;

  console.log('[triageLLM] decision', {
    brand: brandName || corporateParent || slug,
    decision,
    cacheExists: cacheInfo.exists,
    cacheAgeDays: cacheInfo.ageDays,
    hasDeepResearch: cacheInfo.hasDeepResearch,
    ollamaResponse: ollamaResponse?.slice(0, 50),
    durationMs: duration,
  });

  return {
    decision,
    cacheInfo,
    ollamaResponse,
  };
}

/**
 * Health check for Ollama
 * @returns {Promise<{available: boolean, model: string | null}>}
 */
export async function checkOllamaHealth() {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return { available: false, model: null };
    }

    const data = await response.json();
    const models = data.models || [];
    const hasModel = models.some(m => m.name?.includes(OLLAMA_MODEL));

    return {
      available: true,
      model: hasModel ? OLLAMA_MODEL : null,
    };
  } catch (e) {
    return { available: false, model: null };
  }
}
