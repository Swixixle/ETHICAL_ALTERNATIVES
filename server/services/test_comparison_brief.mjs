/**
 * Test Comparison Brief Generator
 * Creates a sentencing disparity comparison for an Amazon OSHA violation
 * Run with: node test_comparison_brief.mjs
 */

import { buildComparisonBrief, generateBriefSummary } from './sentencingComparisonBrief.js';

console.log('='.repeat(80));
console.log('SENTENCING COMPARISON BRIEF - TEST');
console.log('Corporate: Amazon Warehouse OSHA Violations');
console.log('='.repeat(80));
console.log();

// Amazon OSHA violation - real case from 2021-2023
// OSHA cited Amazon for $60,000+ in penalties after workers were injured
// Source: https://www.bloomberg.com/news/articles/2023-01-17/amazon-faces-60-000-in-osha-fines-over-worker-injuries
const amazonOSHAExample = {
  brandName: 'Amazon.com Inc',
  brandSlug: 'amazon',
  category: 'labor',
  violationType: 'workplace safety violations, failure to report injuries, unsafe warehouse conditions',
  amountInvolved: 60000, // OSHA fines
  corporateOutcome: 'OSHA citations with $60,126 in penalties; contested',
  corporateFine: 60126,
  corporateSentence: 0, // No executive prison time
  incidentDate: '2021-2022',
  resolutionDate: '2023-01-17',
  sources: [
    'https://www.bloomberg.com/news/articles/2023-01-17/amazon-faces-60-000-in-osha-fines-over-worker-injuries',
    'https://www.cnbc.com/2023/01/17/amazon-warehouse-osha-investigation-safety-fines.html',
    'https://www.osha.gov/news/newsreleases/region3/01172023'
  ]
};

// Note: OSHA violations don't map perfectly to USSC sentencing data
// For this test, we'll use a comparable federal offense: workplace safety violations
// typically prosecuted under 29 U.S.C. § 666 (willful OSHA violations)
// However, the USSC data primarily covers 18 U.S.C. offenses

// For comparison purposes, let's also test with a securities/tax example
// that better matches the Phase 1 offense taxonomy

console.log('Example 1: Amazon OSHA Violations (Labor Category)');
console.log('-'.repeat(80));

try {
  // OSHA violations map poorly to USSC - let's show what happens
  const brief1 = await buildComparisonBrief(
    amazonOSHAExample,
    'test-amazon-osha-001',
    20 // Small sample since data is limited
  );

  console.log('✓ Brief generated successfully!\n');
  console.log(generateBriefSummary(brief1));
  console.log('\nFull Brief JSON:');
  console.log(JSON.stringify(brief1, null, 2));
} catch (err) {
  console.log('⚠ Expected issue - OSHA violations not in Phase 1 offense taxonomy:');
  console.log('  Error:', err.message);
  console.log('\n  Note: Phase 1 only covers financial fraud (securities, tax, wire fraud).');
  console.log('  Labor/OSHA violations would be Phase 3.');
  console.log();
}

// Example 2: A hypothetical securities fraud case that maps well
console.log('\n' + '='.repeat(80));
console.log('Example 2: Hypothetical Securities Fraud Case (Maps to Phase 1)');
console.log('-'.repeat(80));

const securitiesFraudExample = {
  brandName: 'Acme Financial Corp',
  brandSlug: 'acme-financial',
  category: 'legal', // Maps to securities_fraud
  violationType: 'securities fraud, misrepresentation to investors',
  amountInvolved: 2500000, // $2.5M in fraudulent investments
  corporateOutcome: 'Deferred Prosecution Agreement, $5M fine',
  corporateFine: 5000000,
  corporateSentence: 0, // No executive prison
  incidentDate: '2022-01-01',
  resolutionDate: '2024-03-15',
  sources: [
    'https://www.sec.gov/news/press-release/2024-50',
    'https://www.justice.gov/usao-sdny/pr/acme-financial-corp-enters-deferred-prosecution-agreement'
  ]
};

try {
  const brief2 = await buildComparisonBrief(
    securitiesFraudExample,
    'test-securities-001',
    20
  );

  console.log('✓ Brief generated successfully!\n');
  console.log(generateBriefSummary(brief2));
  console.log('\n' + '='.repeat(80));
  console.log('JSON OUTPUT (for inspection):');
  console.log('='.repeat(80) + '\n');

  // Output just the key sections
  const output = {
    brief_id: brief2.brief_id,
    generated_at: brief2.generated_at,
    corporate_violation: brief2.corporate_violation,
    individual_comparison: {
      sample_size: brief2.individual_comparison.sample_size,
      statistics: brief2.individual_comparison.statistics
    },
    disparity_analysis: brief2.disparity_analysis,
    sentencing_guidelines: brief2.sentencing_guidelines,
    signature: brief2.signature ? brief2.signature.substring(0, 50) + '...' : null,
    verification_url: brief2.verification_url
  };

  console.log(JSON.stringify(output, null, 2));
} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
}

console.log('\n' + '='.repeat(80));
console.log('TEST COMPLETE');
console.log('='.repeat(80));
console.log();
console.log('Next Steps:');
console.log('1. Review the JSON output above');
console.log('2. Verify Ed25519 signature is present');
console.log('3. Check disparity ratio calculation');
console.log('4. Integrate into investigation report generation');
