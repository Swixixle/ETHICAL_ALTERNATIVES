/**
 * USSC Commission Datafiles Adapter
 * Provides query interface for sentencing outcomes data
 * Updated for FY2024 NID (National Individual Datafile) format
 * 61,679 real federal sentencing records
 */

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { OFFENSE_TAXONOMY, USSC_OFFENSE_CODES } from '../data/offenseTaxonomy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_PATH = join(__dirname, '../data/ussc_commission_datafiles/fy2024/opafy24.csv');

// Column mappings for different USSC formats
// FY2024 NID format uses different column names than older formats
const NID_COLUMN_INDICES = {
  SENTTOT: 683,      // Total sentence in months
  OFFGUIDE: 820,     // Primary offense guideline (2=Drug, 10=Weapon, 13=Immigration, 16=Fraud, 17=Econ Crime, etc.)
  CAROFFEN: 701,     // Categorized offense (often 0 or -3)
  LOSS1: 25776,      // Loss amount (may not exist in all records)
  SENTIMP: 841,      // Sentence type (1 = prison)
  AGE: 696,          // Age at sentencing
  MONRACE: 806,      // Race
  MONSEX: 807,       // Sex
  CRIMHIST: 715,     // Criminal history score
  CITIZEN: 698,      // Citizenship
  EDUCATION: 697,    // Education level
  FYEAR: 695         // Fiscal year
};

// Fallback to sample format for testing
const SAMPLE_COLUMN_INDICES = {
  SENTENCE: 45,
  OFFTYPE: 40,
  LOSS: 29,
  AGE: 1,
  MONRACE: 31,
  MONSEX: 32,
  HRCOM: 26,
  CITIZEN: 7,
  EDUCATION: 21,
  PRISDUM: 41,
  PROBATN: 42,
  FYEAR: 23
};

/**
 * @typedef {Object} SentencingRecord
 * @property {number} sentenceMonths
 * @property {number|null} lossAmount
 * @property {string} offenseCode
 * @property {string} offenseDescription
 * @property {string} offenseCategory
 * @property {string} criminalHistory
 * @property {string} race
 * @property {string} gender
 * @property {number} age
 * @property {string} citizenship
 * @property {string} education
 * @property {boolean} prisonSentence
 * @property {number|null} probationMonths
 * @property {number} year
 */

/**
 * Parse a USSC CSV record into structured object
 * Handles both NID (FY2024) and sample formats
 * @param {string} line - CSV line
 * @param {Object} headerMap - Column name to index mapping
 * @returns {SentencingRecord|null}
 */
function parseRecord(line, headerMap) {
  const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));

  // Detect format by checking for NID-specific columns
  const isNIDFormat = headerMap.hasOwnProperty('SENTTOT') || headerMap.hasOwnProperty('CAROFFEN');

  let sentenceMonths, offenseCode, prisonSentence, age, race, gender, criminalHistory;
  let lossAmount = null;
  let citizenship = 'Unknown';
  let education = 'Unknown';
  let year = 2024;

  if (isNIDFormat) {
    // NID Format (real FY2024 data)
    // SENTTOT = Total sentence
    const sentIdx = headerMap['SENTTOT'];
    if (sentIdx !== undefined && cols[sentIdx] && cols[sentIdx] !== '.') {
      const sentNum = parseFloat(cols[sentIdx]);
      if (!isNaN(sentNum)) {
        sentenceMonths = sentNum >= 470 ? null : sentNum; // 470+ = life
      }
    }

    // OFFGUIDE = Primary offense guideline (e.g., 2=Drugs, 10=Weapons, 16=Fraud, 17=Econ Crime)
    const offIdx = headerMap['OFFGUIDE'];
    if (offIdx !== undefined && cols[offIdx] && cols[offIdx] !== '.' && cols[offIdx] !== '0') {
      offenseCode = cols[offIdx];
    } else {
      // Fallback to CAROFFEN if OFFGUIDE not available
      const carIdx = headerMap['CAROFFEN'];
      if (carIdx !== undefined && cols[carIdx] && cols[carIdx] !== '0' && cols[carIdx] !== '-3') {
        offenseCode = cols[carIdx];
      }
    }

    // LOSS1 = Loss amount (may be missing)
    const lossIdx = headerMap['LOSS1'];
    if (lossIdx !== undefined && cols[lossIdx] && cols[lossIdx] !== '.' && cols[lossIdx] !== '') {
      const lossNum = parseFloat(cols[lossIdx]);
      if (!isNaN(lossNum)) {
        lossAmount = lossNum;
      }
    }

    // SENTIMP = 1 means prison
    const impIdx = headerMap['SENTIMP'];
    prisonSentence = impIdx !== undefined && cols[impIdx] === '1';

    // Age
    const ageIdx = headerMap['AGE'];
    if (ageIdx !== undefined && cols[ageIdx]) {
      age = parseInt(cols[ageIdx], 10) || null;
    }

    // Race
    const raceMap = { '1': 'White', '2': 'Black', '3': 'Hispanic', '4': 'Asian', '5': 'Native American', '6': 'Other', '7': 'Other' };
    const raceIdx = headerMap['MONRACE'];
    race = raceIdx !== undefined ? (raceMap[cols[raceIdx]] || 'Unknown') : 'Unknown';

    // Gender
    const sexMap = { '1': 'Male', '2': 'Female' };
    const sexIdx = headerMap['MONSEX'];
    gender = sexIdx !== undefined ? (sexMap[cols[sexIdx]] || 'Unknown') : 'Unknown';

    // Criminal history
    const crimIdx = headerMap['CRIMHIST'];
    if (crimIdx !== undefined && cols[crimIdx]) {
      const hrcNum = parseInt(cols[crimIdx], 10);
      if (!isNaN(hrcNum)) {
        const chMap = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F' };
        criminalHistory = chMap[hrcNum] || String(hrcNum);
      } else {
        criminalHistory = 'Unknown';
      }
    }

    // Citizenship
    const citIdx = headerMap['CITIZEN'];
    if (citIdx !== undefined && cols[citIdx]) {
      citizenship = cols[citIdx] === '1' ? 'US' : 'Non-US';
    }

    // Education
    const eduIdx = headerMap['EDUCATION'];
    if (eduIdx !== undefined && cols[eduIdx]) {
      const eduNum = parseInt(cols[eduIdx], 10);
      const eduMap = { 1: 'Less than HS', 2: 'High School', 3: 'Some College', 4: 'College Graduate', 5: 'Advanced Degree' };
      education = eduMap[eduNum] || 'Unknown';
    }

    // Year
    const yearIdx = headerMap['FYEAR'];
    if (yearIdx !== undefined && cols[yearIdx]) {
      year = parseInt(cols[yearIdx], 10) || 2024;
    }

  } else {
    // Sample/Simplified format (for testing)
    const sentRaw = cols[headerMap['SENTENCE']];
    if (sentRaw && sentRaw !== '.' && sentRaw !== '') {
      const sentNum = parseFloat(sentRaw);
      if (!isNaN(sentNum)) {
        sentenceMonths = sentNum >= 470 ? null : sentNum;
      }
    }

    offenseCode = cols[headerMap['OFFTYPE']] || '';

    const lossRaw = cols[headerMap['LOSS']];
    if (lossRaw && lossRaw !== '.' && lossRaw !== '') {
      const lossNum = parseFloat(lossRaw);
      if (!isNaN(lossNum)) {
        lossAmount = lossNum * 1000;
      }
    }

    prisonSentence = cols[headerMap['PRISDUM']] === '1';

    const ageRaw = cols[headerMap['AGE']];
    age = ageRaw && ageRaw !== '.' ? parseInt(ageRaw, 10) : null;

    const raceMap = { '1': 'White', '2': 'Black', '3': 'Hispanic', '6': 'Other', '7': 'Other' };
    race = raceMap[cols[headerMap['MONRACE']]] || 'Unknown';

    const genderMap = { '1': 'Male', '2': 'Female' };
    gender = genderMap[cols[headerMap['MONSEX']]] || 'Unknown';

    const hrcRaw = cols[headerMap['HRCOM']];
    if (hrcRaw && hrcRaw !== '.') {
      const hrcNum = parseInt(hrcRaw, 10);
      const chMap = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F' };
      criminalHistory = chMap[hrcNum] || String(hrcNum);
    }

    const citMap = { '1': 'US', '2': 'Non-US', '3': 'Non-US', '4': 'Non-US' };
    citizenship = citMap[cols[headerMap['CITIZEN']]] || 'Unknown';

    const eduMap = { 1: 'Less than HS', 2: 'High School', 3: 'Some College', 4: 'College Graduate', 5: 'Advanced Degree' };
    education = eduMap[cols[headerMap['EDUCATION']]] || 'Unknown';

    const yearRaw = cols[headerMap['FYEAR']];
    year = yearRaw ? parseInt(yearRaw, 10) : 2024;
  }

  // Get offense description
  const offenseInfo = USSC_OFFENSE_CODES[offenseCode] || { description: 'Unknown', category: 'other' };

  return {
    sentenceMonths: sentenceMonths || 0,
    lossAmount,
    offenseCode: offenseCode || '',
    offenseDescription: offenseInfo.description,
    offenseCategory: offenseInfo.category,
    criminalHistory: criminalHistory || 'Unknown',
    race: race || 'Unknown',
    gender: gender || 'Unknown',
    age,
    citizenship,
    education,
    prisonSentence: prisonSentence || false,
    probationMonths: null, // Not always available
    year
  };
}

/**
 * Load CSV headers from first line
 * @param {string} headerLine - First line of CSV
 * @returns {Object} - Column name to index mapping
 */
function parseHeaders(headerLine) {
  const headers = headerLine.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  const mapping = {};
  headers.forEach((h, i) => {
    mapping[h] = i;
  });
  return mapping;
}

/**
 * Check if record matches query filters
 * @param {SentencingRecord} record
 * @param {Object} query
 * @returns {boolean}
 */
function matchesFilters(record, query) {
  // Offense type filter - check both old codes and NID OFFGUIDE codes
  if (query.offenseType) {
    const taxonomy = OFFENSE_TAXONOMY[query.offenseType];
    if (taxonomy) {
      const matchingCodes = taxonomy.usscCodes || [];
      const offguideCodes = taxonomy.offguideCodes || [];
      // Check if record offense code matches either format
      if (!matchingCodes.includes(record.offenseCode) && !offguideCodes.includes(record.offenseCode)) {
        return false;
      }
    }
  }

  // Loss amount filters
  if (query.minLossAmount != null && record.lossAmount != null) {
    if (record.lossAmount < query.minLossAmount) return false;
  }
  if (query.maxLossAmount != null && record.lossAmount != null) {
    if (record.lossAmount > query.maxLossAmount) return false;
  }

  // Sentence filters
  if (query.minSentenceMonths != null && record.sentenceMonths != null) {
    if (record.sentenceMonths < query.minSentenceMonths) return false;
  }
  if (query.maxSentenceMonths != null && record.sentenceMonths != null) {
    if (record.sentenceMonths > query.maxSentenceMonths) return false;
  }

  // Criminal history filter
  if (query.criminalHistoryCategory) {
    if (record.criminalHistory !== query.criminalHistoryCategory) return false;
  }

  // Demographics
  if (query.race && record.race !== query.race) return false;
  if (query.gender && record.gender !== query.gender) return false;

  return true;
}

/**
 * Query USSC sentencing data with filters
 * Uses streaming for large files (61,679+ records)
 * @param {Object} query
 * @param {string} [dataPath] - Optional custom data file path
 * @returns {Promise<{records: SentencingRecord[], stats: Object}>}
 */
export async function querySentencingData(query = {}, dataPath = DEFAULT_DATA_PATH) {
  const records = [];
  const startTime = Date.now();

  // Track statistics
  let totalRows = 0;
  let matchedRows = 0;
  const offenseCodeCounts = {};
  const criminalHistoryCounts = {};

  return new Promise((resolve, reject) => {
    const fileStream = createReadStream(dataPath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headerMap = null;
    let isFirstLine = true;
    let lineCount = 0;

    rl.on('line', (line) => {
      lineCount++;

      if (isFirstLine) {
        headerMap = parseHeaders(line);
        isFirstLine = false;
        return;
      }

      if (!line.trim()) return;

      // Skip if we've hit our limit without random sampling
      if (!query.randomSample && query.limit && records.length >= query.limit) {
        totalRows++;
        return;
      }

      totalRows++;

      // Progress logging for large files
      if (totalRows % 10000 === 0) {
        console.error(`  Processed ${totalRows} records...`);
      }

      try {
        const record = parseRecord(line, headerMap);
        if (!record) return;

        // Track offense codes for stats
        offenseCodeCounts[record.offenseCode] = (offenseCodeCounts[record.offenseCode] || 0) + 1;
        criminalHistoryCounts[record.criminalHistory] = (criminalHistoryCounts[record.criminalHistory] || 0) + 1;

        if (matchesFilters(record, query)) {
          matchedRows++;

          // Handle random sampling for representative subset
          if (query.randomSample && query.limit) {
            if (records.length < query.limit) {
              records.push(record);
            } else {
              // Reservoir sampling - replace random element
              const j = Math.floor(Math.random() * matchedRows);
              if (j < query.limit) {
                records[j] = record;
              }
            }
          } else {
            records.push(record);
          }
        }
      } catch (err) {
        // Skip malformed records
      }
    });

    rl.on('close', () => {
      const duration = Date.now() - startTime;

      // Calculate summary statistics
      const sentences = records.filter(r => r.sentenceMonths != null && r.sentenceMonths > 0).map(r => r.sentenceMonths);
      const losses = records.filter(r => r.lossAmount != null && r.lossAmount > 0).map(r => r.lossAmount);

      const stats = {
        totalRowsProcessed: totalRows,
        matchedRows: matchedRows,
        returnedRecords: records.length,
        processingTimeMs: duration,
        sentenceStats: sentences.length > 0 ? {
          mean: sentences.reduce((a, b) => a + b, 0) / sentences.length,
          median: calculateMedian(sentences),
          min: Math.min(...sentences),
          max: Math.max(...sentences),
          percentiles: calculatePercentiles(sentences, [25, 75, 90, 95])
        } : null,
        lossStats: losses.length > 0 ? {
          mean: losses.reduce((a, b) => a + b, 0) / losses.length,
          median: calculateMedian(losses),
          min: Math.min(...losses),
          max: Math.max(...losses),
          percentiles: calculatePercentiles(losses, [25, 75, 90, 95])
        } : null,
        offenseBreakdown: offenseCodeCounts,
        criminalHistoryBreakdown: criminalHistoryCounts
      };

      resolve({ records, stats });
    });

    rl.on('error', reject);
  });
}

/**
 * Calculate median of array
 * @param {number[]} arr
 * @returns {number}
 */
function calculateMedian(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate percentiles
 * @param {number[]} arr
 * @param {number[]} percentiles
 * @returns {Object}
 */
function calculatePercentiles(arr, percentiles) {
  if (arr.length === 0) return {};
  const sorted = [...arr].sort((a, b) => a - b);
  const result = {};

  for (const p of percentiles) {
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    result[`p${p}`] = sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  return result;
}

export default {
  querySentencingData
};
