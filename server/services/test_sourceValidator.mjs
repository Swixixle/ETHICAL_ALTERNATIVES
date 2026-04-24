/**
 * Test suite for Source URL Validator
 */

import {
  isObviouslyInvalidUrl,
  isLikelyValidUrl,
  getArchiveOrgUrl,
  validateUrl,
  extractUrlsFromInvestigation,
  updateInvestigationWithValidatedUrls,
  batchValidateUrls,
  validateInvestigationSources,
} from './sourceValidator.js';

async function testIsObviouslyInvalidUrl() {
  console.log('\n=== Testing isObviouslyInvalidUrl ===');

  const invalidUrls = [
    '',
    null,
    undefined,
    'localhost',
    'http://localhost:3000/article',
    'http://127.0.0.1/page',
    'http://192.168.1.1/admin',
    'http://10.0.0.1/test',
    'https://example.com/article',
    'http://test.com/page',
    'http://fake.com/news',
    'http://placeholder.com/story',
    'http://.../article',
    'http://example.test/page',
    'http://site.local/path',
    '[URL]',
    '{URL}',
    '${variable}',
    'ftp://example.com/file',
    'not-a-url',
  ];

  const validUrls = [
    'https://www.nytimes.com/2024/01/15/business/article.html',
    'http://sec.gov/news/press-release',
    'https://epa.gov/newsreleases',
    'https://www.bbc.com/news/article',
    'https://justice.gov/opa/pr/press-release',
  ];

  let passed = 0;
  let failed = 0;

  for (const url of invalidUrls) {
    const result = isObviouslyInvalidUrl(url);
    if (result === true) {
      passed++;
    } else {
      failed++;
      console.log(`  ❌ Expected invalid: ${url}`);
    }
  }

  for (const url of validUrls) {
    const result = isObviouslyInvalidUrl(url);
    if (result === false) {
      passed++;
    } else {
      failed++;
      console.log(`  ❌ Expected valid: ${url}`);
    }
  }

  console.log(`  ✓ Pattern validation: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    throw new Error(`Pattern validation failed for ${failed} URLs`);
  }
}

async function testIsLikelyValidUrl() {
  console.log('\n=== Testing isLikelyValidUrl ===');

  // Trusted domains should return true
  const trustedUrls = [
    'https://www.reuters.com/article/123',
    'https://bloomberg.com/news/456',
    'https://www.nytimes.com/2024/article',
    'https://epa.gov/newsreleases',
    'https://sec.gov/press-release',
    'https://web.archive.org/web/20240115/https://example.com/article',
  ];

  // Invalid should return false
  const invalidUrls = [
    'http://localhost/test',
    'http://example.com/page',
  ];

  // Unknown should return null
  const unknownUrls = [
    'https://some-random-site.com/article',
    'https://unknown-domain.org/page',
  ];

  for (const url of trustedUrls) {
    const result = isLikelyValidUrl(url);
    if (result !== true) {
      throw new Error(`Expected true for trusted URL: ${url}, got ${result}`);
    }
  }
  console.log(`  ✓ ${trustedUrls.length} trusted domains recognized`);

  for (const url of invalidUrls) {
    const result = isLikelyValidUrl(url);
    if (result !== false) {
      throw new Error(`Expected false for invalid URL: ${url}, got ${result}`);
    }
  }
  console.log(`  ✓ ${invalidUrls.length} invalid URLs rejected`);

  for (const url of unknownUrls) {
    const result = isLikelyValidUrl(url);
    if (result !== null) {
      throw new Error(`Expected null for unknown URL: ${url}, got ${result}`);
    }
  }
  console.log(`  ✓ ${unknownUrls.length} unknown domains return null (needs validation)`);
}

async function testGetArchiveOrgUrl() {
  console.log('\n=== Testing getArchiveOrgUrl ===');

  // Test with a known URL that should have an archive
  const testUrl = 'https://www.nytimes.com/2021/01/01/article';
  const archiveUrl = await getArchiveOrgUrl(testUrl);

  if (archiveUrl) {
    console.log(`  ✓ Got archive URL: ${archiveUrl.slice(0, 80)}...`);
    if (!archiveUrl.includes('web.archive.org')) {
      throw new Error('Archive URL should contain web.archive.org');
    }
  } else {
    console.log('  ⚠ No archive URL found (may not exist or API unavailable)');
  }

  // Test with a URL that definitely won't have an archive
  const fakeUrl = 'https://this-definitely-does-not-exist-12345.xyz/page';
  const noArchive = await getArchiveOrgUrl(fakeUrl);
  if (noArchive === null) {
    console.log('  ✓ Fake URL correctly returns null (no archive)');
  }
}

async function testValidateUrl() {
  console.log('\n=== Testing validateUrl ===');

  // Test obviously invalid URL
  const invalidResult = await validateUrl('http://localhost/test');
  if (invalidResult.valid === true || invalidResult.method !== 'pattern_rejected') {
    throw new Error('Should reject localhost URL');
  }
  console.log('  ✓ Rejected localhost URL');

  // Test trusted domain (should skip validation)
  const trustedResult = await validateUrl('https://www.nytimes.com/article', {
    skipTrustedDomains: true,
  });
  if (trustedResult.valid !== true || trustedResult.method !== 'trusted_domain') {
    throw new Error('Should accept trusted domain');
  }
  console.log('  ✓ Trusted domain accepted without network check');

  // Test valid URL that needs checking (if not rate limited)
  console.log('  Testing real URL validation (may take a few seconds)...');
  const realResult = await validateUrl('https://www.google.com', {
    skipTrustedDomains: false,
    useArchiveFallback: true,
  });

  console.log(`    Valid: ${realResult.valid}`);
  console.log(`    Method: ${realResult.method}`);
  if (realResult.status) {
    console.log(`    HTTP Status: ${realResult.status}`);
  }

  // Archive fallback test
  const deadUrl = 'https://this-site-definitely-does-not-exist-xyz123.com/page';
  const deadResult = await validateUrl(deadUrl, {
    useArchiveFallback: false, // Don't wait for archive
  });

  // This will fail validation (site doesn't exist)
  if (deadResult.valid) {
    console.log('  ⚠ Dead URL unexpectedly passed (network issue or cache?)');
  } else {
    console.log('  ✓ Dead URL correctly rejected');
  }
}

async function testExtractUrlsFromInvestigation() {
  console.log('\n=== Testing extractUrlsFromInvestigation ===');

  const investigation = {
    brand: 'Test Brand',
    tax_sources: ['https://sec.gov/filing', 'http://localhost/invalid'],
    legal_sources: ['https://justice.gov/press-release'],
    labor_sources: [],
    environmental_sources: null,
    timeline: [
      { year: 2024, event: 'Lawsuit filed', source_url: 'https://courts.gov/case/123' },
      { year: 2023, event: 'Settlement', source_url: 'http://example.com/fake' },
    ],
  };

  const urls = extractUrlsFromInvestigation(investigation);

  console.log(`  Extracted ${urls.length} URLs:`);
  for (const url of urls) {
    console.log(`    - ${url.field}[${url.index}]: ${url.url.slice(0, 50)}...`);
  }

  // Should find: 2 tax, 1 legal, 1 timeline[0], 1 timeline[1] = 5 total
  if (urls.length !== 5) {
    throw new Error(`Expected 5 URLs, got ${urls.length}`);
  }

  // Check field attribution
  const taxUrls = urls.filter(u => u.field === 'tax_sources');
  if (taxUrls.length !== 2) {
    throw new Error(`Expected 2 tax sources, got ${taxUrls.length}`);
  }

  console.log('  ✓ URL extraction working correctly');
}

async function testUpdateInvestigationWithValidatedUrls() {
  console.log('\n=== Testing updateInvestigationWithValidatedUrls ===');

  const investigation = {
    brand: 'Test Brand',
    tax_sources: ['https://sec.gov/filing', 'http://localhost/invalid'],
    legal_sources: ['https://justice.gov/press-release'],
    timeline: [
      { year: 2024, event: 'Lawsuit', source_url: 'https://courts.gov/case/123' },
      { year: 2023, event: 'Fine', source_url: 'http://example.com/fake' },
    ],
  };

  const validationResults = [
    { valid: true, url: 'https://sec.gov/filing', originalUrl: 'https://sec.gov/filing', field: 'tax_sources', index: 0, method: 'head_request' },
    { valid: false, url: null, originalUrl: 'http://localhost/invalid', field: 'tax_sources', index: 1, method: 'pattern_rejected', error: 'Invalid' },
    { valid: true, url: 'https://web.archive.org/web/20240101/https://justice.gov/old-release', originalUrl: 'https://justice.gov/press-release', field: 'legal_sources', index: 0, method: 'archive_fallback' },
    { valid: true, url: 'https://courts.gov/case/123', originalUrl: 'https://courts.gov/case/123', field: 'timeline', index: 0, method: 'head_request' },
    { valid: false, url: null, originalUrl: 'http://example.com/fake', field: 'timeline', index: 1, method: 'pattern_rejected', error: 'Invalid' },
  ];

  const updated = updateInvestigationWithValidatedUrls(investigation, validationResults);

  // Check that invalid localhost was removed from tax_sources
  if (updated.tax_sources.includes('http://localhost/invalid')) {
    throw new Error('Invalid localhost URL should be removed');
  }
  if (updated.tax_sources.length !== 1) {
    throw new Error(`Expected 1 tax source, got ${updated.tax_sources.length}`);
  }

  // Check that legal source was replaced with archive version
  if (!updated.legal_sources[0]?.includes('web.archive.org')) {
    throw new Error('Legal source should be replaced with archive version');
  }

  // Check timeline updates
  if (updated.timeline[0].source_url !== 'https://courts.gov/case/123') {
    throw new Error('Valid timeline URL should be preserved');
  }
  if (updated.timeline[1].source_url !== undefined) {
    throw new Error('Invalid timeline source_url should be removed');
  }

  // Check metadata
  if (!updated._source_validation) {
    throw new Error('Should add _source_validation metadata');
  }
  if (updated._source_validation.valid_count !== 3) {
    throw new Error(`Expected 3 valid, got ${updated._source_validation.valid_count}`);
  }
  if (updated._source_validation.invalid_count !== 2) {
    throw new Error(`Expected 2 invalid, got ${updated._source_validation.invalid_count}`);
  }

  console.log('  ✓ Investigation update working correctly');
  console.log(`    Valid: ${updated._source_validation.valid_count}`);
  console.log(`    Invalid: ${updated._source_validation.invalid_count}`);
  console.log(`    Archive replacements: ${updated._source_validation.archive_replacements}`);
}

async function testBatchValidateUrls() {
  console.log('\n=== Testing batchValidateUrls ===');

  const urls = [
    'https://www.nytimes.com',  // Trusted - fast
    'http://localhost/test',       // Invalid - fast
    'https://www.google.com',      // Valid - needs check
    'http://example.com/fake',     // Invalid - fast
  ];

  console.log(`  Testing batch validation of ${urls.length} URLs...`);
  const results = await batchValidateUrls(urls, { concurrency: 2 });

  if (results.length !== urls.length) {
    throw new Error(`Expected ${urls.length} results, got ${results.length}`);
  }

  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.filter(r => !r.valid).length;

  console.log(`  ✓ Batch complete: ${validCount} valid, ${invalidCount} invalid`);

  // Check that localhost and example.com were rejected
  const localResult = results.find(r => r.originalUrl === 'http://localhost/test');
  if (localResult?.valid !== false) {
    throw new Error('localhost should be invalid');
  }
}

async function testValidateInvestigationSources() {
  console.log('\n=== Testing validateInvestigationSources ===');

  const investigation = {
    brand: 'Test Brand Inc',
    tax_summary: 'Tax issues reported',
    tax_sources: [
      'https://sec.gov/filing/2024/123',
      'http://localhost/admin',  // Invalid
      'https://ftc.gov/enforcement',  // Trusted
    ],
    legal_sources: [],
    timeline: [
      {
        year: 2024,
        event: 'Fine levied',
        source_url: 'https://justice.gov/opa/pr/2024-case',
      },
      {
        year: 2023,
        event: 'Investigation opened',
        source_url: 'http://fake.example.com/news',  // Invalid
      },
    ],
  };

  console.log('  Validating investigation sources (may take a few seconds)...');
  const validated = await validateInvestigationSources(investigation);

  // Check validation metadata was added
  if (!validated._source_validation) {
    throw new Error('Should add validation metadata');
  }

  console.log('  ✓ Validation complete');
  console.log(`    Total URLs checked: ${validated._source_validation.total_urls}`);
  console.log(`    Valid: ${validated._source_validation.valid_count}`);
  console.log(`    Invalid: ${validated._source_validation.invalid_count}`);
  console.log(`    Duration: ${validated._source_validation.duration_ms}ms`);

  // Check that invalid URLs were removed
  if (validated.tax_sources.includes('http://localhost/admin')) {
    throw new Error('localhost should be removed from tax_sources');
  }

  // Check timeline was updated - invalid URL should be removed or replaced with archive
  const hasValidUrl = validated.timeline[1].source_url === undefined ||
                      validated.timeline[1].source_url?.includes('web.archive.org') ||
                      !validated.timeline[1].source_url?.includes('fake.example');
  if (!hasValidUrl) {
    throw new Error('Invalid timeline source_url should be removed or replaced with archive');
  }
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        SOURCE VALIDATOR TEST SUITE                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    await testIsObviouslyInvalidUrl();
    await testIsLikelyValidUrl();
    await testGetArchiveOrgUrl();
    await testValidateUrl();
    await testExtractUrlsFromInvestigation();
    await testUpdateInvestigationWithValidatedUrls();
    await testBatchValidateUrls();
    await testValidateInvestigationSources();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║              ALL TESTS PASSED ✓                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    process.exit(0);
  } catch (error) {
    console.error('\n╔══════════════════════════════════════════════════════════╗');
    console.error('║              TESTS FAILED ✗                              ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error(error);
    process.exit(1);
  }
}

runAllTests();
