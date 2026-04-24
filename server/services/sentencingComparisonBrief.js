/**
 * Sentencing Comparison Brief Generator
 * Generates comparative sentencing analysis for corporate investigations
 * with Human-Scale Corporate Penalty calculations
 *
 * Core Principle: If corporations have the legal rights of persons, they should face
 * the aggregate criminal liability of all decision-makers who would be charged
 * if operating as individuals.
 *
 * Formula: Human-Scale Penalty = median_sentence × number_of_decision_makers
 */

import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { OFFENSE_TAXONOMY, mapCategoryToOffense, calculateOffenseLevel } from '../data/offenseTaxonomy.js';
import { querySentencingData } from './sentencingDataAdapter.js';
import { signReceiptBody, getReceiptPublicKeyB64Url, verifyReceiptSignature, VERIFY_BASE } from './investigationReceipt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_PATH = join(__dirname, '../data/ussc_commission_datafiles/fy2024/opafy24.csv');
const PREPROCESSED_DATA_PATH = join(__dirname, '../data/ussc_preprocessed/offense_stats.json');

// Cache for preprocessed data (loaded once)
let cachedOffenseStats = null;

const BRIEF_SCHEMA_VERSION = '2.0';
const BRIEF_ISSUER = 'EthicalAlt / Nikodemus Systems - Human-Scale Justice Division';
const BRIEF_DISCLAIMER =
  'This comparison brief documents the disparity between corporate penalties and individual sentencing under the Human-Scale Corporate Penalty framework. If corporations have the constitutional rights of persons, they should face the aggregate criminal liability of all decision-makers. Data sourced from U.S. Sentencing Commission FY2024. It is not a legal finding.';

/**
 * Default corporate governance structure when actual data unavailable
 */
const DEFAULT_GOVERNANCE = {
  public_corporation: { board_members: 12, c_suite_authority: 5, total: 17 },
  private_corporation: { board_members: 8, c_suite_authority: 3, total: 11 },
  small_business: { board_members: 3, c_suite_authority: 0, total: 3 },
  multinational: { board_members: 15, c_suite_authority: 7, total: 22 }
};

/**
 * Civilian criminal analogs for corporate violations
 * Maps corporate violation types to individual criminal charges
 */
const CIVILIAN_ANALOGS = {
  securities_fraud: {
    statute: '18 U.S.C. § 1348 - Securities Fraud',
    charge_description: 'Each decision-maker would face securities fraud charges for knowingly executing or approving fraudulent schemes affecting investors',
    base_sentence_months: 24,
    notes: 'Based on median sentence for securities fraud ($1M-$5M loss range)'
  },
  tax_evasion: {
    statute: '26 U.S.C. § 7201 - Tax Evasion',
    charge_description: 'Each decision-maker would face tax evasion charges for willfully underreporting income or claiming false deductions',
    base_sentence_months: 14,
    notes: 'Based on USSC median for tax offenses'
  },
  wire_fraud: {
    statute: '18 U.S.C. § 1343 - Wire Fraud',
    charge_description: 'Each decision-maker would face wire fraud charges for using electronic communications to execute fraudulent schemes',
    base_sentence_months: 18,
    notes: 'Median for wire fraud offenses'
  },
  money_laundering: {
    statute: '18 U.S.C. § 1956 - Money Laundering',
    charge_description: 'Each decision-maker who approved concealment of proceeds would face money laundering charges',
    base_sentence_months: 30,
    notes: 'Money laundering carries enhanced penalties'
  },
  embezzlement: {
    statute: '18 U.S.C. § 656 - Theft by Bank Officer',
    charge_description: 'Each fiduciary who diverted funds would face embezzlement charges',
    base_sentence_months: 18,
    notes: 'Theft/embezzlement by fiduciaries'
  },
  bribery: {
    statute: '18 U.S.C. § 201 - Bribery of Public Official',
    charge_description: 'Each decision-maker who offered or approved bribes would face bribery charges',
    base_sentence_months: 12,
    notes: 'Median for bribery convictions'
  },
  workplace_death: {
    statute: '18 U.S.C. § 1112 - Involuntary Manslaughter',
    charge_description: 'Each decision-maker who knowingly disregarded safety standards resulting in death would face manslaughter charges',
    base_sentence_months: 180, // 15 years
    notes: 'Involuntary manslaughter base sentence',
    multipliers: {
      'per_death': 1.5, // Each additional death multiplies sentence
      'willful_violation': 2.0 // OSHA willful violations enhance penalty
    }
  },
  environmental_harm: {
    statute: '42 U.S.C. § 7413(c) - Clean Air Act Criminal Violations',
    charge_description: 'Each decision-maker who knowingly violated environmental regulations endangering communities',
    base_sentence_months: 24,
    notes: 'Environmental crimes with community impact'
  },
  antitrust: {
    statute: '15 U.S.C. § 1 - Sherman Act Conspiracy',
    charge_description: 'Each decision-maker who participated in price-fixing or bid-rigging conspiracies',
    base_sentence_months: 12,
    notes: 'Antitrust conspiracy penalties'
  },
  consumer_fraud: {
    statute: '18 U.S.C. § 1347 - Health Care Fraud / Consumer Protection',
    charge_description: 'Each decision-maker who knowingly sold defective products or engaged in deceptive practices',
    base_sentence_months: 18,
    notes: 'Consumer protection violations'
  },
  labor_violation: {
    statute: '29 U.S.C. § 216 - FLSA Criminal Violations',
    charge_description: 'Each decision-maker who willfully violated wage and hour laws',
    base_sentence_months: 6,
    notes: 'Labor law criminal violations'
  }
};

/**
 * Collateral Consequences Data
 * Documented lifetime impacts of federal felony convictions
 * Sources: USSC, Bureau of Justice Statistics, Prison Policy Initiative
 */
const COLLATERAL_CONSEQUENCES = {
  // Employment impacts
  employment: {
    employer_rejection_rate: 87, // Percentage of employers who screen out felons
    wage_reduction_percent: 50, // Felons earn ~50% less post-conviction
    professional_licenses_lost: [
      'Attorney (disbarred)',
      'CPA (revoked)',
      'Medical license (revoked)',
      'Nursing license (revoked)',
      'Teaching credential (revoked)',
      'Securities licenses (Series 7, 63, etc.)',
      'Insurance licenses',
      'Real estate license',
      'Contractor licenses'
    ]
  },

  // Financial/educational barriers
  financial_education: {
    federal_student_aid_ineligible: true,
    federal_contracts_ineligible: true,
    housing_discrimination_legal: true, // Landlords can legally reject felons
    loan_disqualification: 'Most business loans, many personal loans'
  },

  // Civic participation
  civic: {
    voting_rights: 'State-dependent; many states restrict felon voting',
    jury_service: 'Permanently ineligible (federal and most states)',
    firearm_ownership: 'Permanently prohibited (federal law 18 U.S.C. § 922)',
    public_office: 'Often ineligible'
  },

  // Post-release supervision averages
  supervision: {
    average_supervised_release_years: 3,
    drug_testing_cost_per_test: 50,
    tests_per_month: 3, // Average
    supervision_fee_monthly: 100, // $40-200 depending on jurisdiction
    mandatory_community_service_hours: 100 // Typical requirement
  },

  // Income estimates for fraud defendants (pre-conviction)
  income: {
    pre_conviction_annual: 65000, // White-collar defendants typically middle-class
    post_conviction_annual: 32500, // 50% reduction
    years_to_retirement: 20, // Assuming conviction at age 45
    family_income_loss_during_incarceration: true
  },

  // Court costs estimates
  court_costs: {
    estimated_court_costs: 10000, // Filing fees, restitution processing, etc.
    public_defender_reimbursement: 5000, // If applicable
    dna_testing_fee: 100 // Federal conviction fee
  }
};

/**
 * Permanent barriers list for display
 */
const PERMANENT_BARRIERS = [
  'Permanent felony record (federal convictions never expunged)',
  '87% employer rejection rate (background check failures)',
  'Loss of all professional licenses (attorney, CPA, medical, nursing, teaching)',
  'Ineligible for federal contracts (SBA disqualification)',
  'Ineligible for federal student aid (FAFSA disqualification)',
  'Housing discrimination (landlords can legally reject felons)',
  'Loss of voting rights (state-dependent, but often restricted)',
  'Cannot serve on juries (federal + most states)',
  'Cannot own firearms (18 U.S.C. § 922 - lifetime ban)',
  '3+ years supervised release with travel restrictions',
  'Mandatory drug testing (2-4x per month at $50/test)',
  'Public record appears in background checks forever'
];

/**
 * Human costs of incarceration
 */
const HUMAN_COSTS = [
  'Family separation during incarceration (children, spouses, elderly parents)',
  "Children's outcomes negatively affected (lower education, income, higher incarceration risk)",
  'Loss of health insurance (employer coverage termination)',
  'Loss of retirement contributions (401k/pension gaps)',
  'Social stigma and isolation (difficulty maintaining relationships)',
  'Mental health impacts (depression, anxiety, PTSD from incarceration)',
  'Difficulty securing housing (apartment denials, homelessness risk)'
];

/**
 * Load preprocessed USSC offense statistics from JSON cache
 * Falls back to CSV if preprocessed data is not available
 * @returns {Object|null} - Preprocessed offense stats or null
 */
function loadPreprocessedStats() {
  if (cachedOffenseStats) {
    return cachedOffenseStats;
  }

  if (!existsSync(PREPROCESSED_DATA_PATH)) {
    console.log('[sentencingComparisonBrief] Preprocessed data not found, will use CSV fallback');
    return null;
  }

  try {
    const data = JSON.parse(readFileSync(PREPROCESSED_DATA_PATH, 'utf-8'));
    cachedOffenseStats = data.offense_stats || null;
    console.log('[sentencingComparisonBrief] Loaded preprocessed USSC data:', Object.keys(cachedOffenseStats || {}).join(', '));
    return cachedOffenseStats;
  } catch (err) {
    console.error('[sentencingComparisonBrief] Error loading preprocessed data:', err.message);
    return null;
  }
}

/**
 * Get sentencing statistics using preprocessed data (fast) or CSV fallback (slow)
 * @param {string} offenseType - The offense taxonomy key
 * @param {number} sampleSize - Number of records to sample (for CSV fallback)
 * @returns {Promise<Object>} - Sentencing statistics
 */
async function getSentencingStats(offenseType, sampleSize = 100) {
  const startTime = Date.now();

  // Try preprocessed data first (<10ms)
  const preprocessed = loadPreprocessedStats();
  if (preprocessed && preprocessed[offenseType]) {
    const stats = preprocessed[offenseType];
    const duration = Date.now() - startTime;
    console.log(`[sentencingComparisonBrief] Preprocessed lookup for ${offenseType}: ${duration}ms`);

    return {
      medianSentence: stats.median_sentence_months,
      prisonRate: stats.prison_rate_percent,
      p25: stats.p25_sentence_months,
      p75: stats.p75_sentence_months,
      sampleSize: stats.sample_size,
      source: 'preprocessed',
      durationMs: duration,
      // Financial penalties
      medianFine: stats.median_fine || 0,
      medianRestitution: stats.median_restitution || 0,
      finesWithData: stats.fines_with_data || 0,
      restitutionsWithData: stats.restitutions_with_data || 0
    };
  }

  // Fall back to CSV streaming (30-60 seconds)
  console.log(`[sentencingComparisonBrief] Falling back to CSV query for ${offenseType}...`);
  const query = {
    offenseType,
    limit: sampleSize,
    randomSample: true
  };

  const results = await querySentencingData(query, DEFAULT_DATA_PATH);
  const records = results.records;

  const sentences = records
    .filter((r) => r.sentenceMonths != null && r.sentenceMonths > 0)
    .map((r) => r.sentenceMonths);

  const sortedSentences = [...sentences].sort((a, b) => a - b);
  const medianSentence = sentences.length > 0
    ? sortedSentences[Math.floor(sortedSentences.length / 2)]
    : null;

  const prisonRecords = records.filter((r) => r.prisonSentence);
  const prisonRate = records.length > 0 ? (prisonRecords.length / records.length) * 100 : 95;

  const duration = Date.now() - startTime;
  console.log(`[sentencingComparisonBrief] CSV query for ${offenseType}: ${duration}ms`);

  return {
    medianSentence: medianSentence || CIVILIAN_ANALOGS[offenseType]?.base_sentence_months || 18,
    prisonRate,
    p25: calculatePercentile(sortedSentences, 25),
    p75: calculatePercentile(sortedSentences, 75),
    sampleSize: records.length,
    source: 'csv',
    durationMs: duration
  };
}

/**
 * Build a sentencing comparison brief with Human-Scale Corporate Penalty analysis
 * @param {Object} corporateViolation - The corporate violation data
 * @param {string|null} investigationId - Parent investigation ID
 * @param {Object} options - Additional options
 * @param {number} [options.sampleSize=100] - Number of comparable USSC cases
 * @param {Object} [options.governance] - Override default governance structure
 * @param {number} [options.deaths] - Number of deaths (for workplace/environmental)
 * @param {boolean} [options.willful] - Whether violation was willful
 * @returns {Promise<Object>}
 */
export async function buildComparisonBrief(
  corporateViolation,
  investigationId = null,
  options = {}
) {
  const brief_id = randomUUID();
  const generated_at = new Date().toISOString();
  const sampleSize = options.sampleSize || 100;

  // Map to offense taxonomy
  let offenseType = mapCategoryToOffense(
    corporateViolation.category,
    corporateViolation.violationType
  );

  if (!offenseType) {
    throw new Error(`Unable to map category "${corporateViolation.category}" to offense taxonomy`);
  }

  // Map all financial/economic crimes to simplified "fraud_economic" category
  // for USSC preprocessed data lookup
  const financialOffenseTypes = ['securities_fraud', 'tax_evasion', 'wire_fraud', 'money_laundering', 'embezzlement', 'bribery', 'fraud_other'];
  const usscLookupType = financialOffenseTypes.includes(offenseType) ? 'fraud_economic' : 'all_other';

  const taxonomy = OFFENSE_TAXONOMY[offenseType];
  const civilianAnalog = CIVILIAN_ANALOGS[offenseType] || CIVILIAN_ANALOGS.wire_fraud;

  // Determine corporate governance structure
  const governance = options.governance || getDefaultGovernance(corporateViolation.brandSlug);

  // Get sentencing statistics (fast preprocessed or slow CSV fallback)
  const sentencingStats = await getSentencingStats(usscLookupType, sampleSize);

  const medianSentence = sentencingStats.medianSentence || civilianAnalog.base_sentence_months;
  const prisonRate = sentencingStats.prisonRate;
  const p25Sentence = sentencingStats.p25;
  const p75Sentence = sentencingStats.p75;

  // Calculate Human-Scale Corporate Penalty
  // Formula: median_sentence × number_of_decision_makers
  let perPersonSentence = medianSentence;

  // Apply enhancements for deaths
  if (options.deaths && options.deaths > 0) {
    if (civilianAnalog.multipliers?.per_death) {
      perPersonSentence *= Math.pow(civilianAnalog.multipliers.per_death, options.deaths - 1);
    }
  }

  // Apply willful violation enhancement
  if (options.willful && civilianAnalog.multipliers?.willful_violation) {
    perPersonSentence *= civilianAnalog.multipliers.willful_violation;
  }

  const aggregateHumanScalePenalty = {
    total_custody_months: Math.round(perPersonSentence * governance.total),
    total_custody_years: parseFloat(((perPersonSentence * governance.total) / 12).toFixed(1)),
    per_person_sentence_months: Math.round(perPersonSentence),
    per_person_sentence_years: parseFloat((perPersonSentence / 12).toFixed(1)),
    decision_makers: governance.total,
    interpretation: `If ${corporateViolation.brandName} operates with the legal rights of ${governance.total} individuals, it should face the cumulative criminal liability of ${governance.total} people committing this offense.`
  };

  // Calculate comprehensive civilian lifetime cost with collateral consequences
  const civilianLifetimeCost = calculateCivilianLifetimeCost(
    medianSentence,
    governance.total,
    sentencingStats
  );

  // Ensure decision_makers is set
  civilianLifetimeCost.decision_makers = governance.total;

  // Calculate corporate equivalent analysis
  const corporateEquivalent = calculateCorporateEquivalent(
    corporateViolation,
    civilianLifetimeCost,
    aggregateHumanScalePenalty
  );

  const thesisStatement = `If ${corporateViolation.brandName} operates with the constitutional rights of ${governance.total} individuals, it should face the aggregate criminal liability of ${governance.total} individuals who committed this offense. Under human-scale justice, this would result in ${aggregateHumanScalePenalty.total_custody_years} years of operational ineligibility - the time required for every decision-maker to serve their sentence before the entity could resume business.`;

  // Calculate operational restriction equivalence
  const operationalRestriction = {
    years_ineligible_to_operate: aggregateHumanScalePenalty.total_custody_years,
    thesis_statement: thesisStatement,
    explanation: `Under human-scale justice, this corporation should not be eligible to sell products, sign contracts, or conduct business for ${aggregateHumanScalePenalty.total_custody_years} years - the time required for every decision-maker to serve their sentence before the entity could resume business.`,
    simple_comparison: `Corporate: $${(corporateViolation.corporateFine || 0).toLocaleString()} fine, 0 years ineligible | Human-scale: ${aggregateHumanScalePenalty.total_custody_years} years ineligible to operate`,
    per_decision_maker: `Each of ${governance.total} decision-makers avoided ${aggregateHumanScalePenalty.per_person_sentence_years} years federal custody`,
    societal_cost: `If corporations have personhood rights, they avoided ${aggregateHumanScalePenalty.total_custody_years} person-years of accountability`
  };

  // Calculate disparity vs actual outcome
  // IMPORTANT: Do NOT convert fines to time equivalents
  // The disparity is: MONEY vs. TIME SHUT DOWN
  const corporateFine = corporateViolation.corporateFine || 0;
  const corporateSentence = corporateViolation.corporateSentence || 0;
  const actualCustodyYears = corporateSentence / 12; // Only actual prison time, not fines

  // Calculate severity based on the gap between human-scale and actual accountability
  // If no custody time = INFINITE disparity (money cannot buy freedom from prison)
  const humanScaleYears = aggregateHumanScalePenalty.total_custody_years;
  let disparitySeverity = 'unknown';
  let disparityRatio = null;
  let disparityInterpretation = '';

  if (humanScaleYears > 0) {
    if (actualCustodyYears <= 0) {
      // Zero custody time = INFINITE disparity
      disparitySeverity = 'catastrophic';
      disparityRatio = Infinity;
      disparityInterpretation = `Complete accountability gap: Corporation pays \$${corporateFine.toLocaleString()} and continues operations while human-scale justice would require ${humanScaleYears} years of complete operational shutdown.`;
    } else {
      // Some custody time exists - calculate ratio
      disparityRatio = humanScaleYears / actualCustodyYears;

      if (disparityRatio > 100) {
        disparitySeverity = 'extreme';
      } else if (disparityRatio > 20) {
        disparitySeverity = 'catastrophic';
      } else if (disparityRatio > 10) {
        disparitySeverity = 'severe';
      } else if (disparityRatio > 5) {
        disparitySeverity = 'substantial';
      } else if (disparityRatio > 2) {
        disparitySeverity = 'notable';
      } else {
        disparitySeverity = 'minimal';
      }

      disparityInterpretation = `Corporate executives served ${actualCustodyYears.toFixed(1)} years vs. ${humanScaleYears} years required under human-scale justice.`;
    }
  }

  // Build the comprehensive brief
  const brief = {
    brief_id,
    investigation_id: investigationId,
    generated_at,
    schema_version: BRIEF_SCHEMA_VERSION,
    issuer: BRIEF_ISSUER,
    disclaimer: BRIEF_DISCLAIMER,

    // Corporate violation details
    corporate_violation: {
      brand_name: corporateViolation.brandName,
      brand_slug: corporateViolation.brandSlug,
      category: corporateViolation.category,
      violation_type: corporateViolation.violationType,
      amount_involved: corporateViolation.amountInvolved,
      corporate_outcome: corporateViolation.corporateOutcome,
      corporate_fine: corporateViolation.corporateFine,
      corporate_sentence_months: corporateViolation.corporateSentence,
      incident_date: corporateViolation.incidentDate,
      resolution_date: corporateViolation.resolutionDate,
      sources: corporateViolation.sources
    },

    // Corporate governance structure
    corporate_governance: {
      board_members: governance.board_members,
      c_suite_with_authority: governance.c_suite_authority,
      total_decision_makers: governance.total,
      data_source: governance.is_estimated ? 'Default based on company size' : 'SEC proxy filings',
      is_estimated: governance.is_estimated || false
    },

    // Civilian criminal analog
    civilian_criminal_analog: {
      statute: civilianAnalog.statute,
      charge_description: civilianAnalog.charge_description,
      median_sentence_per_person_months: medianSentence,
      median_sentence_per_person_years: parseFloat((medianSentence / 12).toFixed(1)),
      prison_rate_percent: parseFloat(prisonRate.toFixed(1)),
      sample_size: sentencingStats.sampleSize,
      data_source: sentencingStats.source === 'preprocessed' ? 'USSC Preprocessed Cache' : 'USSC FY2024 Live Query',
      query_duration_ms: sentencingStats.durationMs,
      notes: civilianAnalog.notes
    },

    // Human-Scale Corporate Penalty calculation
    human_scale_analysis: aggregateHumanScalePenalty,

    // Operational restriction equivalence
    operational_restriction_equivalence: operationalRestriction,

    // Actual corporate outcome - MONEY vs. TIME
    actual_corporate_outcome: {
      fine_amount: corporateFine,
      custody_time_months: corporateSentence,
      custody_time_years: parseFloat((corporateSentence / 12).toFixed(1)),
      operational_pause_days: 0,
      operational_pause_years: 0,
      admission_of_wrongdoing: corporateViolation.admission || false,
      individuals_criminally_charged: corporateViolation.individualsCharged || 0,
      business_impact: 'Continued operations - no restrictions on sales, contracts, or eligibility to operate'
    },

    // Collateral consequences - the TOTAL civilian cost
    civilian_total_lifetime_cost: {
      decision_makers: governance.total,
      prison_time: {
        per_person_months: medianSentence,
        per_person_years: parseFloat((medianSentence / 12).toFixed(1)),
        aggregate_years: civilianLifetimeCost.aggregate.total_prison_years
      },
      financial: {
        per_person: {
          median_fine: civilianLifetimeCost.per_person.financial.median_fine,
          court_costs: civilianLifetimeCost.per_person.financial.estimated_court_costs,
          restitution: civilianLifetimeCost.per_person.financial.estimated_restitution,
          lost_income_during_incarceration: civilianLifetimeCost.per_person.financial.lost_income_during_incarceration,
          lifetime_income_penalty: civilianLifetimeCost.per_person.financial.lifetime_income_penalty.total_lifetime_loss,
          supervision_costs_3yr: civilianLifetimeCost.per_person.financial.supervision_costs.total_3yr_supervision,
          total_financial_impact: civilianLifetimeCost.per_person.financial.total_financial_impact
        },
        aggregate: {
          total_fines: civilianLifetimeCost.aggregate.total_fines,
          total_restitution: civilianLifetimeCost.aggregate.total_restitution,
          total_lost_income_during_incarceration: civilianLifetimeCost.aggregate.total_lost_income_during_incarceration,
          total_lifetime_income_penalty: civilianLifetimeCost.aggregate.total_lifetime_income_penalty,
          total_supervision_costs: civilianLifetimeCost.aggregate.total_supervision_costs,
          total_financial_impact: civilianLifetimeCost.aggregate.total_financial_impact
        }
      },
      permanent_barriers: PERMANENT_BARRIERS,
      human_costs: HUMAN_COSTS,
      sources: [
        'U.S. Sentencing Commission FY2024 (financial penalties)',
        'Prison Policy Initiative (employment impacts)',
        'Bureau of Justice Statistics (recidivism and supervision)',
        'Collateral Consequences Resource Center (legal disabilities)'
      ]
    },

    // Corporate equivalent - what would happen if corporations faced the same consequences
    corporate_equivalent_analysis: corporateEquivalent,

    // Enhanced disparity analysis with total cost comparison
    disparity_analysis: {
      severity: disparitySeverity,
      ratio: disparityRatio === Infinity ? 'INFINITE' : (disparityRatio ? parseFloat(disparityRatio.toFixed(1)) : null),
      human_scale_penalty_years: aggregateHumanScalePenalty.total_custody_years,
      actual_corporate_custody_years: actualCustodyYears,
      actual_corporate_fine: corporateFine,

      // NEW: Total cost comparison
      total_cost_comparison: {
        human_scale: {
          prison_years: civilianLifetimeCost.aggregate.total_prison_years,
          financial_penalties: civilianLifetimeCost.aggregate.total_financial_impact,
          permanent_barriers: `${governance.total} people permanently unemployable in their professions`,
          family_destruction: `${governance.total} families disrupted`,
          summary: `${civilianLifetimeCost.aggregate.total_prison_years} years prison + $${civilianLifetimeCost.aggregate.total_financial_impact.toLocaleString()} financial impact + ${governance.total} careers destroyed + families separated`
        },
        actual_corporate: {
          prison_years: actualCustodyYears,
          financial_penalty: corporateFine,
          operational_impact: 'None - business continues',
          executive_impact: '0 executives imprisoned, 0 licenses revoked',
          summary: `$${corporateFine.toLocaleString()} fine (often tax-deductible), ${actualCustodyYears} years custody, business as usual`
        },
        disparity_ratio_financial: corporateFine > 0
          ? parseFloat((civilianLifetimeCost.aggregate.total_financial_impact / corporateFine).toFixed(1))
          : 'INFINITE'
      },

      interpretation: disparityInterpretation || generateDisparityInterpretation(
        corporateViolation.brandName,
        aggregateHumanScalePenalty,
        { corporateFine, actualCustodyYears },
        disparitySeverity
      )
    },

    // Raw USSC data for verification
    ussc_data_summary: {
      offense_type: offenseType,
      offense_description: taxonomy.description,
      ussc_codes: taxonomy.usscCodes,
      sample_size: sentencingStats.sampleSize,
      median_sentence_months: medianSentence,
      p25_sentence_months: p25Sentence,
      p75_sentence_months: p75Sentence,
      prison_rate_percent: parseFloat(prisonRate.toFixed(1)),
      ussc_lookup_category: usscLookupType,
      data_source: sentencingStats.source === 'preprocessed'
        ? 'USSC Preprocessed Cache'
        : 'USSC FY2024 Live Query',
      query_performance_ms: sentencingStats.durationMs
    },

    // Disparity visualization
    disparity_visualization: {
      simple_comparison: operationalRestriction.simple_comparison,
      per_decision_maker: operationalRestriction.per_decision_maker,
      societal_cost: operationalRestriction.societal_cost,
      thesis_statement: thesisStatement
    },

    // Sources and verification
    sources: [
      ...corporateViolation.sources,
      'https://www.ussc.gov/research/datafiles/commission-datafiles'
    ],
    verification_url: `${VERIFY_BASE}/verify/comparison-brief/${brief_id}`,
    signature: null
  };

  // Add cryptographic signature
  const bodyForSigning = { ...brief };
  delete bodyForSigning.signature;
  delete bodyForSigning.verification_url;

  const signature = signReceiptBody(bodyForSigning);
  brief.signature = signature;
  brief.public_key = getReceiptPublicKeyB64Url();

  return brief;
}

/**
 * Calculate civilian total lifetime cost including collateral consequences
 * @param {number} medianSentenceMonths - Median sentence in months
 * @param {number} decisionMakers - Number of decision makers
 * @param {Object} sentencingStats - USSC sentencing statistics
 * @returns {Object} - Complete lifetime cost analysis
 */
function calculateCivilianLifetimeCost(medianSentenceMonths, decisionMakers, sentencingStats) {
  const sentenceYears = medianSentenceMonths / 12;
  const preIncome = COLLATERAL_CONSEQUENCES.income.pre_conviction_annual;
  const postIncome = COLLATERAL_CONSEQUENCES.income.post_conviction_annual;
  const yearsToRetirement = COLLATERAL_CONSEQUENCES.income.years_to_retirement;

  // Per-person calculations
  const perPerson = {
    // Prison time
    prison_time_months: medianSentenceMonths,
    prison_time_years: parseFloat(sentenceYears.toFixed(1)),

    // Financial penalties
    financial: {
      // Median fine from USSC data (or default)
      median_fine: sentencingStats.medianFine || 400, // $400 default if not available
      estimated_court_costs: COLLATERAL_CONSEQUENCES.court_costs.estimated_court_costs,
      estimated_restitution: sentencingStats.medianRestitution || 0,

      // Lost income during incarceration
      lost_income_during_incarceration: Math.round(preIncome * sentenceYears),

      // Lifetime income penalty (50% wage reduction until retirement)
      lifetime_income_penalty: {
        pre_conviction_annual: preIncome,
        post_conviction_annual: postIncome,
        annual_reduction: preIncome - postIncome,
        years_remaining: yearsToRetirement,
        total_lifetime_loss: (preIncome - postIncome) * yearsToRetirement
      },

      // Supervision costs (3 years average)
      supervision_costs: {
        drug_testing_3yr: COLLATERAL_CONSEQUENCES.supervision.drug_testing_cost_per_test *
          COLLATERAL_CONSEQUENCES.supervision.tests_per_month * 12 * 3,
        supervision_fees_3yr: COLLATERAL_CONSEQUENCES.supervision.supervision_fee_monthly * 12 * 3,
        total_3yr_supervision:
          (COLLATERAL_CONSEQUENCES.supervision.drug_testing_cost_per_test *
            COLLATERAL_CONSEQUENCES.supervision.tests_per_month * 12 * 3) +
          (COLLATERAL_CONSEQUENCES.supervision.supervision_fee_monthly * 12 * 3)
      },

      // Total financial impact per person
      total_financial_impact: 0 // Calculated below
    },

    // Permanent barriers
    permanent_barriers: PERMANENT_BARRIERS,

    // Human costs
    human_costs: HUMAN_COSTS
  };

  // Calculate total financial impact per person
  perPerson.financial.total_financial_impact =
    perPerson.financial.median_fine +
    perPerson.financial.estimated_court_costs +
    perPerson.financial.estimated_restitution +
    perPerson.financial.lost_income_during_incarceration +
    perPerson.financial.lifetime_income_penalty.total_lifetime_loss +
    perPerson.financial.supervision_costs.total_3yr_supervision;

  // Aggregate for all decision makers
  const aggregate = {
    total_prison_years: parseFloat((sentenceYears * decisionMakers).toFixed(1)),
    total_fines: perPerson.financial.median_fine * decisionMakers,
    total_restitution: perPerson.financial.estimated_restitution * decisionMakers,
    total_lost_income_during_incarceration: perPerson.financial.lost_income_during_incarceration * decisionMakers,
    total_lifetime_income_penalty: perPerson.financial.lifetime_income_penalty.total_lifetime_loss * decisionMakers,
    total_supervision_costs: perPerson.financial.supervision_costs.total_3yr_supervision * decisionMakers,
    total_financial_impact: perPerson.financial.total_financial_impact * decisionMakers
  };

  return {
    per_person: perPerson,
    aggregate: aggregate,
    decision_makers: decisionMakers
  };
}

/**
 * Calculate corporate equivalent analysis
 * Shows what would happen if corporations faced the same consequences as individuals
 * @param {Object} corporateViolation - The corporate violation
 * @param {Object} civilianCost - Civilian lifetime cost analysis
 * @param {Object} humanScalePenalty - Human-scale penalty calculation
 * @returns {Object} - Corporate equivalent analysis
 */
function calculateCorporateEquivalent(corporateViolation, civilianCost, humanScalePenalty) {
  const governance = civilianCost.decision_makers;
  const totalFinancialImpact = civilianCost.aggregate.total_financial_impact;

  return {
    if_corporations_faced_human_consequences: {
      prison_equivalent: `${humanScalePenalty.total_custody_years} years complete operational shutdown`,
      financial_equivalent: {
        fines_and_court_costs: `$${(civilianCost.aggregate.total_fines + (civilianCost.aggregate.total_restitution * governance)).toLocaleString()}`,
        lost_during_incarceration: `$${civilianCost.aggregate.total_lost_income_during_incarceration.toLocaleString()}`,
        lifetime_income_penalty: `$${civilianCost.aggregate.total_lifetime_income_penalty.toLocaleString()}`,
        total_human_scale_financial: `$${totalFinancialImpact.toLocaleString()}`
      },
      permanent_barriers_equivalent: [
        `All ${governance} decision-makers permanently barred from any corporate role`,
        'All professional licenses revoked for all decision-makers',
        'Corporation permanently ineligible for ANY government contracts',
        'Corporation cannot operate in 87% of markets (employer rejection rate applied)',
        'All corporate assets subject to forfeiture',
        'Cannot bid on federal projects (SBA disqualification)',
        'Cannot participate in federal programs (student loan servicing, etc.)',
        'Public reputation permanently damaged ("felon" label equivalent)'
      ],
      supervision_equivalent: `${COLLATERAL_CONSEQUENCES.supervision.average_supervised_release_years} years of federal oversight with pre-approval required for all business decisions`,
      family_impact_equivalent: `${governance} families experiencing income loss, housing instability, and intergenerational trauma`
    },

    actual_corporate_outcome: {
      operational_pause: '0 days',
      executives_fired: corporateViolation.executivesFired || 0,
      executives_charged: corporateViolation.individualsCharged || 0,
      executives_convicted: 0,
      executives_lost_licenses: 0,
      executives_barred_from_industry: 0,
      future_contract_eligibility: 'Unaffected (can still bid on government contracts)',
      market_access: '100% (no restrictions)',
      asset_forfeiture: 'None (company retains all assets)',
      tax_deductible_penalty: corporateViolation.corporateFine > 0,
      insurance_coverage: 'D&O insurance typically covers defense costs',
      business_as_usual: 'Continued operations with no structural changes'
    }
  };
}

/**
 * Get default governance structure based on company type
 */
function getDefaultGovernance(brandSlug) {
  // Check if it's a known large corporation
  const knownLargeCorp = ['amazon', 'walmart', 'apple', 'google', 'microsoft', 'meta', 'exxon', 'chevron', 'boeing', 'gm', 'ford', 'jpmorgan', 'goldman'];
  const isLargeCorp = knownLargeCorp.some(corp => brandSlug.toLowerCase().includes(corp));

  if (isLargeCorp) {
    return { ...DEFAULT_GOVERNANCE.multinational, is_estimated: true };
  }

  // Default to public corporation
  return { ...DEFAULT_GOVERNANCE.public_corporation, is_estimated: true };
}

/**
 * Generate human-readable disparity interpretation
 * Shows MONEY vs. TIME - the actual comparison, not converted equivalents
 */
function generateDisparityInterpretation(brandName, humanScale, actual, severity) {
  const fineStr = actual.corporateFine > 0
    ? `\$${actual.corporateFine.toLocaleString()} fine`
    : 'No monetary penalty';
  const custodyStr = actual.actualCustodyYears > 0
    ? `${actual.actualCustodyYears.toFixed(1)} years custody`
    : 'zero custody time';

  const interpretations = {
    catastrophic: `${brandName} paid ${fineStr} with ${custodyStr}, and continues operations. Under human-scale justice: ${humanScale.total_custody_years} years complete operational shutdown required. The accountability gap is INFINITE - money cannot purchase freedom from prison time.`,
    extreme: `${brandName} faces ${humanScale.total_custody_years} years of avoided accountability under human-scale justice. Actual penalty: ${fineStr}, ${custodyStr}, business continues.`,
    severe: `Under human-scale justice, ${brandName} should be ineligible to operate for ${humanScale.total_custody_years} years. Instead: ${fineStr}, ${custodyStr}, continued operations.`,
    substantial: `Substantial disparity: ${humanScale.total_custody_years} years human-scale penalty vs. ${fineStr} and ${custodyStr}.`,
    moderate: `Moderate disparity: Human-scale requires ${humanScale.total_custody_years} years ineligible; actual is ${fineStr}, ${custodyStr}.`,
    notable: `Notable disparity in accountability between human-scale and corporate penalties.`,
    minimal: `Corporate custody time roughly proportional to human-scale calculation (rare).`,
    unknown: 'Insufficient data for disparity calculation.'
  };

  return interpretations[severity] || interpretations.unknown;
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Generate summary text for the comparison brief
 */
export function generateBriefSummary(brief) {
  const cv = brief.corporate_violation;
  const hsa = brief.human_scale_analysis;
  const ore = brief.operational_restriction_equivalence;
  const da = brief.disparity_analysis;
  const clc = brief.civilian_total_lifetime_cost;
  const cea = brief.corporate_equivalent_analysis;

  let summary = `HUMAN-SCALE CORPORATE PENALTY ANALYSIS: ${cv.brand_name.toUpperCase()}\n`;
  summary += '='.repeat(70) + '\n\n';

  summary += `CORPORATE VIOLATION:\n`;
  summary += `  Type: ${cv.violation_type}\n`;
  summary += `  Amount: $${cv.amount_involved.toLocaleString()}\n`;
  summary += `  Actual Outcome: ${cv.corporate_outcome || 'Unknown'}\n`;
  summary += `  Fine: $${(cv.corporate_fine || 0).toLocaleString()}\n\n`;

  summary += `CORPORATE GOVERNANCE:\n`;
  summary += `  Board Members: ${brief.corporate_governance.board_members}\n`;
  summary += `  C-Suite with Authority: ${brief.corporate_governance.c_suite_with_authority}\n`;
  summary += `  Total Decision-Makers: ${brief.corporate_governance.total_decision_makers}\n\n`;

  summary += `CIVILIAN CRIMINAL ANALOG:\n`;
  summary += `  ${brief.civilian_criminal_analog.statute}\n`;
  summary += `  Median Sentence (per person): ${brief.civilian_criminal_analog.median_sentence_per_person_years} years\n`;
  summary += `  Prison Rate: ${brief.civilian_criminal_analog.prison_rate_percent}%\n`;
  summary += `  Sample Size: ${brief.civilian_criminal_analog.sample_size} USSC cases\n\n`;

  summary += `HUMAN-SCALE CORPORATE PENALTY:\n`;
  summary += `  ${ore.thesis_statement}\n\n`;
  summary += `  Aggregate Penalty: ${hsa.total_custody_years} years\n`;
  summary += `  (${hsa.decision_makers} people × ${hsa.per_person_sentence_years} years each)\n\n`;

  summary += `OPERATIONAL RESTRICTION EQUIVALENCE:\n`;
  summary += `  Years Ineligible to Operate: ${ore.years_ineligible_to_operate}\n`;
  summary += `  Simple Comparison: ${ore.simple_comparison}\n`;
  summary += `  Per Decision-Maker: ${ore.per_decision_maker}\n\n`;

  summary += `CIVILIAN TOTAL LIFETIME COST (Per Person):\n`;
  summary += `  Prison Time: ${clc.prison_time.per_person_years} years\n`;
  summary += `  Financial Penalties:\n`;
  summary += `    - Median Fine: $${clc.financial.per_person.median_fine.toLocaleString()}\n`;
  summary += `    - Court Costs: $${clc.financial.per_person.court_costs.toLocaleString()}\n`;
  summary += `    - Restitution: $${clc.financial.per_person.restitution.toLocaleString()}\n`;
  summary += `    - Lost Income During Prison: $${clc.financial.per_person.lost_income_during_incarceration.toLocaleString()}\n`;
  summary += `    - Lifetime Income Penalty: $${clc.financial.per_person.lifetime_income_penalty.toLocaleString()}\n`;
  summary += `    - Supervision Costs (3yr): $${clc.financial.per_person.supervision_costs_3yr.toLocaleString()}\n`;
  summary += `    TOTAL PER PERSON: $${clc.financial.per_person.total_financial_impact.toLocaleString()}\n\n`;

  summary += `CIVILIAN TOTAL LIFETIME COST (Aggregate - ${clc.decision_makers} decision-makers):\n`;
  summary += `  Total Prison Years: ${clc.prison_time.aggregate_years} years\n`;
  summary += `  Total Financial Impact: $${clc.financial.aggregate.total_financial_impact.toLocaleString()}\n`;
  summary += `    - Fines: $${clc.financial.aggregate.total_fines.toLocaleString()}\n`;
  summary += `    - Restitution: $${clc.financial.aggregate.total_restitution.toLocaleString()}\n`;
  summary += `    - Lost Income During Incarceration: $${clc.financial.aggregate.total_lost_income_during_incarceration.toLocaleString()}\n`;
  summary += `    - Lifetime Income Penalty: $${clc.financial.aggregate.total_lifetime_income_penalty.toLocaleString()}\n`;
  summary += `    - Supervision Costs: $${clc.financial.aggregate.total_supervision_costs.toLocaleString()}\n\n`;

  summary += `PERMANENT BARRIERS (All ${clc.decision_makers} people):\n`;
  summary += `  - Permanent felony record (never expunged)\n`;
  summary += `  - 87% employer rejection rate\n`;
  summary += `  - Loss of all professional licenses\n`;
  summary += `  - Cannot own firearms\n`;
  summary += `  - Cannot serve on juries\n`;
  summary += `  - Ineligible for government contracts\n`;
  summary += `  - Ineligible for student aid\n\n`;

  summary += `CORPORATE EQUIVALENT (If corporations faced same consequences):\n`;
  summary += `  Prison Equivalent: ${cea.if_corporations_faced_human_consequences.prison_equivalent}\n`;
  summary += `  Financial Equivalent: ${cea.if_corporations_faced_human_consequences.financial_equivalent.total_human_scale_financial}\n`;
  summary += `  Supervision Equivalent: ${cea.if_corporations_faced_human_consequences.supervision_equivalent}\n\n`;

  summary += `ACTUAL CORPORATE OUTCOME:\n`;
  summary += `  Operational Pause: ${cea.actual_corporate_outcome.operational_pause}\n`;
  summary += `  Executives Fired: ${cea.actual_corporate_outcome.executives_fired}\n`;
  summary += `  Executives Charged: ${cea.actual_corporate_outcome.executives_charged}\n`;
  summary += `  Executives Convicted: ${cea.actual_corporate_outcome.executives_convicted}\n`;
  summary += `  Asset Forfeiture: ${cea.actual_corporate_outcome.asset_forfeiture}\n`;
  summary += `  Market Access: ${cea.actual_corporate_outcome.market_access}\n\n`;

  summary += `DISPARITY ASSESSMENT: ${da.severity.toUpperCase()}\n`;
  summary += `  Human-Scale Total Cost:\n`;
  summary += `    - Prison: ${da.total_cost_comparison.human_scale.prison_years} years\n`;
  summary += `    - Financial: $${da.total_cost_comparison.human_scale.financial_penalties.toLocaleString()}\n`;
  summary += `    - Permanent Barriers: ${da.total_cost_comparison.human_scale.permanent_barriers}\n`;
  summary += `    - Summary: ${da.total_cost_comparison.human_scale.summary}\n\n`;
  summary += `  Actual Corporate Cost:\n`;
  summary += `    - Prison: ${da.total_cost_comparison.actual_corporate.prison_years} years\n`;
  summary += `    - Financial: $${da.total_cost_comparison.actual_corporate.financial_penalty.toLocaleString()}\n`;
  summary += `    - Operational Impact: ${da.total_cost_comparison.actual_corporate.operational_impact}\n`;
  summary += `    - Summary: ${da.total_cost_comparison.actual_corporate.summary}\n\n`;
  summary += `  Financial Disparity Ratio: ${da.total_cost_comparison.disparity_ratio_financial}:1\n\n`;
  summary += `  ${da.interpretation}\n`;
  if (da.ratio) {
    summary += `  Custody Ratio: ${da.ratio === 'INFINITE' ? '∞' : da.ratio.toFixed(1)}:1 (human-scale custody : actual custody)\n`;
  }
  summary += '\n';

  summary += `SIGNATURE: ${brief.signature ? brief.signature.substring(0, 50) + '...' : 'None (Ed25519 unavailable)'}\n`;
  summary += `Verification: ${brief.verification_url}\n`;

  return summary;
}

/**
 * Verify a comparison brief signature
 */
export function verifyComparisonBrief(brief) {
  if (!brief.signature || !brief.signature.startsWith('ed25519:')) {
    return false;
  }
  const bodyForVerify = { ...brief };
  delete bodyForVerify.signature;
  delete bodyForVerify.verification_url;
  return verifyReceiptSignature(bodyForVerify, brief.signature);
}

export default {
  buildComparisonBrief,
  generateBriefSummary,
  verifyComparisonBrief,
  CIVILIAN_ANALOGS,
  DEFAULT_GOVERNANCE
};
