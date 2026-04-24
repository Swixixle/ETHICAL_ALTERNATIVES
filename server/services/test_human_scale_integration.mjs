/**
 * Test Human-Scale Corporate Penalty Integration
 * Shows full investigation report with human-scale penalty section
 * Run with: node test_human_scale_integration.mjs
 */

import { generateCategoryHumanScaleAnalysis, formatHumanScaleReport } from './humanScaleIntegration.js';

console.log('='.repeat(80));
console.log('ETHICALALT INTEGRATION TEST');
console.log('Human-Scale Corporate Penalty in Investigation Report');
console.log('='.repeat(80));
console.log();

// Simulate a real Amazon investigation structure
const amazonInvestigation = {
  brand: 'Amazon.com Inc',
  slug: 'amazon',
  parent: null,

  // Tax category
  tax_summary: 'Amazon has faced scrutiny over offshore tax strategies and transfer pricing.',
  tax_flags: [
    '$8.5 billion in US tax avoidance over 10 years through offshore structures',
    'Paid $0 federal income tax in 2018 on $11.2 billion profits',
    'Tax inversion strategies through Luxembourg subsidiaries',
    'IRS challenges to transfer pricing arrangements'
  ],
  tax_sources: [
    'https://itep.org/amazon-pays-zero-federal-income-tax/',
    'https://www.bloomberg.com/news/articles/2021-04-09/amazon-s-1-2b-eu-tax-win-shows-why-nations-want-global-deal'
  ],

  // Legal category
  legal_summary: 'Multiple antitrust investigations and securities compliance issues.',
  legal_flags: [
    'FTC antitrust lawsuit for anti-competitive marketplace practices',
    '$62 million FTC settlement for withholding driver tips (Amazon Flex)',
    'EU antitrust fines totaling €2.4 billion for marketplace favoritism',
    'Securities disclosure investigations'
  ],
  legal_sources: [
    'https://www.ftc.gov/news-events/news/press-releases/2023/09/ftc-sues-amazon-illegally-maintaining-monopoly-power',
    'https://www.sec.gov/news/press-release/2021-50'
  ],

  // Labor category
  labor_summary: 'Systemic labor violations including warehouse safety and worker injuries.',
  labor_flags: [
    'OSHA citations for willful safety violations at warehouses',
    '$60,000 in penalties for worker injury reporting failures',
    'High injury rates exceeding industry standards',
    'NLRB complaints regarding union-busting activities'
  ],
  labor_sources: [
    'https://www.osha.gov/news/newsreleases/region3/01172023',
    'https://www.cnbc.com/2023/01/17/amazon-warehouse-osha-investigation-safety-fines.html'
  ]
};

console.log('Generating Human-Scale Penalty analysis for Amazon...');
console.log('This queries 61,679 real FY2024 federal sentencing records...\n');

async function runTest() {
  const humanScaleData = {
    generated_at: new Date().toISOString(),
    categories: {}
  };

  // Test each category
  const categories = [
    { name: 'tax', flags: amazonInvestigation.tax_flags, sources: amazonInvestigation.tax_sources },
    { name: 'legal', flags: amazonInvestigation.legal_flags, sources: amazonInvestigation.legal_sources },
    { name: 'labor', flags: amazonInvestigation.labor_flags, sources: amazonInvestigation.labor_sources }
  ];

  for (const cat of categories) {
    console.log(`Processing ${cat.name.toUpperCase()} violations...`);
    const analysis = await generateCategoryHumanScaleAnalysis(
      amazonInvestigation.brand,
      amazonInvestigation.slug,
      cat.name,
      cat.flags,
      cat.sources
    );

    if (analysis) {
      humanScaleData.categories[cat.name] = analysis;
      console.log(`  ✓ ${cat.name}: ${analysis.disparity.severity} disparity`);
      console.log(`    Human-scale: ${analysis.human_scale_penalty.total_custody_years} years ineligible`);
      console.log(`    Sample size: ${analysis.civilian_analog.sample_size} USSC cases`);
    } else {
      console.log(`  ✗ ${cat.name}: Not in Phase 1 offense taxonomy`);
    }
    console.log();
  }

  // Add summary
  const totalYears = Object.values(humanScaleData.categories).reduce(
    (sum, cat) => sum + (cat.human_scale_penalty?.total_custody_years || 0),
    0
  );

  humanScaleData.summary = `Aggregate human-scale penalty across ${Object.keys(humanScaleData.categories).length} violation categories: ${totalYears.toFixed(1)} years of operational ineligibility.`;

  // Output full report
  console.log('='.repeat(80));
  console.log('FULL INVESTIGATION REPORT WITH HUMAN-SCALE PENALTY');
  console.log('='.repeat(80));
  console.log();

  // Show investigation structure
  console.log('INVESTIGATION STRUCTURE:');
  console.log(JSON.stringify({
    brand: amazonInvestigation.brand,
    slug: amazonInvestigation.slug,
    categories_analyzed: Object.keys(humanScaleData.categories),
    human_scale_penalty: {
      generated_at: humanScaleData.generated_at,
      data_available: Object.keys(humanScaleData.categories).length > 0,
      summary: humanScaleData.summary
    }
  }, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('HUMAN-SCALE PENALTY SECTION (JSON):');
  console.log('='.repeat(80));
  console.log();

  // Show the human_scale_penalty section that would be added to investigation
  console.log(JSON.stringify({
    human_scale_penalty: humanScaleData
  }, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('FORMATTED REPORT FOR DISPLAY:');
  console.log('='.repeat(80));
  console.log();
  console.log(formatHumanScaleReport(humanScaleData));

  console.log('\n' + '='.repeat(80));
  console.log('INTEGRATION COMPLETE');
  console.log('='.repeat(80));
  console.log();
  console.log('To integrate into EthicalAlt:');
  console.log('1. Import attachHumanScaleToInvestigation from humanScaleIntegration.js');
  console.log('2. Call await attachHumanScaleToInvestigation(inv, brandName, brandSlug)');
  console.log('3. The investigation object will have human_scale_penalty section');
  console.log('4. Include in cryptographic receipt signing');
}

runTest().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
});
