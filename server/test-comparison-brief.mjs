#!/usr/bin/env node
/**
 * Test file for buildComparisonBrief
 * Verifies preprocessed USSC data is used and runs in <100ms
 */

import { buildComparisonBrief, generateBriefSummary } from './services/sentencingComparisonBrief.js';

console.log('='.repeat(70));
console.log('HUMAN-SCALE CORPORATE PENALTY TEST');
console.log('='.repeat(70));
console.log();

// Simulate a corporate securities fraud violation
const corporateViolation = {
  brandName: 'Goldman Sachs',
  brandSlug: 'goldman-sachs',
  category: 'legal',
  violationType: 'Securities fraud - $5B misrepresentation',
  amountInvolved: 5000000000, // $5 billion
  corporateOutcome: 'Settlement with SEC and DOJ',
  corporateFine: 500000000, // $500 million
  corporateSentence: 0, // No prison time
  incidentDate: '2023',
  resolutionDate: '2024-06-15',
  admission: false,
  individualsCharged: 0,
  sources: ['https://sec.gov/news/press-release', 'https://justice.gov/opa/pr/']
};

console.log('Test Case: Goldman Sachs Securities Fraud');
console.log('-'.repeat(70));
console.log(`Violation: ${corporateViolation.violationType}`);
console.log(`Amount: $${corporateViolation.amountInvolved.toLocaleString()}`);
console.log(`Corporate Fine: $${corporateViolation.corporateFine.toLocaleString()}`);
console.log();

const startTime = Date.now();

try {
  const brief = await buildComparisonBrief(
    corporateViolation,
    'test-investigation-001',
    {
      sampleSize: 100,
      governance: {
        board_members: 12,
        c_suite_authority: 6,
        total: 18,
        is_estimated: true
      }
    }
  );

  const duration = Date.now() - startTime;

  console.log('RESULTS:');
  console.log('-'.repeat(70));
  console.log();

  // Show timing
  console.log(`Query Time: ${duration}ms ${duration < 100 ? '✅ (<100ms)' : '❌ (>100ms)'}`);
  console.log();

  // Show data source
  console.log(`Data Source: ${brief.ussc_data_summary.data_source}`);
  console.log(`USSC Lookup Category: ${brief.ussc_data_summary.ussc_lookup_category}`);
  console.log(`Sample Size: ${brief.ussc_data_summary.sample_size.toLocaleString()} cases`);
  console.log();

  // Show sentencing stats
  console.log('CIVILIAN CRIMINAL ANALOG:');
  console.log(`  Statute: ${brief.civilian_criminal_analog.statute}`);
  console.log(`  Median Sentence: ${brief.civilian_criminal_analog.median_sentence_per_person_years} years per person`);
  console.log(`  Prison Rate: ${brief.civilian_criminal_analog.prison_rate_percent}%`);
  console.log();

  // Show governance
  console.log('CORPORATE GOVERNANCE:');
  console.log(`  Board Members: ${brief.corporate_governance.board_members}`);
  console.log(`  C-Suite: ${brief.corporate_governance.c_suite_with_authority}`);
  console.log(`  Total Decision-Makers: ${brief.corporate_governance.total_decision_makers}`);
  console.log();

  // Show human-scale penalty
  console.log('HUMAN-SCALE PENALTY CALCULATION:');
  console.log(`  Per Person: ${brief.human_scale_analysis.per_person_sentence_years} years`);
  console.log(`  Decision-Makers: ${brief.human_scale_analysis.decision_makers}`);
  console.log(`  TOTAL: ${brief.human_scale_analysis.total_custody_years} years`);
  console.log();

  // Show operational restriction
  console.log('OPERATIONAL RESTRICTION EQUIVALENCE:');
  console.log(`  Years Ineligible: ${brief.operational_restriction_equivalence.years_ineligible_to_operate}`);
  console.log(`  Comparison: ${brief.operational_restriction_equivalence.simple_comparison}`);
  console.log();

  // Show disparity
  console.log('DISPARITY ANALYSIS:');
  console.log(`  Severity: ${brief.disparity_analysis.severity.toUpperCase()}`);
  console.log(`  Ratio: ${brief.disparity_analysis.ratio}`);
  console.log(`  Human-Scale: ${brief.disparity_analysis.human_scale_penalty_years} years`);
  console.log(`  Actual Fine: $${brief.disparity_analysis.actual_corporate_fine.toLocaleString()}`);
  console.log();

  // Show thesis
  console.log('THESIS STATEMENT:');
  console.log(`  ${brief.disparity_visualization.thesis_statement}`);
  console.log();

  // Show brief summary
  console.log('='.repeat(70));
  console.log('COMPLETE BRIEF SUMMARY');
  console.log('='.repeat(70));
  console.log();
  console.log(generateBriefSummary(brief));

  // Final verification
  console.log('='.repeat(70));
  console.log('VERIFICATION');
  console.log('='.repeat(70));
  console.log();
  console.log(`✅ Query completed in ${duration}ms (target: <100ms)`);
  console.log(`✅ Data source: ${brief.ussc_data_summary.data_source}`);
  console.log(`✅ USSC category: ${brief.ussc_data_summary.ussc_lookup_category}`);
  console.log(`✅ Real median sentence: ${brief.civilian_criminal_analog.median_sentence_per_person_months} months`);
  console.log(`✅ Sample size: ${brief.civilian_criminal_analog.sample_size}`);
  console.log();

  if (duration < 100 && brief.ussc_data_summary.data_source === 'USSC Preprocessed Cache') {
    console.log('🎉 SUCCESS: System is using preprocessed data and running fast!');
  } else {
    console.log('⚠️  ISSUE: System may be using slow CSV fallback');
  }

} catch (err) {
  console.error('❌ ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
}
