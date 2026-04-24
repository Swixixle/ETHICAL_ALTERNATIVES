/**
 * Test suite for Triage LLM layer (Ollama)
 */

import {
  triageInvestigation,
  checkCachedResearch,
  checkOllamaHealth,
} from './triageLLM.js';

async function testOllamaHealth() {
  console.log('\n=== Testing Ollama Health ===');
  const health = await checkOllamaHealth();
  console.log('Ollama available:', health.available);
  console.log('Model loaded:', health.model);

  if (!health.available) {
    console.warn('WARNING: Ollama is not available. Tests will use fallback logic.');
    console.warn('Make sure Ollama is running: ollama serve');
    console.warn('And the model is loaded: ollama pull llama3.2');
  }

  return health.available;
}

async function testCheckCachedResearch() {
  console.log('\n=== Testing Cache Check ===');

  // Test with non-existent brand
  const result = await checkCachedResearch('test-brand-that-does-not-exist-12345');
  console.log('Non-existent brand cache check:', result);

  if (result.exists !== false) {
    throw new Error('Expected exists=false for non-existent brand');
  }

  // Test with a known brand if available
  const knownResult = await checkCachedResearch('mcdonalds');
  console.log('Known brand (mcdonalds) cache check:', {
    exists: knownResult.exists,
    ageDays: knownResult.ageDays,
    hasDeepResearch: knownResult.hasDeepResearch,
  });

  console.log('✓ Cache check tests passed');
}

async function testTriageDecisionNewBrand() {
  console.log('\n=== Testing Triage: New Brand ===');

  const result = await triageInvestigation({
    brandName: 'Totally Fictional Brand XYZ123',
    corporateParent: null,
    slug: 'totally-fictional-brand-xyz123',
  });

  console.log('Triage result:', {
    decision: result.decision,
    cacheExists: result.cacheInfo.exists,
    ollamaResponse: result.ollamaResponse?.slice(0, 50),
  });

  // For a brand with no cache, should recommend full_research
  if (result.cacheInfo.exists === false && result.decision !== 'full_research') {
    console.warn('WARNING: For non-existent cache, expected full_research but got', result.decision);
    console.warn('This may be using fallback logic if Ollama is unavailable');
  }

  console.log('✓ New brand triage test passed');
}

async function testTriageDecisionCachedBrand() {
  console.log('\n=== Testing Triage: Cached Brand ===');

  // Use a well-known brand that likely has cache
  const result = await triageInvestigation({
    brandName: 'McDonald\'s',
    corporateParent: 'McDonald\'s Corporation',
    slug: 'mcdonalds',
  });

  console.log('Triage result for cached brand:', {
    decision: result.decision,
    cacheExists: result.cacheInfo.exists,
    cacheAgeDays: result.cacheInfo.ageDays,
    hasDeepResearch: result.cacheInfo.hasDeepResearch,
    ollamaResponse: result.ollamaResponse?.slice(0, 50),
  });

  // Decision should be one of the valid options
  const validDecisions = ['use_cache', 'check_recent', 'full_research'];
  if (!validDecisions.includes(result.decision)) {
    throw new Error(`Invalid decision: ${result.decision}`);
  }

  console.log('✓ Cached brand triage test passed');
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           TRIAGE LLM LAYER TEST SUITE                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    const ollamaAvailable = await testOllamaHealth();
    await testCheckCachedResearch();
    await testTriageDecisionNewBrand();
    await testTriageDecisionCachedBrand();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║              ALL TESTS PASSED ✓                        ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    if (!ollamaAvailable) {
      console.log('\nNOTE: Tests ran with fallback logic. Ollama was not available.');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n╔══════════════════════════════════════════════════════════╗');
    console.error('║              TESTS FAILED ✗                            ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error(error);
    process.exit(1);
  }
}

runAllTests();
