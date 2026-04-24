/**
 * Perplexity Adapter for EthicalAlt
 * Uses Perplexity Sonar API for web search + synthesis
 */

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_MODEL = 'llama-3.1-sonar-large-128k-online';

export const perplexityAdapter = {
  name: 'perplexity',

  async search(companyName, options = {}) {
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const prompt = `Search for corporate accountability issues, labor violations, environmental violations,
fraud allegations, lawsuits, or regulatory actions involving ${companyName}.
Focus on factual, verifiable incidents with dates and sources.
Be thorough but concise. Include specific details like dates, fine amounts, and regulatory agencies involved.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          { role: 'system', content: 'You are a research assistant focused on corporate accountability. Provide factual information with citations.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    // Parse findings from the response
    const findings = this._parseFindings(content, companyName);

    return {
      source: 'perplexity',
      company: companyName,
      findings,
      citations,
      raw: content,
      searchedAt: new Date().toISOString(),
    };
  },

  _parseFindings(content, companyName) {
    const findings = [];

    // Split into paragraphs and look for incident patterns
    const paragraphs = content.split('\n\n');

    for (const para of paragraphs) {
      if (para.length < 50) continue;

      // Look for patterns indicating violations/incidents
      const violationKeywords = [
        'violation', 'fine', 'penalty', 'settlement', 'lawsuit', 'litigation',
        'enforcement', 'sanction', 'breach', 'misconduct', 'fraud',
        'discrimination', 'harassment', 'emissions', 'pollution', 'violated'
      ];

      const hasViolation = violationKeywords.some(kw =>
        para.toLowerCase().includes(kw)
      );

      if (hasViolation) {
        // Try to extract date
        const dateMatch = para.match(/\b(20\d{2}|19\d{2})\b/) ||
                         para.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i);

        // Try to extract amount
        const amountMatch = para.match(/\$[\d,]+(?:\.\d{2})?\s*(?:million|billion)?/i) ||
                           para.match(/\d+\s*million\s*dollars/i);

        findings.push({
          type: this._classifyFinding(para),
          summary: para.slice(0, 500),
          date: dateMatch ? dateMatch[0] : null,
          amount: amountMatch ? amountMatch[0] : null,
          confidence: 'medium',
        });
      }
    }

    return findings;
  },

  _classifyFinding(text) {
    const lower = text.toLowerCase();
    if (lower.includes('environment') || lower.includes('pollution') || lower.includes('emission')) {
      return 'environmental';
    }
    if (lower.includes('labor') || lower.includes('wage') || lower.includes('worker') || lower.includes('employee')) {
      return 'labor';
    }
    if (lower.includes('discrimination') || lower.includes('harassment')) {
      return 'discrimination';
    }
    if (lower.includes('fraud') || lower.includes('securities') || lower.includes('financial')) {
      return 'financial';
    }
    if (lower.includes('safety') || lower.includes('injury')) {
      return 'safety';
    }
    if (lower.includes('antitrust') || lower.includes('monopoly') || lower.includes('competition')) {
      return 'antitrust';
    }
    return 'regulatory';
  },
};

export default perplexityAdapter;
