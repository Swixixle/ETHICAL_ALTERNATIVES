/**
 * Test Human-Scale Corporate Penalty Brief Generator
 * Demonstrates the new framework with real USSC FY2024 data
 * Run with: node test_human_scale_brief.mjs
 */

import { buildComparisonBrief, generateBriefSummary } from './sentencingComparisonBrief.js';

console.log('='.repeat(80));
console.log('HUMAN-SCALE CORPORATE PENALTY FRAMEWORK');
console.log('Using Real USSC FY2024 Data (61,679 records)');
console.log('='.repeat(80));
console.log();

// Example 1: Securities Fraud - Large Corporation
console.log('Example 1: Securities Fraud at Large Corporation');
console.log('-'.repeat(80));

const securitiesFraudCase = {
  brandName: 'Global Investment Corp',
  brandSlug: 'global-investment-corp',
  category: 'legal',
  violationType: 'securities fraud, accounting misrepresentation to investors',
  amountInvolved: 50000000, // $50M fraudulent scheme
  corporateOutcome: 'Deferred Prosecution Agreement, $150M settlement',
  corporateFine: 150000000,
  corporateSentence: 0,
  incidentDate: '2019-2021',
  resolutionDate: '2024-03-15',
  admission: false,
  individualsCharged: 0,
  sources: [
    'https://www.sec.gov/news/press-release/2024-example',
    'https://www.justice.gov/usao/pr/global-investment-dpa'
  ]
};

try {
  const brief1 = await buildComparisonBrief(
    securitiesFraudCase,
    'test-securities-001',
    {
      sampleSize: 200,
      governance: { board_members: 12, c_suite_authority: 5, total: 17, is_estimated: true }
    }
  );

  console.log(generateBriefSummary(brief1));
  console.log('\nKey JSON fields for inspection:');
  console.log(JSON.stringify({
    corporate_governance: brief1.corporate_governance,
    civilian_criminal_analog: {
      statute: brief1.civilian_criminal_analog.statute,
      median_sentence_per_person_years: brief1.civilian_criminal_analog.median_sentence_per_person_years,
      sample_size: brief1.civilian_criminal_analog.sample_size
    },
    human_scale_analysis: brief1.human_scale_analysis,
    operational_restriction_equivalence: {
      years_ineligible_to_operate: brief1.operational_restriction_equivalence.years_ineligible_to_operate,
      simple_comparison: brief1.operational_restriction_equivalence.simple_comparison
    },
    disparity_analysis: brief1.disparity_analysis,
    disparity_visualization: {
      thesis_statement: brief1.disparity_visualization.thesis_statement
    }
  }, null, 2));
} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
}

// Example 2: Tax Evasion
console.log('\n' + '='.repeat(80));
console.log('Example 2: Corporate Tax Evasion');
console.log('-'.repeat(80));

const taxEvasionCase = {
  brandName: 'Acme Holdings Inc',
  brandSlug: 'acme-holdings',
  category: 'tax',
  violationType: 'tax evasion through offshore shell companies and transfer pricing',
  amountInvolved: 25000000, // $25M in unpaid taxes
  corporateOutcome: 'IRS settlement, $45M penalty',
  corporateFine: 45000000,
  corporateSentence: 0,
  incidentDate: '2018-2022',
  resolutionDate: '2023-11-20',
  admission: false,
  individualsCharged: 0,
  sources: [
    'https://www.irs.gov/newsroom/example-tax-settlement'
  ]
};

try {
  const brief2 = await buildComparisonBrief(
    taxEvasionCase,
    'test-tax-001',
    {
      sampleSize: 200,
      governance: { board_members: 11, c_suite_authority: 4, total: 15, is_estimated: true }
    }
  );

  console.log(generateBriefSummary(brief2));
} catch (err) {
  console.error('Error:', err.message);
}

// Example 3: Workplace Deaths (with enhancement for multiple deaths)
console.log('\n' + '='.repeat(80));
console.log('Example 3: Workplace Deaths (Willful OSHA Violations)');
console.log('-'.repeat(80));

const workplaceDeathCase = {
  brandName: 'Midwest Manufacturing Corp',
  brandSlug: 'midwest-manufacturing',
  category: 'labor',
  violationType: 'workplace safety violations resulting in fatalities',
  amountInvolved: 100000, // OSHA penalties
  corporateOutcome: 'OSHA citations, $1.2M penalty',
  corporateFine: 1200000,
  corporateSentence: 0,
  incidentDate: '2022-2023',
  resolutionDate: '2024-01-15',
  admission: false,
  individualsCharged: 0,
  sources: [
    'https://www.osha.gov/news/newsreleases/example'
  ]
};

try {
  const brief3 = await buildComparisonBrief(
    workplaceDeathCase,
    'test-workplace-001',
    {
      sampleSize: 100,
      deaths: 3, // 3 worker fatalities
      willful: true,
      governance: { board_members: 9, c_suite_authority: 4, total: 13, is_estimated: true }
    }
  );

  console.log(generateBriefSummary(brief3));
} catch (err) {
  console.error('Error:', err.message);
  console.log('\nNote: Workplace deaths would map to Phase 2/3 of offense taxonomy');
}

console.log('\n' + '='.repeat(80));
console.log('TEST COMPLETE');
console.log('='.repeat(80));
console.log();
console.log('Framework Summary:');
console.log('1. Corporate governance structure (board + C-suite)');
console.log('2. Civilian criminal analog (what would individuals be charged with)');
console.log('3. Aggregate human-scale penalty (median_sentence × decision_makers)');
console.log('4. Operational restriction equivalence (years ineligible to operate)');
console.log('5. Disparity analysis (human-scale vs. actual penalty)');
console.log();
console.log('Files Built:');
console.log('- server/data/offenseTaxonomy.js');
console.log('- server/services/sentencingDataAdapter.js (61,679 real USSC records)');
console.log('- server/services/sentencingComparisonBrief.js (Human-Scale framework)');
