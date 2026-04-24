/**
 * Investigation Orchestrator
 * Multi-LLM orchestration system for cost-effective investigations
 *
 * Flow:
 *   TRIAGE (Ollama - local/free)
 *     → Determines: 'use_cache' | 'check_recent' | 'full_research'
 *
 *   If 'use_cache':
 *     → Return cached data
 *
 *   If 'check_recent':
 *     → RECENT NEWS CHECK (Perplexity Sonar - $0.05/call)
 *       → If found: VERIFICATION (Claude Sonnet - $0.50/call)
 *       → If not found: Return cached data
 *
 *   If 'full_research':
 *     → DEEP RESEARCH (Claude Opus + Perplexity - $15/call)
 *
 * Costs per path:
 *   - use_cache: $0 (local triage only)
 *   - check_recent + no findings: ~$0.05 (triage + Perplexity)
 *   - check_recent + findings: ~$0.55 (triage + Perplexity + Claude verify)
 *   - full_research: ~$15 (full Claude Opus + Perplexity deep research)
 */

import { triageInvestigation, checkCachedResearch } from './triageLLM.js';
import { checkRecentNews, validateFindings } from './recentNewsCheck.js';
import { recordProviderSuccess, recordProviderFailure } from './aiProvider.js';
import { validateInvestigationSources } from './sourceValidator.js';

// Anthropic SDK for verification and deep research
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Model configurations
const VERIFICATION_MODEL = process.env.ANTHROPIC_VERIFICATION_MODEL || 'claude-sonnet-4-6';
const DEEP_RESEARCH_MODEL = process.env.ANTHROPIC_DEEP_RESEARCH_MODEL || 'claude-opus-4-7';

/**
 * Cost tracking for the orchestration
 */
class CostTracker {
  constructor() {
    this.steps = [];
    this.totalEstimatedCost = 0;
  }

  addStep(name, provider, estimatedCost, durationMs, status) {
    const step = {
      name,
      provider,
      estimatedCostUsd: estimatedCost,
      durationMs,
      status,
      timestamp: new Date().toISOString(),
    };
    this.steps.push(step);
    this.totalEstimatedCost += estimatedCost;
    return step;
  }

  getSummary() {
    return {
      steps: this.steps,
      totalEstimatedCostUsd: Number(this.totalEstimatedCost.toFixed(4)),
      stepCount: this.steps.length,
    };
  }
}

/**
 * Merge Perplexity findings with cached investigation data
 * @param {Object} cachedInvestigation
 * @param {Array} recentFindings
 * @returns {Object}
 */
function mergeFindingsWithCache(cachedInvestigation, recentFindings) {
  if (!recentFindings || recentFindings.length === 0) {
    return cachedInvestigation;
  }

  const merged = { ...cachedInvestigation };

  // Add new timeline events from recent findings
  const newTimelineEvents = recentFindings
    .filter(f => f.date)
    .map(f => ({
      year: new Date(f.date).getFullYear(),
      month: new Date(f.date).getMonth() + 1,
      event: `${f.title}: ${f.description}`,
      category: f.category,
      severity: f.severity,
      source_url: f.source_url,
      is_recent_finding: true,
    }));

  if (newTimelineEvents.length > 0) {
    merged.timeline = [...(merged.timeline || []), ...newTimelineEvents]
      .sort((a, b) => a.year - b.year || (a.month || 0) - (b.month || 0));
  }

  // Update concern level if critical findings
  const hasCritical = recentFindings.some(f => f.severity === 'critical');
  if (hasCritical && merged.overall_concern_level !== 'critical') {
    merged.overall_concern_level = 'significant';
    merged._concern_level_bumped_by_recent = true;
  }

  // Store recent findings metadata
  merged._recent_findings = {
    count: recentFindings.length,
    checked_at: new Date().toISOString(),
    categories: [...new Set(recentFindings.map(f => f.category))],
  };

  return merged;
}

/**
 * Verification Layer - Claude Sonnet
 * Merges Perplexity findings with cached deep research, fixes inconsistencies
 * @param {Object} params
 * @returns {Promise<{ok: boolean, investigation: Object | null, error?: string}>}
 */
async function verifyWithClaude({ cachedInvestigation, recentFindings, brandName, corporateParent, costTracker }) {
  const startTime = Date.now();
  const step = costTracker.addStep('verification', 'claude-sonnet', 0.50, null, 'started');

  try {
    // Merge findings
    const merged = mergeFindingsWithCache(cachedInvestigation, recentFindings);

    // Build verification prompt
    const prompt = `You are verifying a corporate investigation profile that has been updated with recent news.

BRAND: "${brandName || corporateParent}"

CACHED INVESTIGATION DATA:
${JSON.stringify({
  overall_concern_level: cachedInvestigation.overall_concern_level,
  executive_summary: cachedInvestigation.executive_summary,
  verdict_tags: cachedInvestigation.verdict_tags,
}, null, 2)}

RECENT FINDINGS TO INTEGRATE:
${JSON.stringify(recentFindings, null, 2)}

TASKS:
1. Review the recent findings for accuracy and relevance
2. Update the executive_summary if the recent findings significantly change the assessment
3. Ensure verdict_tags reflect any new issues
4. Check for inconsistencies between cached data and recent findings
5. Return the complete updated investigation profile

Return ONLY valid JSON matching the investigation schema. Preserve all existing fields unless the recent findings justify changes.`;

    const response = await client.messages.create({
      model: VERIFICATION_MODEL,
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      ?.filter(c => c.type === 'text')
      ?.map(c => c.text)
      ?.join('\n')
      ?.trim();

    if (!text) {
      throw new Error('Claude verification returned empty response');
    }

    // Try to parse as JSON, fallback to using merged data
    let verified;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      verified = JSON.parse(jsonText);
    } catch (parseErr) {
      console.warn('[orchestrator] Claude verification JSON parse failed, using merged data:', parseErr.message);
      verified = merged;
    }

    // Merge back any fields that might have been lost
    verified = { ...cachedInvestigation, ...verified, ...merged._recent_findings };

    recordProviderSuccess('claude');
    step.durationMs = Date.now() - startTime;
    step.status = 'completed';

    return {
      ok: true,
      investigation: verified,
    };
  } catch (e) {
    step.durationMs = Date.now() - startTime;
    step.status = 'failed';
    step.error = e?.message || String(e);

    recordProviderFailure('claude');
    console.error('[orchestrator] Claude verification failed:', e);

    // Return merged data even if verification failed
    return {
      ok: false,
      investigation: mergeFindingsWithCache(cachedInvestigation, recentFindings),
      error: e?.message || String(e),
    };
  }
}

/**
 * Deep Research - Claude Opus + Perplexity
 * Full investigation from scratch
 * @param {Object} params
 * @returns {Promise<{ok: boolean, investigation: Object | null, error?: string}>}
 */
async function runDeepResearch({ brandName, corporateParent, healthFlag, productCategory, costTracker }) {
  const startTime = Date.now();
  const step = costTracker.addStep('deep_research', 'claude-opus+perplexity', 15.0, null, 'started');

  try {
    // This will delegate to the existing investigation system
    // Import dynamically to avoid circular dependency
    const { realtimeInvestigation } = await import('./investigation.js');

    const result = await realtimeInvestigation(
      brandName,
      corporateParent,
      healthFlag,
      productCategory
    );

    step.durationMs = Date.now() - startTime;
    step.status = 'completed';

    return {
      ok: true,
      investigation: result.investigation || result,
      profileJsonForDb: result.profileJsonForDb,
    };
  } catch (e) {
    step.durationMs = Date.now() - startTime;
    step.status = 'failed';
    step.error = e?.message || String(e);

    console.error('[orchestrator] Deep research failed:', e);

    return {
      ok: false,
      investigation: null,
      error: e?.message || String(e),
    };
  }
}

/**
 * Main orchestration function
 * @param {Object} params
 * @returns {Promise<{
 *   investigation: Object,
 *   profileJsonForDb: Object | null,
 *   orchestration: {
 *     path: string,
 *     costSummary: Object,
 *     triageDecision: string,
 *   }
 * }>}
 */
export async function orchestrateInvestigation({
  brandName,
  corporateParent,
  healthFlag = false,
  productCategory,
  slug,
  forceFullResearch = false,
}) {
  const startTime = Date.now();
  const costTracker = new CostTracker();

  console.log('[orchestrator] starting', {
    brand: brandName || corporateParent || slug,
    healthFlag,
    productCategory,
    forceFullResearch,
  });

  let triageDecision;
  let cacheInfo;
  let investigation;
  let profileJsonForDb = null;
  let path;

  // Step 1: Triage (unless forced)
  if (forceFullResearch) {
    triageDecision = 'full_research';
    cacheInfo = { exists: false, ageDays: null, hasDeepResearch: false };
    costTracker.addStep('triage', 'forced', 0, 0, 'skipped_forced_full_research');
  } else {
    const triageStart = Date.now();
    const triage = await triageInvestigation({ brandName, corporateParent, slug });
    triageDecision = triage.decision;
    cacheInfo = triage.cacheInfo;
    costTracker.addStep('triage', 'ollama-local', 0, Date.now() - triageStart, 'completed');
  }

  // Step 2: Execute based on triage decision
  switch (triageDecision) {
    case 'use_cache': {
      // Return cached data
      const { getInvestigationProfile } = await import('./investigation.js');
      investigation = await getInvestigationProfile(brandName, corporateParent, {
        healthFlag,
        productCategory,
      });

      if (!investigation) {
        // Cache miss - fall back to full research
        console.log('[orchestrator] cache miss, falling back to full research');
        triageDecision = 'full_research_fallback';
        const deepResult = await runDeepResearch({
          brandName,
          corporateParent,
          healthFlag,
          productCategory,
          costTracker,
        });
        investigation = deepResult.investigation;
        profileJsonForDb = deepResult.profileJsonForDb;
        path = 'full_research_fallback';
      } else {
        investigation._orchestration_path = 'use_cache';
        investigation._cache_age_days = cacheInfo.ageDays;
        path = 'use_cache';
      }
      break;
    }

    case 'check_recent':
    case 'full_research': {
      if (triageDecision === 'check_recent') {
        // Step 2a: Check for recent news
        const recentNews = await checkRecentNews({
          brandName,
          corporateParent,
          days: Math.min(90, (cacheInfo.ageDays || 90) + 30),
        });

        if (recentNews.ok && !recentNews.hasNewDevelopments) {
          // No new developments - use cached data
          const { getInvestigationProfile } = await import('./investigation.js');
          investigation = await getInvestigationProfile(brandName, corporateParent, {
            healthFlag,
            productCategory,
          });

          if (investigation) {
            investigation._orchestration_path = 'check_recent_no_findings';
            investigation._last_checked_at = new Date().toISOString();
            path = 'check_recent_no_findings';
            break;
          }
          // Fall through to full research if cache miss
        }

        // Step 2b: Verify if findings exist
        if (recentNews.ok && recentNews.hasNewDevelopments) {
          const validFindings = validateFindings(recentNews.findings);

          // Get cached data first
          const { getInvestigationProfile } = await import('./investigation.js');
          const cached = await getInvestigationProfile(brandName, corporateParent, {
            healthFlag,
            productCategory,
          });

          if (cached) {
            // Verify and merge
            const verifyResult = await verifyWithClaude({
              cachedInvestigation: cached,
              recentFindings: validFindings,
              brandName,
              corporateParent,
              costTracker,
            });

            investigation = verifyResult.investigation;
            investigation._orchestration_path = 'check_recent_verified';
            investigation._recent_findings_count = validFindings.length;
            path = 'check_recent_verified';
            break;
          }
        }

        // Fall through to full research if verification failed or no cache
      }

      // Step 3: Full deep research
      const deepResult = await runDeepResearch({
        brandName,
        corporateParent,
        healthFlag,
        productCategory,
        costTracker,
      });

      investigation = deepResult.investigation;
      profileJsonForDb = deepResult.profileJsonForDb;
      investigation._orchestration_path = 'full_research';
      path = 'full_research';
      break;
    }
  }

  // Step 4: Validate source URLs before returning
  if (investigation && process.env.INVESTIGATION_VALIDATE_SOURCES !== '0') {
    try {
      const validationStart = Date.now();
      investigation = await validateInvestigationSources(investigation);
      costTracker.addStep(
        'source_validation',
        'source-validator',
        0, // No API cost for URL validation
        Date.now() - validationStart,
        'completed'
      );
    } catch (validationErr) {
      console.warn('[orchestrator] Source validation failed:', validationErr?.message);
      costTracker.addStep(
        'source_validation',
        'source-validator',
        0,
        0,
        'failed'
      );
      // Continue with unvalidated sources rather than failing completely
    }
  }

  const totalDuration = Date.now() - startTime;
  const costSummary = costTracker.getSummary();

  console.log('[orchestrator] complete', {
    brand: brandName || corporateParent || slug,
    path,
    totalDurationMs: totalDuration,
    estimatedCostUsd: costSummary.totalEstimatedCostUsd,
    steps: costSummary.stepCount,
  });

  return {
    investigation,
    profileJsonForDb,
    orchestration: {
      path,
      costSummary,
      triageDecision,
      totalDurationMs: totalDuration,
      completedAt: new Date().toISOString(),
    },
  };
}

/**
 * Get orchestration health/status
 * @returns {Promise<Object>}
 */
export async function getOrchestrationStatus() {
  const { checkOllamaHealth } = await import('./triageLLM.js');
  const ollamaHealth = await checkOllamaHealth();

  return {
    ollama: ollamaHealth,
    perplexity: {
      configured: Boolean(process.env.PERPLEXITY_API_KEY),
    },
    anthropic: {
      configured: Boolean(process.env.ANTHROPIC_API_KEY),
    },
    models: {
      verification: VERIFICATION_MODEL,
      deepResearch: DEEP_RESEARCH_MODEL,
    },
  };
}

/**
 * Cost estimates for different paths
 */
export const COST_ESTIMATES = {
  triage: 0,
  check_recent: 0.05,
  check_recent_verified: 0.55,
  full_research: 15.0,
  use_cache: 0,
};
