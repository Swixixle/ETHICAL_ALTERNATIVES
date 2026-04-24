/**
 * Recent News Check - Perplexity Sonar ($0.05/call)
 * Searches last 30-90 days for new enforcement actions
 * Returns structured findings
 */

import { recordProviderSuccess, recordProviderFailure } from './aiProvider.js';

const PERPLEXITY_MODEL = process.env.PERPLEXITY_RECENT_NEWS_MODEL || 'sonar';
const PERPLEXITY_TIMEOUT_MS = Number(process.env.PERPLEXITY_TIMEOUT_MS || 45000);

/**
 * Build Perplexity prompt for recent news check
 * @param {Object} params
 * @returns {string}
 */
function buildRecentNewsPrompt({ brandName, corporateParent, days = 90 }) {
  const primary = [brandName, corporateParent].filter(Boolean).join(' / ') || 'unknown entity';

  return `Search for ANY new legal, regulatory, labor, environmental, tax, or political developments for "${primary}" in the last ${days} days.

Focus on:
- New lawsuits filed
- Regulatory enforcement actions (FTC, SEC, EPA, OSHA, NLRB, DOJ)
- Settlements announced
- Labor violations or strikes
- Environmental incidents
- Political/controversial news
- Tax disputes

Search broadly. Include the parent company and subsidiaries if relevant.

Return a JSON object with this exact structure:
{
  "has_new_developments": boolean,
  "findings": [
    {
      "date": "YYYY-MM-DD or approximate",
      "category": "legal" | "labor" | "tax" | "environmental" | "political" | "regulatory",
      "title": "brief title",
      "description": "1-2 sentences",
      "source_url": "primary source URL",
      "severity": "critical" | "significant" | "moderate" | "minor"
    }
  ],
  "summary": "One paragraph summary of new developments, or state if none found"
}

If no new developments, set has_new_developments: false and findings: [].
Be precise with dates and sources. No markdown fences, just the JSON.`;
}

/**
 * Call Perplexity API for recent news
 * @param {Object} params
 * @returns {Promise<{
 *   ok: boolean,
 *   hasNewDevelopments: boolean,
 *   findings: Array,
 *   summary: string,
 *   rawResponse?: string,
 *   error?: string
 * }>}
 */
export async function checkRecentNews({ brandName, corporateParent, days = 90 }) {
  const startTime = Date.now();
  const key = process.env.PERPLEXITY_API_KEY;

  if (!key) {
    return {
      ok: false,
      hasNewDevelopments: false,
      findings: [],
      summary: 'Perplexity API key not configured',
      error: 'PERPLEXITY_API_KEY not set',
    };
  }

  const prompt = buildRecentNewsPrompt({ brandName, corporateParent, days });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT_MS);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Perplexity HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('Perplexity returned empty content');
    }

    // Parse JSON from response
    let parsed;
    try {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      console.warn('[recentNewsCheck] JSON parse failed, attempting repair:', parseErr.message);
      // Return raw response for manual review
      recordProviderSuccess('perplexity'); // Still count as success since API worked
      return {
        ok: true,
        hasNewDevelopments: true, // Conservative: assume there might be something
        findings: [],
        summary: 'New developments may exist but could not be parsed. Manual review recommended.',
        rawResponse: text.slice(0, 2000),
      };
    }

    const findings = Array.isArray(parsed.findings) ? parsed.findings : [];
    const hasNewDevelopments = parsed.has_new_developments === true || findings.length > 0;

    recordProviderSuccess('perplexity');

    const duration = Date.now() - startTime;
    console.log('[recentNewsCheck] complete', {
      brand: brandName || corporateParent,
      hasNewDevelopments,
      findingsCount: findings.length,
      durationMs: duration,
    });

    return {
      ok: true,
      hasNewDevelopments,
      findings,
      summary: parsed.summary || '',
    };
  } catch (e) {
    recordProviderFailure('perplexity');

    const duration = Date.now() - startTime;
    console.error('[recentNewsCheck] failed', {
      brand: brandName || corporateParent,
      error: e?.message || e,
      durationMs: duration,
    });

    return {
      ok: false,
      hasNewDevelopments: true, // Conservative: assume there might be new developments
      findings: [],
      summary: 'Recent news check failed. Proceeding with verification.',
      error: e?.message || String(e),
    };
  }
}

/**
 * Validate findings from recent news check
 * @param {Array} findings
 * @returns {Array}
 */
export function validateFindings(findings) {
  if (!Array.isArray(findings)) return [];

  const validCategories = new Set(['legal', 'labor', 'tax', 'environmental', 'political', 'regulatory']);
  const validSeverities = new Set(['critical', 'significant', 'moderate', 'minor']);

  return findings
    .filter(f => f && typeof f === 'object')
    .map(f => ({
      date: typeof f.date === 'string' ? f.date : null,
      category: validCategories.has(f.category) ? f.category : 'regulatory',
      title: typeof f.title === 'string' ? f.title : 'Untitled',
      description: typeof f.description === 'string' ? f.description : '',
      source_url: typeof f.source_url === 'string' ? f.source_url : '',
      severity: validSeverities.has(f.severity) ? f.severity : 'moderate',
    }));
}

/**
 * Calculate cost estimate for recent news check
 * @returns {number} Estimated cost in USD
 */
export function getRecentNewsCostEstimate() {
  // Perplexity Sonar: ~$0.05 per 1K tokens (input + output)
  // Typical recent news check: ~800 input + ~1200 output = 2000 tokens
  return 0.05;
}
