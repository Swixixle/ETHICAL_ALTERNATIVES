/**
 * Human-Scale Corporate Penalty Integration Service
 * Wires sentencing comparison into EthicalAlt investigation reports
 */

import { buildComparisonBrief } from './sentencingComparisonBrief.js';
import { OFFENSE_TAXONOMY, mapCategoryToOffense } from '../data/offenseTaxonomy.js';

/**
 * Default governance structure for corporations
 */
const DEFAULT_GOVERNANCE = {
  public_corporation: { board_members: 12, c_suite_authority: 5, total: 17 },
  private_corporation: { board_members: 8, c_suite_authority: 3, total: 11 },
  small_business: { board_members: 3, c_suite_authority: 0, total: 3 },
  multinational: { board_members: 15, c_suite_authority: 7, total: 22 }
};

/**
 * Map investigation category to corporate violation type
 */
function mapCategoryToViolationType(category, flags = []) {
  const categoryMap = {
    tax: { type: 'tax_evasion', statute: '26 U.S.C. § 7201', description: 'Tax evasion' },
    legal: { type: 'securities_fraud', statute: '18 U.S.C. § 1348', description: 'Securities fraud' },
    labor: { type: 'labor_violation', statute: '29 U.S.C. § 216', description: 'Labor violations' },
    environmental: { type: 'environmental_violation', statute: '42 U.S.C. § 7413', description: 'Environmental crimes' },
    political: { type: 'bribery', statute: '18 U.S.C. § 201', description: 'Political corruption' },
    product_health: { type: 'consumer_fraud', statute: '18 U.S.C. § 1347', description: 'Consumer fraud' }
  };

  const mapped = categoryMap[category?.toLowerCase()];
  if (!mapped) return null;

  // Check if offense is in Phase 1 (financial fraud)
  const taxonomy = OFFENSE_TAXONOMY[mapped.type];
  if (!taxonomy) return null;

  return mapped;
}

/**
 * Estimate violation amount from investigation flags
 * This is a heuristic - real enforcement data would be better
 */
function estimateViolationAmount(flags, category) {
  if (!Array.isArray(flags) || flags.length === 0) return 1000000; // $1M default

  // Look for dollar amounts in flags
  let maxAmount = 0;
  for (const flag of flags) {
    if (typeof flag !== 'string') continue;

    // Look for patterns like "$50 million", "$100M", etc.
    const matches = flag.match(/\$([\d,.]+)\s*(million|billion|M|B)?/i);
    if (matches) {
      const num = parseFloat(matches[1].replace(/,/g, ''));
      const multiplier = matches[2]?.toLowerCase();
      if (multiplier?.includes('billion') || multiplier === 'b') {
        maxAmount = Math.max(maxAmount, num * 1000000000);
      } else if (multiplier?.includes('million') || multiplier === 'm') {
        maxAmount = Math.max(maxAmount, num * 1000000);
      } else {
        maxAmount = Math.max(maxAmount, num);
      }
    }
  }

  return maxAmount > 0 ? maxAmount : 1000000; // Default $1M
}

/**
 * Get corporate governance structure for a brand
 */
function getGovernanceForBrand(brandSlug) {
  // Known large corporations
  const largeCorpSlugs = [
    'amazon', 'walmart', 'apple', 'google', 'microsoft', 'meta', 'exxon', 'chevron',
    'boeing', 'gm', 'ford', 'jpmorgan', 'goldman', 'citigroup', 'bank-of-america',
    'wells-fargo', 'pfizer', 'johnson-johnson', 'procter-gamble', 'unitedhealth'
  ];

  const isLargeCorp = largeCorpSlugs.some(corp => brandSlug.toLowerCase().includes(corp));

  if (isLargeCorp) {
    return { ...DEFAULT_GOVERNANCE.multinational, is_estimated: true };
  }

  // Default to public corporation
  return { ...DEFAULT_GOVERNANCE.public_corporation, is_estimated: true };
}

/**
 * Generate Human-Scale Corporate Penalty analysis for an investigation category
 * @param {string} brandName - Company name
 * @param {string} brandSlug - Company slug
 * @param {string} category - Investigation category (tax, legal, labor, etc.)
 * @param {Array} flags - Category flags
 * @param {Array} sources - Source URLs
 * @returns {Promise<Object|null>} - Human-scale penalty brief or null if not applicable
 */
export async function generateCategoryHumanScaleAnalysis(
  brandName,
  brandSlug,
  category,
  flags = [],
  sources = []
) {
  const violationInfo = mapCategoryToViolationType(category, flags);
  if (!violationInfo) {
    console.log(`[human-scale] Skipping ${category} - not in Phase 1 offense taxonomy`);
    return null;
  }

  // Check if this offense type is supported
  const offenseType = mapCategoryToOffense(category, violationInfo.description);
  if (!offenseType) {
    console.log(`[human-scale] No offense taxonomy mapping for ${category}`);
    return null;
  }

  const amount = estimateViolationAmount(flags, category);
  const governance = getGovernanceForBrand(brandSlug);

  const corporateViolation = {
    brandName,
    brandSlug,
    category,
    violationType: violationInfo.description,
    amountInvolved: amount,
    corporateOutcome: 'Settlement with regulatory authorities',
    corporateFine: amount * 0.1, // Estimated 10% of violation amount
    corporateSentence: 0,
    incidentDate: new Date().getFullYear().toString(),
    resolutionDate: new Date().toISOString().split('T')[0],
    admission: false,
    individualsCharged: 0,
    sources: sources.slice(0, 3) // First 3 sources
  };

  try {
    const brief = await buildComparisonBrief(
      corporateViolation,
      null, // investigation_id
      {
        sampleSize: 100,
        governance
      }
    );

    // Return simplified structure for investigation report
    return {
      offense_type: offenseType,
      civilian_statute: violationInfo.statute,
      civilian_description: violationInfo.description,
      corporate_governance: {
        board_members: governance.board_members,
        c_suite_authority: governance.c_suite_authority,
        total_decision_makers: governance.total,
        is_estimated: governance.is_estimated
      },
      civilian_analog: {
        median_sentence_months: brief.civilian_criminal_analog.median_sentence_per_person_months,
        median_sentence_years: brief.civilian_criminal_analog.median_sentence_per_person_years,
        prison_rate_percent: brief.civilian_criminal_analog.prison_rate_percent,
        sample_size: brief.civilian_criminal_analog.sample_size
      },
      human_scale_penalty: {
        total_custody_years: brief.human_scale_analysis.total_custody_years,
        per_person_years: brief.human_scale_analysis.per_person_sentence_years,
        decision_makers: brief.human_scale_analysis.decision_makers,
        interpretation: brief.human_scale_analysis.interpretation
      },
      operational_restriction: {
        years_ineligible: brief.operational_restriction_equivalence.years_ineligible_to_operate,
        simple_comparison: brief.operational_restriction_equivalence.simple_comparison
      },
      actual_outcome: {
        fine: brief.actual_corporate_outcome.fine_amount,
        custody_years: brief.actual_corporate_outcome.custody_time_years,
        operational_pause_years: brief.actual_corporate_outcome.operational_pause_years
      },
      disparity: {
        severity: brief.disparity_analysis.severity,
        ratio: brief.disparity_analysis.ratio,
        interpretation: brief.disparity_analysis.interpretation
      },
      thesis_statement: brief.disparity_visualization.thesis_statement,
      ussc_data_source: 'U.S. Sentencing Commission FY2024',
      brief_id: brief.brief_id,
      generated_at: brief.generated_at
    };
  } catch (err) {
    console.error(`[human-scale] Error generating analysis for ${brandSlug}/${category}:`, err.message);
    return null;
  }
}

/**
 * Attach Human-Scale Corporate Penalty analysis to investigation
 * @param {Object} investigation - The investigation object to modify
 * @param {string} brandName - Company name
 * @param {string} brandSlug - Company slug
 * @returns {Promise<void>}
 */
export async function attachHumanScaleToInvestigation(
  investigation,
  brandName,
  brandSlug
) {
  const categories = ['tax', 'legal', 'labor', 'environmental', 'political'];
  const humanScaleData = {};

  console.log(`[human-scale] Generating analysis for ${brandSlug}...`);

  for (const category of categories) {
    const summary = investigation[`${category}_summary`];
    const flags = investigation[`${category}_flags`] || [];
    const sources = investigation[`${category}_sources`] || [];

    // Only analyze categories that have actual content
    if (!summary && flags.length === 0) continue;

    const analysis = await generateCategoryHumanScaleAnalysis(
      brandName,
      brandSlug,
      category,
      flags,
      sources
    );

    if (analysis) {
      humanScaleData[category] = analysis;
      console.log(`[human-scale] ${category}: ${analysis.disparity.severity} disparity (${analysis.human_scale_penalty.total_custody_years} years)`);
    }
  }

  // Attach to investigation
  investigation.human_scale_penalty = {
    generated_at: new Date().toISOString(),
    data_available: Object.keys(humanScaleData).length > 0,
    categories: humanScaleData,
    summary: generateHumanScaleSummary(humanScaleData)
  };
}

/**
 * Generate executive summary of human-scale penalties
 */
function generateHumanScaleSummary(categoryData) {
  const categories = Object.keys(categoryData);
  if (categories.length === 0) {
    return 'Human-scale penalty analysis not available for this investigation.';
  }

  const totalYears = categories.reduce(
    (sum, cat) => sum + (categoryData[cat].human_scale_penalty?.total_custody_years || 0),
    0
  );

  const severeCategories = categories.filter(
    cat => ['catastrophic', 'extreme', 'severe'].includes(categoryData[cat].disparity?.severity)
  );

  let summary = `Analysis across ${categories.length} violation categories shows `;

  if (severeCategories.length > 0) {
    summary += `significant accountability gaps. `;
    summary += `Severe disparities in: ${severeCategories.join(', ')}. `;
  } else {
    summary += `moderate accountability gaps. `;
  }

  summary += `Aggregate human-scale penalty: ${totalYears.toFixed(1)} years of operational ineligibility `;
  summary += `across all decision-makers.`;

  return summary;
}

/**
 * Generate formatted human-scale report for display
 * @param {Object} humanScaleData - The human_scale_penalty object
 * @returns {string} - Formatted report
 */
export function formatHumanScaleReport(humanScaleData) {
  if (!humanScaleData?.categories || Object.keys(humanScaleData.categories).length === 0) {
    return 'Human-scale penalty analysis not available.';
  }

  let report = 'HUMAN-SCALE CORPORATE PENALTY ANALYSIS\n';
  report += '='.repeat(70) + '\n\n';

  for (const [category, data] of Object.entries(humanScaleData.categories)) {
    report += `${category.toUpperCase()} VIOLATIONS:\n`;
    report += `-`.repeat(40) + '\n';
    report += `  Civilian Analog: ${data.civilian_description}\n`;
    report += `  Median Sentence: ${data.civilian_analog.median_sentence_years} years per person\n`;
    report += `  Decision-Makers: ${data.corporate_governance.total_decision_makers} (estimated)\n`;
    report += `  Human-Scale Penalty: ${data.human_scale_penalty.total_custody_years} years\n`;
    report += `  Actual Outcome: $${data.actual_outcome.fine.toLocaleString()} fine, ${data.actual_outcome.custody_years} years custody\n`;
    report += `  Disparity: ${data.disparity.severity.toUpperCase()}\n`;
    report += `\n  ${data.thesis_statement}\n\n`;
  }

  report += `SUMMARY: ${humanScaleData.summary}\n`;

  return report;
}

export default {
  generateCategoryHumanScaleAnalysis,
  attachHumanScaleToInvestigation,
  formatHumanScaleReport
};
