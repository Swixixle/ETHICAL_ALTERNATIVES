import { querySentencingData } from './sentencingDataAdapter.js';

async function test() {
  console.log('Testing query...');

  // Test 1: No filters, get everything
  console.log('\nTest 1: No filters');
  const result1 = await querySentencingData({ limit: 5 });
  console.log('  Records:', result1.records.length);
  console.log('  First record:', JSON.stringify(result1.records[0], null, 2));

  // Test 2: Just securities fraud
  console.log('\nTest 2: Securities fraud only');
  const result2 = await querySentencingData({
    offenseType: 'securities_fraud',
    limit: 10
  });
  console.log('  Total processed:', result2.stats.totalRowsProcessed);
  console.log('  Matched:', result2.stats.matchedRows);
  console.log('  Records:', result2.records.length);
  if (result2.records.length > 0) {
    console.log('  First match:', JSON.stringify(result2.records[0], null, 2));
  }

  // Test 3: Tax evasion
  console.log('\nTest 3: Tax evasion only');
  const result3 = await querySentencingData({
    offenseType: 'tax_evasion',
    limit: 10
  });
  console.log('  Total processed:', result3.stats.totalRowsProcessed);
  console.log('  Matched:', result3.stats.matchedRows);
  console.log('  Records:', result3.records.length);
  if (result3.records.length > 0) {
    console.log('  First match:', JSON.stringify(result3.records[0], null, 2));
  }
}

test().catch(console.error);
