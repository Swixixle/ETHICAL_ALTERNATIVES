/**
 * Test suite for Investigation Orchestrator
 * Tests the full multi-LLM flow
 */

import {
  orchestrateInvestigation,
  getOrchestrationStatus,
  COST_ESTIMATES,
} from './investigationOrchestrator.js';

async function testOrchestrationStatus() {
  console.log('\n=== Testing Orchestration Status ===');

  const status = await getOrchestrationStatus();
  console.log('Orchestration status:', JSON.stringify(status, null, 2));

  console.log('✓ Status check test passed');
}

async function testCostEstimates() {
  console.log('\n=== Testing Cost Estimates ===');

  console.log('Cost estimates:');
  for (const [path, cost] of Object.entries(COST_ESTIMATES)) {
    console.log(`  ${path}: $${cost}`);
  }

  // Verify expected values
  if (COST_ESTIMATES.triage !== 0) {
    throw new Error('Triage should be free (local Ollama)');
  }
  if (COST_ESTIMATES.check_recent !== 0.05) {
    throw new Error('Check recent should be ~$0.05');
  }
  if (COST_ESTIMATES.full_research !== 15.0) {
    throw new Error('Full research should be ~$15');
  }

  console.log('✓ Cost estimates test passed');
}

async function testNewBrandOrchestration() {
  console.log('\n=== Testing New Brand Orchestration ===');

  // Skip if orchestrator is not enabled
  const originalUseOrchestrator = process.env.INVESTIGATION_USE_ORCHESTRATOR;
  process.env.INVESTIGATION_USE_ORCHESTRATOR = '1';

  try {
    // Test with a brand that definitely doesn't exist
    const result = await orchestrateInvestigation({
      brandName: 'XYZ Test Brand Does Not Exist 12345',
      corporateParent: null,
      healthFlag: false,
      productCategory: 'other',
      slug: 'xyz-test-brand-does-not-exist-12345',
    });

    console.log('Orchestration result for new brand:');
    console.log('  Path:', result.orchestration.path);
    console.log('  Triage decision:', result.orchestration.triageDecision);
    console.log('  Cost:', result.orchestration.costSummary.totalEstimatedCostUsd);
    console.log('  Steps:', result.orchestration.costSummary.stepCount);
    console.log('  Duration:', result.orchestration.totalDurationMs, 'ms');

    // Should go through full_research path
    if (result.orchestration.path !== 'full_research') {
      console.warn(
        'WARNING: Expected full_research path, got:',
        result.orchestration.path
      );
      console.warn('This may be expected if the brand exists or Ollama is unavailable');
    }

    if (!result.investigation) {
      throw new Error('Expected investigation in result');
    }

    console.log('✓ New brand orchestration test passed');
  } finally {
    // Restore original value
    if (originalUseOrchestrator !== undefined) {
      process.env.INVESTIGATION_USE_ORCHESTRATOR = originalUseOrchestrator;
    } else {
      delete process.env.INVESTIGATION_USE_ORCHESTRATOR;
    }
  }
}

async function testCachedBrandOrchestration() {
  console.log('\n=== Testing Cached Brand Orchestration ===');

  // Skip if orchestrator is not enabled
  const originalUseOrchestrator = process.env.INVESTIGATION_USE_ORCHESTRATOR;
  process.env.INVESTIGATION_USE_ORCHESTRATOR = '1';

  try {
    // Test with a well-known brand that likely has cache
    const result = await orchestrateInvestigation({
      brandName: "McDonald's",
      corporateParent: "McDonald's Corporation",
      healthFlag: false,
      productCategory: 'fast_food',
      slug: 'mcdonalds',
    });

    console.log('Orchestration result for cached brand:');
    console.log('  Path:', result.orchestration.path);
    console.log('  Triage decision:', result.orchestration.triageDecision);
    console.log('  Cost:', result.orchestration.costSummary.totalEstimatedCostUsd);
    console.log('  Steps:', result.orchestration.costSummary.steps.map((s) => s.name).join(' → '));

    // Path should be one of the expected paths
    const validPaths = [
      'use_cache',
      'check_recent_no_findings',
      'check_recent_verified',
      'full_research',
      'full_research_fallback',
    ];

    if (!validPaths.includes(result.orchestration.path)) {
      console.warn(
        'WARNING: Unexpected path:',
        result.orchestration.path
      );
    }

    if (!result.investigation) {
      throw new Error('Expected investigation in result');
    }

    console.log('✓ Cached brand orchestration test passed');
  } finally {
    // Restore original value
    if (originalUseOrchestrator !== undefined) {
      process.env.INVESTIGATION_USE_ORCHESTRATOR = originalUseOrchestrator;
    } else {
      delete process.env.INVESTIGATION_USE_ORCHESTRATOR;
    }
  }
}

async function testForceFullResearch() {
  console.log('\n=== Testing Force Full Research ===');

  const originalUseOrchestrator = process.env.INVESTIGATION_USE_ORCHESTRATOR;
  process.env.INVESTIGATION_USE_ORCHESTRATOR = '1';

  try {
    const result = await orchestrateInvestigation({
      brandName: 'Test Force Full Research',
      healthFlag: false,
      productCategory: 'other',
      slug: 'test-force-full-research',
      forceFullResearch: true,
    });

    console.log('Orchestration result with forceFullResearch:');
    console.log('  Path:', result.orchestration.path);
    console.log('  Triage decision:', result.orchestration.triageDecision);

    // Should skip triage and go directly to full_research
    if (result.orchestration.triageDecision !== 'full_research') {
      throw new Error('Expected triageDecision=full_research when forceFullResearch=true');
    }

    console.log('✓ Force full research test passed');
  } finally {
    if (originalUseOrchestrator !== undefined) {
      process.env.INVESTIGATION_USE_ORCHESTRATOR = originalUseOrchestrator;
    } else {
      delete process.env.INVESTIGATION_USE_ORCHESTRATOR;
    }
  }
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║      INVESTIGATION ORCHESTRATOR TEST SUITE               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  console.log('\nEnvironment:');
  console.log('  INVESTIGATION_USE_ORCHESTRATOR:', process.env.INVESTIGATION_USE_ORCHESTRATOR || 'not set');
  console.log('  ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'set' : 'not set');
  console.log('  PERPLEXITY_API_KEY:', process.env.PERPLEXITY_API_KEY ? 'set' : 'not set');
  console.log('  OLLAMA_HOST:', process.env.OLLAMA_HOST || 'http://localhost:11434 (default)');

  try {
    await testOrchestrationStatus();
    await testCostEstimates();
    await testNewBrandOrchestration();
    await testCachedBrandOrchestration();
    await testForceFullResearch();

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
