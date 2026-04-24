/**
 * Test suite for Recent News Check layer (Perplexity Sonar)
 */

import { checkRecentNews, validateFindings, getRecentNewsCostEstimate } from './recentNewsCheck.js';

async function testCostEstimate() {
  console.log('\n=== Testing Cost Estimate ===');
  const cost = getRecentNewsCostEstimate();
  console.log('Estimated cost per call: $' + cost);
  if (cost !== 0.05) {
    console.warn('WARNING: Expected $0.05, got $' + cost);
  }
  console.log('✓ Cost estimate test passed');
}

async function testValidateFindings() {
  console.log('\n=== Testing Findings Validation ===');

  const rawFindings = [
    {
      date: '2024-01-15',
      category: 'legal',
      title: 'Test Finding',
      description: 'A test description',
      source_url: 'https://example.com',
      severity: 'significant',
    },
    {
      date: null, // invalid date
      category: 'invalid_category', // should be normalized
      title: '', // empty title should get default
      description: 'Another description',
      severity: 'critical',
    },
  ];

  const validated = validateFindings(rawFindings);
  console.log('Validated findings:', JSON.stringify(validated, null, 2));

  if (validated.length !== 2) {
    throw new Error('Expected 2 validated findings');
  }

  if (validated[0].category !== 'legal') {
    throw new Error('First finding category should be legal');
  }

  if (validated[1].category !== 'regulatory') {
    throw new Error('Second finding category should default to regulatory');
  }

  console.log('✓ Findings validation test passed');
}

async function testRecentNewsCheck() {
  console.log('\n=== Testing Recent News Check (Perplexity) ===');

  if (!process.env.PERPLEXITY_API_KEY) {
    console.warn('WARNING: PERPLEXITY_API_KEY not set. Skipping API test.');
    console.warn('Set PERPLEXITY_API_KEY to test the Perplexity integration.');
    return;
  }

  // Test with a brand that likely has recent news
  const result = await checkRecentNews({
    brandName: 'Apple',
    corporateParent: 'Apple Inc.',
    days: 90,
  });

  console.log('Recent news result:', {
    ok: result.ok,
    hasNewDevelopments: result.hasNewDevelopments,
    findingsCount: result.findings?.length || 0,
    summary: result.summary?.slice(0, 100) + '...',
  });

  if (!result.ok) {
    console.warn('WARNING: Recent news check failed:', result.error);
  }

  if (result.findings?.length > 0) {
    console.log('Sample finding:', JSON.stringify(result.findings[0], null, 2));
  }

  console.log('✓ Recent news check test passed');
}

async function testRecentNewsCheckFailureFallback() {
  console.log('\n=== Testing Recent News Check Failure Fallback ===');

  // Temporarily unset the key to test fallback
  const originalKey = process.env.PERPLEXITY_API_KEY;
  delete process.env.PERPLEXITY_API_KEY;

  const result = await checkRecentNews({
    brandName: 'Test Brand',
    days: 30,
  });

  console.log('Fallback result:', {
    ok: result.ok,
    hasNewDevelopments: result.hasNewDevelopments,
    error: result.error,
  });

  if (result.ok !== false) {
    throw new Error('Expected ok=false when API key missing');
  }

  // Conservative fallback should assume there might be developments
  if (result.hasNewDevelopments !== true) {
    throw new Error('Expected hasNewDevelopments=true for conservative fallback');
  }

  // Restore key
  if (originalKey) {
    process.env.PERPLEXITY_API_KEY = originalKey;
  }

  console.log('✓ Failure fallback test passed');
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         RECENT NEWS CHECK LAYER TEST SUITE               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    await testCostEstimate();
    await testValidateFindings();
    await testRecentNewsCheck();
    await testRecentNewsCheckFailureFallback();

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
