/**
 * Source URL Validator
 * Validates URLs before storing to prevent broken/fake links
 * Includes archive.org fallback for dead links
 */

import { setTimeout as sleep } from 'node:timers/promises';

// URL patterns that are obviously invalid
const INVALID_URL_PATTERNS = [
  /^https?:\/\/localhost($|[\/:?])/i,
  /^https?:\/\/127\.[0-9]+\.[0-9]+\.[0-9]+/i,
  /^https?:\/\/192\.168\.[0-9]+\.[0-9]+/i,
  /^https?:\/\/10\.[0-9]+\.[0-9]+\.[0-9]+/i,
  /^https?:\/\/172\.(1[6-9]|2[0-9]|3[01])\.[0-9]+\.[0-9]+/i,
  /^https?:\/\/example\.com/i,
  /^https?:\/\/test\.com/i,
  /^https?:\/\/fake\.com/i,
  /^https?:\/\/placeholder\.com/i,
  /^https?:\/\/\.\.\.\./i,  // Ellipsis URLs
  /\.example\//i,
  /\.test\//i,
  /\.local\//i,
  /\[URL\]/i,  // Template markers
  /\{URL\}/i,
  /\$\{.*\}/,  // Template variables
];

// Whitelist of known good domains (reduces validation overhead)
const TRUSTED_DOMAINS = new Set([
  'sec.gov',
  'ftc.gov',
  'epa.gov',
  'osha.gov',
  'nlrb.gov',
  'justice.gov',
  'courts.gov',
  'uscourts.gov',
  'reuters.com',
  'bloomberg.com',
  'wsj.com',
  'nytimes.com',
  'washingtonpost.com',
  'theguardian.com',
  'bbc.com',
  'cnn.com',
  'forbes.com',
  'fortune.com',
  'businessinsider.com',
  'cnbc.com',
  'apnews.com',
  'npr.org',
  'propublica.org',
  'opensecrets.org',
  'buzzfeednews.com',
  'vice.com',
  'wired.com',
  'techcrunch.com',
  'axios.com',
  'politico.com',
  'theverge.com',
  'arstechnica.com',
  'slate.com',
  'vox.com',
  'motherjones.com',
  'theintercept.com',
  'levernews.com',
  'popular.info',
  'corporateaccountability.org',
  'corp-research.org',
  'goodjobsfirst.org',
  'violationtracker.org',
]);

// Maximum time to wait for a URL check
const VALIDATION_TIMEOUT_MS = 8000;
const BATCH_DELAY_MS = 100;

/**
 * Check if URL is obviously invalid (format, localhost, etc)
 * @param {string} url
 * @returns {boolean}
 */
export function isObviouslyInvalidUrl(url) {
  if (!url || typeof url !== 'string') return true;

  const trimmed = url.trim();
  if (!trimmed) return true;

  // Must start with http:// or https://
  if (!/^https?:\/\//i.test(trimmed)) return true;

  // Check against invalid patterns
  for (const pattern of INVALID_URL_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // Must have a valid-looking domain
  try {
    const urlObj = new URL(trimmed);
    if (!urlObj.hostname || urlObj.hostname.length < 3) return true;
    if (!urlObj.hostname.includes('.')) return true;
    if (urlObj.hostname.startsWith('.')) return true;
    if (urlObj.hostname.endsWith('.')) return true;
  } catch {
    return true;
  }

  return false;
}

/**
 * Extract domain from URL
 * @param {string} url
 * @returns {string | null}
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Check if domain is in trusted list
 * @param {string} url
 * @returns {boolean}
 */
function isTrustedDomain(url) {
  const domain = extractDomain(url);
  if (!domain) return false;

  // Check exact match
  if (TRUSTED_DOMAINS.has(domain)) return true;

  // Check parent domains
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const parentDomain = parts.slice(i).join('.');
    if (TRUSTED_DOMAINS.has(parentDomain)) return true;
  }

  return false;
}

/**
 * Fetch with timeout and HEAD request (lighter than GET)
 * @param {string} url
 * @returns {Promise<{ok: boolean, status: number, redirected: boolean}>}
 */
async function checkUrlHead(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
    });

    clearTimeout(timeoutId);

    return {
      ok: response.ok,
      status: response.status,
      redirected: response.redirected,
      finalUrl: response.url,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      status: 0,
      redirected: false,
      error: error.message,
    };
  }
}

/**
 * Try to get archive.org version of a URL
 * @param {string} url
 * @returns {Promise<string | null>}
 */
export async function getArchiveOrgUrl(url) {
  try {
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `https://web.archive.org/web/20240000000000*/${encodedUrl}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; URLValidator/1.0)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    // Try to find the most recent snapshot
    const html = await response.text();
    const match = html.match(/web\.archive\.org\/web\/(\d+)\//);

    if (match) {
      return `https://web.archive.org/web/${match[1]}/${url}`;
    }

    // Fallback to generic snapshot URL
    return `https://web.archive.org/web/*/${url}`;
  } catch {
    return null;
  }
}

/**
 * Validate a single URL
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<{valid: boolean, url: string, originalUrl: string, method: string, archiveUrl?: string, error?: string}>}
 */
export async function validateUrl(url, options = {}) {
  const { useArchiveFallback = true, skipValidation = false } = options;

  const originalUrl = url;

  // Step 1: Check if obviously invalid
  if (isObviouslyInvalidUrl(url)) {
    return {
      valid: false,
      url: null,
      originalUrl,
      method: 'pattern_rejected',
      error: 'URL failed pattern validation (localhost, example.com, template, etc)',
    };
  }

  // Step 2: Skip validation for trusted domains (performance optimization)
  if (skipValidation || isTrustedDomain(url)) {
    return {
      valid: true,
      url: originalUrl,
      originalUrl,
      method: 'trusted_domain',
    };
  }

  // Step 3: Actually check the URL
  const check = await checkUrlHead(url);

  if (check.ok) {
    return {
      valid: true,
      url: check.finalUrl || originalUrl,
      originalUrl,
      method: 'head_request',
      status: check.status,
      redirected: check.redirected,
    };
  }

  // Step 4: Try archive.org fallback
  if (useArchiveFallback) {
    const archiveUrl = await getArchiveOrgUrl(originalUrl);
    if (archiveUrl) {
      return {
        valid: true,
        url: archiveUrl,
        originalUrl,
        method: 'archive_fallback',
        archiveUrl,
        error: `Original URL failed: ${check.error || `HTTP ${check.status}`}`,
      };
    }
  }

  // Step 5: URL is invalid and no fallback available
  return {
    valid: false,
    url: null,
    originalUrl,
    method: 'validation_failed',
    status: check.status,
    error: check.error || `HTTP ${check.status}`,
  };
}

/**
 * Extract all URLs from an investigation object
 * @param {Object} investigation
 * @returns {Array<{url: string, field: string, index?: number}>}
 */
export function extractUrlsFromInvestigation(investigation) {
  const urls = [];

  if (!investigation || typeof investigation !== 'object') return urls;

  // Source arrays
  const sourceFields = [
    'tax_sources',
    'legal_sources',
    'labor_sources',
    'environmental_sources',
    'political_sources',
    'executive_sources',
    'product_health_sources',
  ];

  for (const field of sourceFields) {
    const sources = investigation[field];
    if (Array.isArray(sources)) {
      for (let i = 0; i < sources.length; i++) {
        const url = sources[i];
        if (typeof url === 'string' && url.trim()) {
          urls.push({ url: url.trim(), field, index: i });
        }
      }
    }
  }

  // Timeline events
  if (Array.isArray(investigation.timeline)) {
    for (let i = 0; i < investigation.timeline.length; i++) {
      const event = investigation.timeline[i];
      if (event?.source_url && typeof event.source_url === 'string') {
        urls.push({ url: event.source_url.trim(), field: 'timeline', index: i });
      }
    }
  }

  return urls;
}

/**
 * Update investigation with validated URLs
 * @param {Object} investigation
 * @param {Array} validationResults
 * @returns {Object} Modified investigation
 */
export function updateInvestigationWithValidatedUrls(investigation, validationResults) {
  if (!investigation || !Array.isArray(validationResults)) return investigation;

  const modified = { ...investigation };
  const failedUrls = [];
  const archiveReplacements = [];

  // Group results by field
  const byField = {};
  for (const result of validationResults) {
    if (!result.field) continue;
    if (!byField[result.field]) byField[result.field] = [];
    byField[result.field].push(result);
  }

  // Update source arrays
  for (const [field, results] of Object.entries(byField)) {
    if (field === 'timeline') continue;

    if (Array.isArray(modified[field])) {
      const newArray = [...modified[field]];

      for (const result of results) {
        if (typeof result.index !== 'number') continue;

        if (result.valid && result.url) {
          // Replace with validated URL (may be archive fallback)
          if (result.url !== result.originalUrl) {
            newArray[result.index] = result.url;
            if (result.method === 'archive_fallback') {
              archiveReplacements.push({
                field,
                index: result.index,
                original: result.originalUrl,
                replacement: result.url,
              });
            }
          }
        } else {
          // Mark as invalid but keep for reference
          failedUrls.push({
            field,
            index: result.index,
            url: result.originalUrl,
            error: result.error,
          });
          // Remove invalid URL from array
          newArray[result.index] = null;
        }
      }

      // Filter out null entries
      modified[field] = newArray.filter(u => u !== null);
    }
  }

  // Update timeline
  if (byField.timeline && Array.isArray(modified.timeline)) {
    modified.timeline = modified.timeline.map((event, idx) => {
      const result = byField.timeline.find(r => r.index === idx);
      if (!result) return event;

      if (result.valid && result.url) {
        if (result.url !== result.originalUrl && result.method === 'archive_fallback') {
          archiveReplacements.push({
            field: 'timeline',
            index: idx,
            original: result.originalUrl,
            replacement: result.url,
          });
        }
        return { ...event, source_url: result.url };
      } else {
        failedUrls.push({
          field: 'timeline',
          index: idx,
          url: result.originalUrl,
          error: result.error,
        });
        // Remove invalid URL
        const { source_url, ...rest } = event;
        return rest;
      }
    });
  }

  // Add validation metadata
  modified._source_validation = {
    validated_at: new Date().toISOString(),
    total_urls: validationResults.length,
    valid_count: validationResults.filter(r => r.valid).length,
    invalid_count: validationResults.filter(r => !r.valid).length,
    archive_replacements: archiveReplacements.length,
    failed_urls: failedUrls.slice(0, 20), // Limit stored failures
    archive_replacement_details: archiveReplacements.slice(0, 10),
  };

  return modified;
}

/**
 * Batch validate URLs with rate limiting
 * @param {Array<string>} urls
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export async function batchValidateUrls(urls, options = {}) {
  const {
    concurrency = 5,
    useArchiveFallback = true,
    skipTrustedDomains = true,
  } = options;

  const uniqueUrls = [...new Set(urls.filter(u => typeof u === 'string'))];
  const results = [];

  // Process in batches
  for (let i = 0; i < uniqueUrls.length; i += concurrency) {
    const batch = uniqueUrls.slice(i, i + concurrency);

    const batchPromises = batch.map(async (url) => {
      const result = await validateUrl(url, {
        useArchiveFallback,
        skipValidation: skipTrustedDomains && isTrustedDomain(url),
      });
      await sleep(BATCH_DELAY_MS); // Rate limiting
      return result;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Main validation function for investigations
 * @param {Object} investigation
 * @returns {Promise<Object>}
 */
export async function validateInvestigationSources(investigation) {
  const startTime = Date.now();

  const urls = extractUrlsFromInvestigation(investigation);

  if (urls.length === 0) {
    return {
      ...investigation,
      _source_validation: {
        validated_at: new Date().toISOString(),
        total_urls: 0,
        valid_count: 0,
        invalid_count: 0,
        duration_ms: 0,
      },
    };
  }

  console.log(`[sourceValidator] Validating ${urls.length} URLs...`);

  // Batch validate all URLs
  const validationResults = await batchValidateUrls(
    urls.map(u => u.url),
    { concurrency: 5, useArchiveFallback: true }
  );

  // Re-attach field/index info to results
  const enrichedResults = validationResults.map((result, idx) => ({
    ...result,
    field: urls[idx]?.field,
    index: urls[idx]?.index,
  }));

  // Update investigation
  const modified = updateInvestigationWithValidatedUrls(investigation, enrichedResults);

  const duration = Date.now() - startTime;
  const validCount = enrichedResults.filter(r => r.valid).length;
  const archiveCount = enrichedResults.filter(r => r.method === 'archive_fallback').length;

  console.log(`[sourceValidator] Complete: ${validCount}/${urls.length} valid, ${archiveCount} archive fallbacks, ${duration}ms`);

  // Update duration in metadata
  if (modified._source_validation) {
    modified._source_validation.duration_ms = duration;
  }

  return modified;
}

/**
 * Quick check if a URL is likely valid (for UI hints)
 * @param {string} url
 * @returns {boolean}
 */
export function isLikelyValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (isObviouslyInvalidUrl(url)) return false;

  // Trusted domains are likely valid
  if (isTrustedDomain(url)) return true;

  // Archive.org URLs are valid
  if (url.includes('web.archive.org')) return true;

  // Government domains are likely valid
  if (/\.gov\//i.test(url) || url.endsWith('.gov')) return true;

  // Major news domains
  if (/\.(reuters|bloomberg|nytimes|washingtonpost|bbc|theguardian)\.com/i.test(url)) {
    return true;
  }

  return null; // Unknown - needs validation
}
