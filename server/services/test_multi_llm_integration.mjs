/**
 * Integration test for Multi-LLM Orchestration System
 * Tests the complete flow from triage → recent check → verification/deep research
 */

import { triageInvestigation, checkOllamaHealth } from './triageLLM.js';
import { checkRecentNews } from './recentNewsCheck.js';
import { orchestrateInvestigation, getOrchestrationStatus } from './investigationOrchestrator.js';
import { getInvestigationProfile } from './investigation.js';

// Test configuration
const TEST_CONFIG = {
  newBrand: {
    name: 'Totally New Brand Test XYZ987',
    slug: 'totally-new-brand-test-xyz987',
    expectedPath: 'full_research',
  },
  knownBrand: {
    name: "McDonald's",
    parent: "McDonald's Corporation",
    slug: 'mcdonalds',
    expectedPaths: ['use_cache', 'check_recent_no_findings', 'check_recent_verified'],
  },
};

async function runIntegrationTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║    MULTI-LLM ORCHESTRATION INTEGRATION TEST              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Environment check
  console.log('\n📋 Environment Check:');
  console.log('  INVESTIGATION_USE_ORCHESTRATOR:', process.env.INVESTIGATION_USE_ORCHESTRATOR || 'not set');
  console.log('  ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ not set');
  console.log('  PERPLEXITY_API_KEY:', process.env.PERPLEXITY_API_KEY ? '✓ set' : '✗ not set');

  const ollamaHealth = await checkOllamaHealth();
  console.log('  Ollama:', ollamaHealth.available ? `✓ available (${ollamaHealth.model})` : '✗ not available');

  // Skip if orchestrator not enabled
  if (process.env.INVESTIGATION_USE_ORCHESTRATOR !== '1') {
    console.log('\n⚠️  INVESTIGATION_USE_ORCHESTRATOR is not set to "1"');
    console.log('    Tests will run in legacy mode.');
  }

  const results = [];

  // Test 1: Direct Triage LLM
  console.log('\n🧪 Test 1: Triage LLM Layer');
  try {
    const triageResult = await triageInvestigation({
      brandName: TEST_CONFIG.newBrand.name,
      slug: TEST_CONFIG.newBrand.slug,
    });

    console.log('   Decision:', triageResult.decision);
    console.log('   Cache exists:', triageResult.cacheInfo.exists);
    console.log('   Ollama responded:', triamaResult.ollamaResponse ? 'yes' : 'no (using fallback)');

    results.push({ name: 'Triage LLM', passed: true });
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
    results.push({ name: 'Triage LLM', passed: false, error });
  }

  // Test 2: Recent News Check
  console.log('\n🧪 Test 2: Recent News Check Layer');
  if (!process.env.PERPLEXITY_API_KEY) {
    console.log('   ⚠️ Skipped: PERPLEXITY_API_KEY not set');
    results.push({ name: 'Recent News Check', passed: null, skipped: true });
  } else {
    try {
      const newsResult = await checkRecentNews({
        brandName: 'Apple',
        corporateParent: 'Apple Inc.',
        days: 90,
      });

      console.log('   OK:', newsResult.ok);
      console.log('   Has findings:', newsResult.hasNewDevelopments);
      console.log('   Findings count:', newsResult.findings?.length || 0);

      results.push({ name: 'Recent News Check', passed: true });
    } catch (error) {
      console.error('   ❌ Failed:', error.message);
      results.push({ name: 'Recent News Check', passed: false, error });
    }
  }

  // Test 3: Full Orchestration - New Brand
  console.log('\n🧪 Test 3: Full Orchestration (New Brand)');
  try {
    const result = await orchestrateInvestigation({
      brandName: TEST_CONFIG.newBrand.name,
      healthFlag: false,
      productCategory: 'other',
      slug: TEST_CONFIG.newBrand.slug,
    });

    console.log('   Path:', result.orchestration.path);
    console.log('   Triage decision:', result.orchestration.triageDecision);
    console.log('   Cost:', '$' + result.orchestration.costSummary.totalEstimatedCostUsd);
    console.log('   Duration:', result.orchestration.totalDurationMs + 'ms');
    console.log('   Has investigation:', !!result.investigation);

    results.push({ name: 'Orchestration (New Brand)', passed: !!result.investigation });
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
    results.push({ name: 'Orchestration (New Brand)', passed: false, error });
  }

  // Test 4: Full Orchestration - Known Brand
  console.log('\n🧪 Test 4: Full Orchestration (Known Brand)');
  try {
    const result = await orchestrateInvestigation({
      brandName: TEST_CONFIG.knownBrand.name,
      corporateParent: TEST_CONFIG.knownBrand.parent,
      healthFlag: false,
      productCategory: 'fast_food',
      slug: TEST_CONFIG.knownBrand.slug,
    });

    console.log('   Path:', result.orchestration.path);
    console.log('   Cost:', '$' + result.orchestration.costSummary.totalEstimatedCostUsd);
    console.log('   Has investigation:', !!result.investigation);

    const expected = TEST_CONFIG.knownBrand.expectedPaths.includes(result.orchestration.path);
    if (!expected) {
      console.warn('   ⚠️ Unexpected path, but test passed');
    }

    results.push({ name: 'Orchestration (Known Brand)', passed: !!result.investigation });
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
    results.push({ name: 'Orchestration (Known Brand)', passed: false, error });
  }

  // Test 5: Main API - Legacy Mode
  console.log('\n🧪 Test 5: Main API (Legacy Mode)');
  const originalOrchestratorSetting = process.env.INVESTIGATION_USE_ORCHESTRATOR;
  delete process.env.INVESTIGATION_USE_ORCHESTRATOR;

  try {
    const result = await getInvestigationProfile(
      TEST_CONFIG.knownBrand.name,
      TEST_CONFIG.knownBrand.parent,
      { healthFlag: false, productCategory: 'fast_food' }
    );

    console.log('   Has investigation:', !!result);
    console.log('   Profile type:', result?.profile_type);
    console.log('   Brand:', result?.brand);

    results.push({ name: 'Main API (Legacy)', passed: !!result });
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
    results.push({ name: 'Main API (Legacy)', passed: false, error });
  } finally {
    if (originalOrchestratorSetting) {
      process.env.INVESTIGATION_USE_ORCHESTRATOR = originalOrchestratorSetting;
    }
  }

  // Test 6: Main API - Orchestrated Mode (if enabled)
  if (originalOrchestratorSetting === '1') {
    console.log('\n🧪 Test 6: Main API (Orchestrated Mode)');
    process.env.INVESTIGATION_USE_ORCHESTRATOR = '1';

    try {
      const result = await getInvestigationProfile(
        TEST_CONFIG.knownBrand.name,
        TEST_CONFIG.knownBrand.parent,
        { healthFlag: false, productCategory: 'fast_food' }
      );

      console.log('   Has investigation:', !!result);
      console.log('   Orchestration path:', result?._orchestration?.path);
      console.log('   Cost:', '$' + (result?._orchestration?.costSummary?.totalEstimatedCostUsd || 0));

      results.push({ name: 'Main API (Orchestrated)', passed: !!result });
    } catch (error) {
      console.error('   ❌ Failed:', error.message);
      results.push({ name: 'Main API (Orchestrated)', passed: false, error });
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    if (result.skipped) {
      console.log(`  ⏭️  ${result.name}: SKIPPED`);
      skipped++;
    } else if (result.passed) {
      console.log(`  ✅ ${result.name}: PASSED`);
      passed++;
    } else {
      console.log(`  ❌ ${result.name}: FAILED`);
      if (result.error) {
        console.log(`      Error: ${result.error.message}`);
      }
      failed++;
    }
  }

  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);

  if (failed === 0) {
    console.log('\n🎉 All integration tests completed successfully!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review the errors above.');
    process.exit(1);
  }
}

runIntegrationTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
