/**
 * SEC Adapter for EthicalAlt
 * Uses SEC EDGAR API for company filings and enforcement
 */

const SEC_BASE_URL = 'https://www.sec.gov';
const SEC_DATA_URL = 'https://data.sec.gov';

// Rate limiting - SEC requires max 10 requests per second
const REQUEST_DELAY = 100;

export const secAdapter = {
  name: 'sec',

  async search(companyName, options = {}) {
    // Step 1: Find CIK by company name or ticker
    const tickerInfo = await this._findTicker(companyName);

    if (!tickerInfo) {
      return {
        source: 'sec',
        company: companyName,
        findings: [],
        filings: [],
        searchedAt: new Date().toISOString(),
        note: 'No SEC-registered company found for this name',
      };
    }

    // Step 2: Get recent filings
    const filings = await this._getFilings(tickerInfo.cik);

    // Step 3: Look for relevant filing types
    const relevantFilings = this._filterRelevantFilings(filings);

    // Convert to findings
    const findings = this._filingsToFindings(relevantFilings, companyName, tickerInfo);

    return {
      source: 'sec',
      company: companyName,
      ticker: tickerInfo.ticker,
      cik: tickerInfo.cik,
      findings,
      filings: relevantFilings.slice(0, 10), // Top 10 relevant
      totalFilings: filings.length,
      searchedAt: new Date().toISOString(),
    };
  },

  async _findTicker(companyName) {
    // Get company tickers JSON
    const response = await fetch(`${SEC_BASE_URL}/files/company_tickers.json`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EthicalAlt Research Bot contact@ethicalalt.org',
      },
    });

    if (!response.ok) {
      throw new Error(`SEC tickers API error: ${response.status}`);
    }

    const data = await response.json();
    const companies = Object.values(data);

    const searchName = companyName.toLowerCase();

    // Try exact match on title
    let match = companies.find(c =>
      c.title.toLowerCase() === searchName
    );

    // Try partial match
    if (!match) {
      match = companies.find(c =>
        c.title.toLowerCase().includes(searchName) ||
        searchName.includes(c.title.toLowerCase())
      );
    }

    // Try matching first word
    if (!match) {
      const firstWord = searchName.split(' ')[0];
      match = companies.find(c =>
        c.title.toLowerCase().startsWith(firstWord)
      );
    }

    if (!match) return null;

    return {
      ticker: match.ticker,
      cik: match.cik_str.toString().padStart(10, '0'),
      name: match.title,
    };
  },

  async _getFilings(cik) {
    await this._rateLimit();

    const response = await fetch(`${SEC_DATA_URL}/submissions/CIK${cik}.json`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EthicalAlt Research Bot contact@ethicalalt.org',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No filings found
      }
      throw new Error(`SEC filings API error: ${response.status}`);
    }

    const data = await response.json();
    const recent = data.filings?.recent || {};

    const filings = [];
    const forms = recent.form || [];
    const dates = recent.filingDate || [];
    const descriptions = recent.primaryDocDescription || [];
    const accessionNumbers = recent.accessionNumber || [];

    for (let i = 0; i < forms.length; i++) {
      filings.push({
        form: forms[i],
        date: dates[i],
        description: descriptions[i] || '',
        accessionNumber: accessionNumbers[i],
        cik: cik,
        url: this._buildFilingUrl(cik, accessionNumbers[i]),
      });
    }

    return filings;
  },

  _buildFilingUrl(cik, accessionNumber) {
    if (!accessionNumber) return null;
    const cleanAcc = accessionNumber.replace(/-/g, '');
    return `${SEC_BASE_URL}/Archives/edgar/data/${parseInt(cik)}/${cleanAcc}/${accessionNumber}-index.htm`;
  },

  _filterRelevantFilings(filings) {
    // Relevant forms for accountability research
    const relevantForms = [
      '8-K',      // Current reports (includes material events)
      '10-K',     // Annual reports
      '10-Q',     // Quarterly reports
      'DEF 14A',  // Proxy statements
      'SC 13D',   // Beneficial ownership
      'SC 13G',
      '4',        // Insider trading
      '3',
      '5',
      'SD',       // Conflict minerals
      'NT',       // Notice of late filing
    ];

    return filings.filter(f => {
      if (!relevantForms.includes(f.form)) return false;

      // Look for keywords indicating issues
      const desc = f.description.toLowerCase();
      const issueKeywords = [
        'restat', 'investigation', 'settlement', 'litigation',
        'violation', 'penalty', 'fine', 'compliance', 'material',
        'bankruptcy', 'delist', 'resign', 'termination'
      ];

      return issueKeywords.some(kw => desc.includes(kw));
    });
  },

  _filingsToFindings(filings, companyName, tickerInfo) {
    if (filings.length === 0) return [];

    const findings = [];

    // Group by type
    const byType = {};
    for (const f of filings) {
      const type = this._classifyFiling(f);
      if (!byType[type]) byType[type] = [];
      byType[type].push(f);
    }

    // Create findings for each type
    for (const [type, typeFilings] of Object.entries(byType)) {
      const latest = typeFilings[0]; // Already sorted by date

      findings.push({
        type: 'financial',
        subtype: type,
        summary: `${typeFilings.length} ${type}-related SEC filing(s) for ${tickerInfo.name}`,
        ticker: tickerInfo.ticker,
        cik: tickerInfo.cik,
        filingCount: typeFilings.length,
        latestFiling: {
          form: latest.form,
          date: latest.date,
          description: latest.description,
          url: latest.url,
        },
        dateRange: typeFilings.length > 1 ? {
          earliest: typeFilings[typeFilings.length - 1].date,
          latest: typeFilings[0].date,
        } : null,
        confidence: typeFilings.length > 2 ? 'high' : 'medium',
        sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${tickerInfo.cik}`,
      });
    }

    return findings;
  },

  _classifyFiling(filing) {
    const desc = filing.description.toLowerCase();

    if (desc.includes('restat')) return 'restatement';
    if (desc.includes('investigation')) return 'investigation';
    if (desc.includes('settlement') || desc.includes('litigation')) return 'litigation';
    if (desc.includes('compliance') || desc.includes('violation')) return 'compliance';
    if (desc.includes('bankruptcy')) return 'bankruptcy';
    if (desc.includes('resign') || desc.includes('termination')) return 'executive_change';
    if (desc.includes('delist')) return 'delisting';

    return 'disclosure';
  },

  async _rateLimit() {
    return new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
  },
};

export default secAdapter;
