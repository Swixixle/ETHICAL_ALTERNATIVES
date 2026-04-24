#!/usr/bin/env node
/**
 * USSC Data Preprocessor
 * Reads the full FY2024 USSC CSV (61,679 records) ONCE
 * Groups by offense type and calculates statistics
 * Saves to JSON cache for fast (<10ms) queries
 *
 * Run this script once after downloading new USSC data.
 * Updates take effect immediately - no server restart needed.
 */

import { createReadStream, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, '../data/ussc_commission_datafiles/fy2024/opafy24.csv');
const OUTPUT_DIR = join(__dirname, '../data/ussc_preprocessed');
const OUTPUT_FILE = join(OUTPUT_DIR, 'offense_stats.json');

// Column indices for FY2024 NID format
// See: https://www.ussc.gov/sites/default/files/pdf/research/datafiles/UFY24-Layout-1.pdf
const COLUMN_INDICES = {
  SENTTOT: 683,      // Total sentence in months
  OFFGUIDE: 820,     // Primary offense guideline (2=Drug, 10=Weapon, 13=Immigration, 16=Fraud, 17=Econ Crime)
  CAROFFEN: 701,     // Categorized offense
  SENTIMP: 841,      // Sentence type (1 = prison)
  AMTFINE: 670,      // Fine amount (dollars)
  AMTREST: 672,      // Restitution amount (dollars)
  AMTSPEC: 673,      // Special assessment
  AGE: 696,          // Age at sentencing
  MONRACE: 806,      // Race
  MONSEX: 807,       // Sex
  CRIMHIST: 715,     // Criminal history
  CITIZEN: 698,      // Citizenship
  EDUCATION: 697,    // Education
  FYEAR: 695         // Fiscal year
};

// Offense type mappings
// Note: FY2024 NID format primarily uses OFFGUIDE codes:
//   16 = Fraud (theft, fraud, embezzlement, forgery, counterfeiting)
//   17 = Economic Crime (tax, antitrust, securities, money laundering, bribery)
// Legacy CAROFFEN codes are mostly missing (-3) in this format
const OFFENSE_MAPPINGS = {
  fraud_economic: {
    description: 'All fraud and economic crimes (OFFGUIDE 16 or 17)',
    codes: [],
    offguideCodes: ['16', '17']
  },
  all_other: {
    description: 'All other offenses',
    codes: [],
    offguideCodes: []
  }
};

/**
 * Parse CSV headers into column name -> index mapping
 */
function parseHeaders(line) {
  const headers = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  const mapping = {};
  headers.forEach((h, i) => {
    mapping[h] = i;
  });
  return mapping;
}

/**
 * Parse a single CSV record
 */
function parseRecord(line, headerMap) {
  const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));

  const sentIdx = headerMap['SENTTOT'] ?? COLUMN_INDICES.SENTTOT;
  const offIdx = headerMap['OFFGUIDE'] ?? COLUMN_INDICES.OFFGUIDE;
  const carIdx = headerMap['CAROFFEN'] ?? COLUMN_INDICES.CAROFFEN;
  const impIdx = headerMap['SENTIMP'] ?? COLUMN_INDICES.SENTIMP;
  const fineIdx = headerMap['AMTFINE'] ?? COLUMN_INDICES.AMTFINE;
  const restIdx = headerMap['AMTREST'] ?? COLUMN_INDICES.AMTREST;

  // Parse sentence (470+ means life)
  let sentenceMonths = null;
  const sentRaw = cols[sentIdx];
  if (sentRaw && sentRaw !== '.' && sentRaw !== '') {
    const sentNum = parseFloat(sentRaw);
    if (!isNaN(sentNum) && sentNum < 470) {
      sentenceMonths = sentNum;
    }
  }

  // Parse OFFGUIDE code (NID format)
  let offguideCode = null;
  const offRaw = cols[offIdx];
  if (offRaw && offRaw !== '.' && offRaw !== '0') {
    offguideCode = offRaw;
  }

  // Parse legacy CAROFFEN code
  let offenseCode = null;
  const carRaw = cols[carIdx];
  if (carRaw && carRaw !== '0' && carRaw !== '-3' && carRaw !== '.') {
    offenseCode = carRaw;
  }

  // Parse prison sentence
  const isPrison = cols[impIdx] === '1';

  // Parse financial penalties
  let fineAmount = null;
  const fineRaw = cols[fineIdx];
  if (fineRaw && fineRaw !== '.' && fineRaw !== '' && fineRaw !== '0') {
    const fineNum = parseFloat(fineRaw);
    if (!isNaN(fineNum) && fineNum > 0) {
      fineAmount = fineNum;
    }
  }

  let restitutionAmount = null;
  const restRaw = cols[restIdx];
  if (restRaw && restRaw !== '.' && restRaw !== '' && restRaw !== '0') {
    const restNum = parseFloat(restRaw);
    if (!isNaN(restNum) && restNum > 0) {
      restitutionAmount = restNum;
    }
  }

  return { sentenceMonths, offenseCode, offguideCode, isPrison, fineAmount, restitutionAmount };
}

/**
 * Determine offense type from record
 * Simplified: only two categories
 */
function classifyOffense(offenseCode, offguideCode) {
  // OFFGUIDE 16 = Fraud, 17 = Economic Crime
  // Group all financial/economic crimes together
  if (offguideCode === '16' || offguideCode === '17') {
    return 'fraud_economic';
  }

  // Everything else
  return 'all_other';
}

/**
 * Calculate statistics from collected values
 */
function calculateStats(values) {
  if (values.length === 0) {
    return {
      median: 0,
      p25: 0,
      p75: 0,
      min: 0,
      max: 0,
      mean: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const median = sorted[Math.floor(n / 2)];
  const p25 = sorted[Math.floor(n * 0.25)];
  const p75 = sorted[Math.floor(n * 0.75)];
  const min = sorted[0];
  const max = sorted[n - 1];
  const mean = values.reduce((a, b) => a + b, 0) / n;

  return { median, p25, p75, min, max, mean: Math.round(mean * 10) / 10 };
}

/**
 * Main preprocessing function
 */
async function preprocessData() {
  console.log('='.repeat(70));
  console.log('USSC FY2024 Data Preprocessor');
  console.log('='.repeat(70));
  console.log('');
  console.log('This script reads the full 1.6GB CSV once and creates a JSON cache');
  console.log('for fast (<10ms) offense statistics lookups.');
  console.log('');
  console.log('Run this script once after downloading new USSC data.');
  console.log('Updates take effect immediately - no server restart needed.');
  console.log('');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}`);
  }

  // Initialize data collectors for each offense type
  const offenseData = {};
  const offenseTypes = ['fraud_economic', 'all_other'];
  for (const offenseType of offenseTypes) {
    offenseData[offenseType] = {
      sentences: [],
      fines: [],
      restitutions: [],
      prisonCount: 0,
      totalCount: 0
    };
  }

  const startTime = Date.now();
  let totalRows = 0;
  let matchedRows = 0;

  console.log(`Reading CSV: ${CSV_PATH}`);
  console.log('');

  return new Promise((resolve, reject) => {
    const fileStream = createReadStream(CSV_PATH);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headerMap = null;
    let isFirstLine = true;

    rl.on('line', (line) => {
      if (isFirstLine) {
        headerMap = parseHeaders(line);
        isFirstLine = false;
        return;
      }

      if (!line.trim()) return;

      totalRows++;

      // Progress logging
      if (totalRows % 10000 === 0) {
        console.log(`  Processed ${totalRows.toLocaleString()} records...`);
      }

      try {
        const record = parseRecord(line, headerMap);
        if (!record.offenseCode && !record.offguideCode) return;

        const offenseType = classifyOffense(record.offenseCode, record.offguideCode);

        offenseData[offenseType].totalCount++;
        if (record.isPrison) {
          offenseData[offenseType].prisonCount++;
        }

        if (record.sentenceMonths != null && record.sentenceMonths > 0) {
          offenseData[offenseType].sentences.push(record.sentenceMonths);
        }

        if (record.fineAmount != null && record.fineAmount > 0) {
          offenseData[offenseType].fines.push(record.fineAmount);
        }

        if (record.restitutionAmount != null && record.restitutionAmount > 0) {
          offenseData[offenseType].restitutions.push(record.restitutionAmount);
        }

        matchedRows++;
      } catch (err) {
        // Skip malformed records
      }
    });

    rl.on('close', () => {
      const processingTime = Date.now() - startTime;

      console.log('');
      console.log('-'.repeat(70));
      console.log('Processing Complete');
      console.log('-'.repeat(70));
      console.log(`Total rows processed: ${totalRows.toLocaleString()}`);
      console.log(`Processing time: ${(processingTime / 1000).toFixed(1)}s`);
      console.log('');

      // Calculate statistics for each offense type
      const stats = {};

      for (const [offenseType, data] of Object.entries(offenseData)) {
        if (data.totalCount === 0) continue;

        const sentenceStats = calculateStats(data.sentences);
        const fineStats = calculateStats(data.fines);
        const restitutionStats = calculateStats(data.restitutions);
        const prisonRate = data.totalCount > 0
          ? (data.prisonCount / data.totalCount) * 100
          : 0;

        stats[offenseType] = {
          offense_type: offenseType,
          sample_size: data.totalCount,
          median_sentence_months: sentenceStats.median,
          mean_sentence_months: sentenceStats.mean,
          p25_sentence_months: sentenceStats.p25,
          p75_sentence_months: sentenceStats.p75,
          min_sentence_months: sentenceStats.min,
          max_sentence_months: sentenceStats.max,
          prison_rate_percent: Math.round(prisonRate * 10) / 10,
          sentences_with_data: data.sentences.length,
          // Financial penalties
          median_fine: fineStats.median,
          mean_fine: fineStats.mean,
          fines_with_data: data.fines.length,
          median_restitution: restitutionStats.median,
          mean_restitution: restitutionStats.mean,
          restitutions_with_data: data.restitutions.length
        };
      }

      // Build the output structure
      const output = {
        metadata: {
          source: 'U.S. Sentencing Commission FY2024',
          total_records: totalRows,
          processed_at: new Date().toISOString(),
          csv_file: 'opafy24.csv',
          version: '1.0'
        },
        offense_stats: stats
      };

      // Write the output file
      writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

      console.log('Statistics Summary:');
      console.log('');
      console.log('-'.repeat(90));
      console.log('Offense Type              | Median | Prison% | Sample Size | Median Fine | Median Restitution');
      console.log('-'.repeat(90));

      for (const [offenseType, data] of Object.entries(stats).sort((a, b) => b[1].sample_size - a[1].sample_size)) {
        const typePadded = offenseType.padEnd(25);
        const medianPadded = String(data.median_sentence_months).padStart(6);
        const prisonPadded = String(data.prison_rate_percent.toFixed(1) + '%').padStart(7);
        const samplePadded = data.sample_size.toLocaleString().padStart(11);
        const finePadded = data.median_fine > 0 ? `$${data.median_fine.toLocaleString()}`.padStart(11) : 'N/A'.padStart(11);
        const restPadded = data.median_restitution > 0 ? `$${data.median_restitution.toLocaleString()}`.padStart(18) : 'N/A'.padStart(18);
        console.log(`${typePadded} | ${medianPadded} | ${prisonPadded} | ${samplePadded} | ${finePadded} | ${restPadded}`);
      }

      console.log('-'.repeat(70));
      console.log('');
      console.log(`Output written to: ${OUTPUT_FILE}`);
      console.log('');
      console.log('='.repeat(70));
      console.log('PREPROCESSING COMPLETE');
      console.log('='.repeat(70));
      console.log('');
      console.log('NOTE: Run this script once after downloading new USSC data.');
      console.log('      Updates take effect immediately - no server restart needed.');
      console.log('');
      console.log(`Query performance: <10ms (was 30-60 seconds with CSV streaming)`);
      console.log('');

      resolve({ stats, totalRows, processingTime });
    });

    rl.on('error', reject);
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  preprocessData().catch(err => {
    console.error('Error preprocessing data:', err);
    process.exit(1);
  });
}

export { preprocessData, calculateStats, classifyOffense };
