/**
 * Test script for USSC Sentencing Data Adapter
 * Run with: node test_sentencing_adapter.mjs
 */

import {
  querySentencingData,
  getComparableSentencing,
  getOffenseCategorySummary
} from './sentencingDataAdapter.js';
import {
  OFFENSE_TAXONOMY,
  USSC_OFFENSE_CODES,
  mapCategoryToOffense,
  calculateOffenseLevel,
  getGuidelinesRange
} from '../data/offenseTaxonomy.js';

console.log('='.repeat(80));
console.log('USSC SENTENCING DATA ADAPTER - TEST SUITE');
console.log('='.repeat(80));

// Test 1: Offense Taxonomy Mapper
console.log('\n📋 TEST 1: Offense Taxonomy Mapper');
console.log('-'.repeat(40));

console.log('\nAvailable offense types:');
for (const [key, value] of Object.entries(OFFENSE_TAXONOMY)) {
  console.log(`  • ${key}: ${value.description}`);
  console.log(`    USSC Codes: ${value.usscCodes.join(', ')}`);
}

// Test category mapping
console.log('\nCategory mapping tests:');
const testCases = [
  { category: 'tax', violation: 'tax evasion scheme' },
  { category: 'legal', violation: 'securities fraud' },
  { category: 'financial', violation: 'investment scam' },
  { category: 'corruption', violation: 'bribery of officials' },
];

for (const test of testCases) {
  const mapped = mapCategoryToOffense(test.category, test.violation);
  console.log(`  "${test.category}" + "${test.violation}" → ${mapped || 'null'}`);
}

// Test 2: Offense Level Calculation
console.log('\n📊 TEST 2: Offense Level Calculation');
console.log('-'.repeat(40));

const testAmounts = [
  { type: 'securities_fraud', amount: 50000 },
  { type: 'securities_fraud', amount: 1000000 },
  { type: 'securities_fraud', amount: 50000000 },
  { type: 'tax_evasion', amount: 100000 },
  { type: 'tax_evasion', amount: 5000000 },
];

for (const test of testAmounts) {
  const level = calculateOffenseLevel(test.type, test.amount);
  const range = getGuidelinesRange(6, level, 'A'); // Base 6 + loss increase
  console.log(
    `  ${test.type}: $${test.amount.toLocaleString()} → Level +${level}, ` +
    `Range: ${range.minMonths}-${range.maxMonths} months`
  );
}

// Test 3: USSC Offense Codes
console.log('\n📚 TEST 3: USSC Offense Codes Lookup');
console.log('-'.repeat(40));

const sampleCodes = ['201', '240', '097', '091', '180'];
for (const code of sampleCodes) {
  const info = USSC_OFFENSE_CODES[code];
  if (info) {
    console.log(`  Code ${code}: ${info.description} (${info.category})`);
    console.log(`    Chapter: ${info.chapter}, Severity: ${info.severity}`);
  }
}

// Test 4: Data Query (will fail without data file, but tests structure)
console.log('\n🔍 TEST 4: Data Query Interface');
console.log('-'.repeat(40));

console.log('\nTesting query structure...');
const sampleQuery = {
  offenseType: 'securities_fraud',
  minLossAmount: 100000,
  maxLossAmount: 5000000,
  limit: 100,
  randomSample: true
};
console.log('  Sample query:', JSON.stringify(sampleQuery, null, 2));

// Test 5: Comparable Sentencing Structure
console.log('\n⚖️ TEST 5: Comparable Sentencing Structure');
console.log('-'.repeat(40));

const mockCorporateViolation = {
  offenseType: 'securities_fraud',
  amountInvolved: 25000000,
  sentenceMonths: 0 // Corporation - no prison time
};

console.log('\nMock corporate violation:');
console.log('  Offense:', mockCorporateViolation.offenseType);
console.log('  Amount: $' + mockCorporateViolation.amountInvolved.toLocaleString());
console.log('  Sentence: N/A (corporate entity)');

console.log('\nExpected individual comparison:');
const taxonomy = OFFENSE_TAXONOMY[mockCorporateViolation.offenseType];
if (taxonomy) {
  console.log('  USSC Codes:', taxonomy.usscCodes.join(', '));
  console.log('  Chapter:', taxonomy.usscChapter);
  console.log('  Statute:', taxonomy.typicalIndividualStatute);

  const lossIncrease = calculateOffenseLevel(mockCorporateViolation.offenseType, mockCorporateViolation.amountInvolved);
  const range = getGuidelinesRange(7, lossIncrease, 'A'); // Base 7 for securities
  console.log('  Offense Level Increase: +' + lossIncrease);
  console.log('  Guidelines Range (CH A): ' + range.minMonths + '-' + range.maxMonths + ' months');
}

// Test 6: Data File Check
console.log('\n💾 TEST 6: Data File Status');
console.log('-'.repeat(40));

import { existsSync } from 'node:fs';
const dataPath = '/Users/alexmaksimovich/ETHICAL_ALTERNATIVES/server/data/ussc_commission_datafiles/fy2024/opafy24.csv';

if (existsSync(dataPath)) {
  console.log('  ✓ FY2024 data file found:', dataPath);
  console.log('  Running actual data queries...');

  try {
    // Test actual query
    const results = await querySentencingData({
      offenseType: 'tax_evasion',
      limit: 5
    }, dataPath);

    console.log('\n    Query Results:');
    console.log('      Records found:', results.records.length);
    console.log('      Total rows processed:', results.stats.totalRowsProcessed);
    console.log('      Matched rows:', results.stats.matchedRows);

    if (results.records.length > 0) {
      console.log('\n    Sample record:');
      console.log('      ', JSON.stringify(results.records[0], null, 2).substring(0, 200) + '...');
    }

    if (results.stats.sentenceStats) {
      console.log('\n    Sentence Statistics:');
      console.log('      Mean:', results.stats.sentenceStats.mean.toFixed(1), 'months');
      console.log('      Median:', results.stats.sentenceStats.median.toFixed(1), 'months');
      console.log('      Range:', results.stats.sentenceStats.min, '-', results.stats.sentenceStats.max, 'months');
    }
  } catch (err) {
    console.log('    Error during query:', err.message);
  }
} else {
  console.log('  ⚠ FY2024 data file NOT found:', dataPath);
  console.log('  Run the download script first:');
  console.log('    cd server/data/ussc_commission_datafiles');
  console.log('    chmod +x download_fy2024.sh');
  console.log('    ./download_fy2024.sh');
}

console.log('\n' + '='.repeat(80));
console.log('TEST SUITE COMPLETE');
console.log('='.repeat(80));

// Summary
console.log('\n📋 Components Built:');
console.log('  ✓ Offense Taxonomy (8 offense types)');
console.log('  ✓ USSC Code Mapping (20+ codes)');
console.log('  ✓ CSV Parser Adapter with filtering');
console.log('  ✓ Statistical aggregation (mean, median, percentiles)');
console.log('  ✓ Comparable sentencing analysis');

console.log('\n📁 Files Created:');
console.log('  • server/data/offenseTaxonomy.js - Offense mappings');
console.log('  • server/services/sentencingDataAdapter.js - Query adapter');
console.log('  • server/data/ussc_commission_datafiles/ - Data directory');

console.log('\n🔜 Next Steps:');
console.log('  1. Download FY2024 data: ./download_fy2024.sh');
console.log('  2. Run integration tests with real data');
console.log('  3. Build sentencing comparison API endpoint');
console.log('  4. Integrate with investigation report generation');
