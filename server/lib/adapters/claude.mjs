/**
 * Claude Adapter for EthicalAlt
 * Cross-validation and corroboration layer using Claude Sonnet
 */

import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = 'claude-3-sonnet-20240229';

export const claudeAdapter = {
  name: 'claude',

  /**
   * Cross-validate findings from multiple sources
   * Identifies discrepancies and assesses confidence
   */
  async corroborate(companyName, findingsBySource, options = {}) {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    // Build prompt for cross-validation
    const prompt = this._buildCorroborationPrompt(companyName, findingsBySource);

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      temperature: 0.2,
      system: `You are a research analyst specializing in corporate accountability.
Your task is to cross-validate findings from multiple sources and identify:
1. Corroborated facts (found in multiple independent sources)
2. Discrepancies between sources
3. Claims that need human review (isolated, unverified, or contradictory)
4. Overall confidence assessment

Be conservative. Only mark facts as "corroborated" if they appear in multiple independent sources.
Flag any findings that cannot be independently verified.

Respond in JSON format only.`,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0]?.text || '';

    // Parse JSON response
    let result;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                       content.match(/{[\s\S]*}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      result = JSON.parse(jsonStr);
    } catch (err) {
      // Fallback to structured extraction
      result = this._extractStructured(content);
    }

    return {
      source: 'claude',
      company: companyName,
      corroboration: result,
      sourcesAnalyzed: Object.keys(findingsBySource),
      findingsCount: Object.values(findingsBySource)
        .reduce((sum, f) => sum + (f.findings?.length || 0), 0),
      processedAt: new Date().toISOString(),
      model: CLAUDE_MODEL,
    };
  },

  _buildCorroborationPrompt(companyName, findingsBySource) {
    const sources = Object.entries(findingsBySource)
      .filter(([_, data]) => data.findings?.length > 0)
      .map(([source, data]) => ({
        source,
        findings: data.findings,
      }));

    if (sources.length === 0) {
      return `No findings to corroborate for ${companyName}.`;
    }

    return `Cross-validate the following findings about ${companyName} from ${sources.length} different sources:

${sources.map(s => `
## Source: ${s.source.toUpperCase()}
${s.findings.map((f, i) => `
Finding ${i + 1}:
- Type: ${f.type}
- Summary: ${f.summary}
- Date: ${f.date || f.dateRange?.latest || 'unknown'}
- Confidence: ${f.confidence}
${f.amount ? `- Amount: ${f.amount}` : ''}
`).join('')}
`).join('')}

Please analyze and provide:

1. CORROBORATED FINDINGS: List facts that appear in multiple independent sources (with source citations)

2. DISCREPANCIES: Note any contradictions or inconsistencies between sources

3. ISOLATED CLAIMS: Flag findings that appear in only one source and cannot be verified

4. CONFIDENCE ASSESSMENT: Overall confidence score (0-1) with reasoning

5. HUMAN REVIEW FLAGS: List any findings that require manual verification

Respond in this JSON format:
{
  "corroborated": [
    {
      "fact": "description",
      "sources": ["source1", "source2"],
      "confidence": 0.9
    }
  ],
  "discrepancies": [
    {
      "issue": "description of contradiction",
      "sources_involved": ["source1", "source2"]
    }
  ],
  "isolated_claims": [
    {
      "claim": "description",
      "source": "source name",
      "reason": "why it needs verification"
    }
  ],
  "confidence_score": 0.7,
  "confidence_reasoning": "explanation",
  "human_review_required": ["list of specific items"]
}`;
  },

  _extractStructured(content) {
    // Fallback extraction if JSON parsing fails
    const corroborated = [];
    const discrepancies = [];
    const isolated = [];
    const humanReview = [];

    // Simple pattern matching
    const sections = content.split(/\n##?\s+/);

    for (const section of sections) {
      const lower = section.toLowerCase();

      if (lower.includes('corroborat')) {
        // Extract bullet points
        const bullets = section.match(/[-•]\s+(.+)/g) || [];
        bullets.forEach(b => {
          const text = b.replace(/^[-•]\s+/, '');
          corroborated.push({ fact: text, sources: [], confidence: 0.5 });
        });
      }

      if (lower.includes('discrepanc')) {
        const bullets = section.match(/[-•]\s+(.+)/g) || [];
        bullets.forEach(b => {
          discrepancies.push({ issue: b.replace(/^[-•]\s+/, ''), sources_involved: [] });
        });
      }

      if (lower.includes('isolated') || lower.includes('unverified')) {
        const bullets = section.match(/[-•]\s+(.+)/g) || [];
        bullets.forEach(b => {
          isolated.push({ claim: b.replace(/^[-•]\s+/, ''), source: 'unknown', reason: 'isolated claim' });
        });
      }

      if (lower.includes('human review')) {
        const bullets = section.match(/[-•]\s+(.+)/g) || [];
        bullets.forEach(b => humanReview.push(b.replace(/^[-•]\s+/, '')));
      }
    }

    return {
      corroborated,
      discrepancies,
      isolated_claims: isolated,
      confidence_score: 0.5,
      confidence_reasoning: 'Extracted from unstructured response',
      human_review_required: humanReview,
    };
  },

  /**
   * Generate a final synthesized report
   */
  async synthesize(companyName, corroborationResult, options = {}) {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const prompt = `Write a concise investigative summary about ${companyName} based on the following corroborated findings:

${JSON.stringify(corroborationResult.corroborated, null, 2)}

Also note these discrepancies requiring review:
${JSON.stringify(corroborationResult.discrepancies, null, 2)}

Guidelines:
- Use neutral, factual language
- Cite specific sources where claims are corroborated
- Note confidence levels
- Include a disclaimer that this is based on public records
- Do not assert guilt or wrongdoing beyond what's documented
- Keep to 3-5 paragraphs`;

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      summary: response.content[0]?.text || '',
      model: CLAUDE_MODEL,
      generatedAt: new Date().toISOString(),
    };
  },
};

export default claudeAdapter;
