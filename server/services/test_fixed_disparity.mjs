/**
 * Test Fixed Disparity Calculation
 * Verifies that fines are NOT converted to years
 */

import { buildComparisonBrief, generateBriefSummary } from './sentencingComparisonBrief.js';

console.log('='.repeat(80));
console.log('FIXED DISPARITY CALCULATION TEST');
console.log('Money vs. Time - NOT converted equivalents');
console.log('='.repeat(80));
console.log();

// Example: $5M fine, 0 custody - should show CATASTROPHIC disparity
console.log('Test Case: $5M fine, zero custody time');
console.log('-'.repeat(80));

const testCase = {
  brandName: 'Test Corp',
  brandSlug: 'test-corp',
  category: 'legal',
  violationType: 'securities fraud',
  amountInvolved: 5000000,
  corporateOutcome: 'SEC settlement',
  corporateFine: 5000000, // $5M fine
  corporateSentence: 0,   // ZERO custody
  incidentDate: '2022-01-01',
  resolutionDate: '2024-01-01',
  admission: false,
  individualsCharged: 0,
  sources: ['https://example.com/test']
};

try {
  const brief = await buildComparisonBrief(
    testCase,
    'test-001',
    {
      sampleSize: 100,
      governance: { board_members: 12, c_suite_authority: 5, total: 17, is_estimated: true }
    }
  );

  console.log(generateBriefSummary(brief));
  console.log('\n' + '='.repeat(80));
  console.log('KEY VERIFICATION:');
  console.log('='.repeat(80));
  console.log(`Human-scale penalty: ${brief.human_scale_analysis.total_custody_years} years`);
  console.log(`Actual custody: ${brief.disparity_analysis.actual_corporate_custody_years} years`);
  console.log(`Actual fine: $${brief.disparity_analysis.actual_corporate_fine.toLocaleString()}`);
  console.log(`Disparity severity: ${brief.disparity_analysis.severity.toUpperCase()}`);
  console.log(`Ratio: ${brief.disparity_analysis.ratio}`);
  console.log();
  console.log('EXPECTED: CATASTROPHIC disparity (not "minimal")');
  console.log('EXPECTED: Ratio should be INFINITE (not calculated from fine)');
  console.log();
  console.log('Thesis statement:');
  console.log(brief.disparity_visualization.thesis_statement);

} catch (err) {
  console.error('Error:', err.message);
}
