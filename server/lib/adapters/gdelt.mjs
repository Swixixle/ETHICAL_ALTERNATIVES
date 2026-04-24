/**
 * GDELT Adapter for EthicalAlt
 * Queries GDELT 2.0 GKG API for news/media coverage
 */

const GDELT_API_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';

export const gdeltAdapter = {
  name: 'gdelt',

  async search(companyName, options = {}) {
    // Build search query - look for accountability-related terms
    const searchTerms = [
      `"${companyName}" AND (violation OR fine OR settlement OR lawsuit OR enforcement)`,
      `"${companyName}" AND (fraud OR misconduct OR penalty OR sanction)`,
      `"${companyName}" AND (discrimination OR harassment OR labor OR worker)`,
      `"${companyName}" AND (environmental OR pollution OR emission OR EPA)`,
    ];

    const allArticles = [];

    for (const query of searchTerms) {
      try {
        const articles = await this._fetchArticles(query, options);
        allArticles.push(...articles);
      } catch (err) {
        console.warn(`GDELT query failed for "${query}":`, err.message);
      }
    }

    // Deduplicate by URL
    const seen = new Set();
    const uniqueArticles = allArticles.filter(article => {
      if (seen.has(article.url)) return false;
      seen.add(article.url);
      return true;
    });

    // Sort by date (newest first)
    uniqueArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Convert to findings format
    const findings = this._articlesToFindings(uniqueArticles, companyName);

    return {
      source: 'gdelt',
      company: companyName,
      findings,
      articles: uniqueArticles.slice(0, 20), // Top 20 articles
      totalArticles: uniqueArticles.length,
      searchedAt: new Date().toISOString(),
    };
  },

  async _fetchArticles(query, options = {}) {
    const params = new URLSearchParams({
      query: query,
      mode: 'ArtList',
      maxrecords: '40',
      sort: 'DateDesc',
      format: 'json',
    });

    // Default to last 3 months if no date range specified
    const endDate = options.endDate || new Date();
    const startDate = options.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    params.append('startdatetime', this._formatDate(startDate));
    params.append('enddatetime', this._formatDate(endDate));

    const response = await fetch(`${GDELT_API_URL}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GDELT API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.articles || []).map(article => ({
      title: article.title,
      url: article.url,
      source: article.source || 'Unknown',
      date: article.seendate || article.date,
      tone: article.tone || null,
      sentiment: this._interpretTone(article.tone),
    }));
  },

  _formatDate(date) {
    const d = new Date(date);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  },

  _interpretTone(tone) {
    if (!tone) return 'neutral';
    const toneNum = parseFloat(tone);
    if (isNaN(toneNum)) return 'unknown';
    if (toneNum < -2) return 'very_negative';
    if (toneNum < 0) return 'negative';
    if (toneNum > 2) return 'very_positive';
    if (toneNum > 0) return 'positive';
    return 'neutral';
  },

  _articlesToFindings(articles, companyName) {
    const findings = [];

    // Group articles by theme
    const themes = {
      environmental: articles.filter(a =>
        /environment|pollution|emission|EPA|climate|carbon/i.test(a.title)),
      labor: articles.filter(a =>
        /labor|worker|wage|employee|union|strike/i.test(a.title)),
      financial: articles.filter(a =>
        /fraud|SEC|securities|financial|accounting|audit/i.test(a.title)),
      legal: articles.filter(a =>
        /lawsuit|settlement|court|litigation|verdict/i.test(a.title)),
      regulatory: articles.filter(a =>
        /fine|penalty|enforcement|violation|sanction|regulator/i.test(a.title)),
    };

    for (const [theme, themeArticles] of Object.entries(themes)) {
      if (themeArticles.length === 0) continue;

      // Create a finding for this theme
      const topArticles = themeArticles.slice(0, 3);
      findings.push({
        type: theme,
        summary: `Media coverage indicates ${themeArticles.length} article(s) about ${theme} issues`,
        articles: topArticles.map(a => ({
          title: a.title,
          url: a.url,
          source: a.source,
          date: a.date,
        })),
        articleCount: themeArticles.length,
        dateRange: this._getDateRange(themeArticles),
        confidence: themeArticles.length > 5 ? 'high' : 'medium',
      });
    }

    return findings;
  },

  _getDateRange(articles) {
    const dates = articles
      .map(a => new Date(a.date))
      .filter(d => !isNaN(d));

    if (dates.length === 0) return null;

    dates.sort((a, b) => a - b);
    return {
      earliest: dates[0].toISOString().slice(0, 10),
      latest: dates[dates.length - 1].toISOString().slice(0, 10),
    };
  },
};

export default gdeltAdapter;
