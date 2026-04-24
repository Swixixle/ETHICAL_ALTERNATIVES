/**
 * Offense Taxonomy Mapper
 * Maps EthicalAlternatives offense categories to USSC offense codes
 * Phase 1: Financial Fraud Vertical (securities fraud, tax evasion)
 * Phase 2: Expand to environmental, labor, consumer protection
 *
 * USSC offense codes are 3-digit numbers found in the Commission Datafiles
 * See: https://www.ussc.gov/research/datafiles/commission-datafiles
 */

/**
 * USSC Primary Offense Codes (FY2024)
 * Extracted from USSC record layout documentation
 */
export const USSC_OFFENSE_CODES = {
  // Securities & Investment Fraud
  '201': {
    description: 'Securities Fraud',
    category: 'financial',
    chapter: '2D1.1',
    severity: 'high',
    typicalVictimLoss: 'Very High'
  },
  '202': {
    description: 'Investment Fraud (Other)',
    category: 'financial',
    chapter: '2B1.1',
    severity: 'high',
    typicalVictimLoss: 'High'
  },
  '203': {
    description: 'Commodities Fraud',
    category: 'financial',
    chapter: '2B1.1',
    severity: 'high',
    typicalVictimLoss: 'High'
  },
  '205': {
    description: 'Insider Trading',
    category: 'financial',
    chapter: '2B1.1',
    severity: 'high',
    typicalVictimLoss: 'Moderate'
  },

  // Tax Offenses
  '240': {
    description: 'Tax Evasion',
    category: 'tax',
    chapter: '2T1.1',
    severity: 'high',
    typicalVictimLoss: 'High'
  },
  '241': {
    description: 'Fraudulent Tax Return Preparation',
    category: 'tax',
    chapter: '2T1.4',
    severity: 'medium',
    typicalVictimLoss: 'Moderate'
  },
  '242': {
    description: 'False Tax Returns',
    category: 'tax',
    chapter: '2T1.4',
    severity: 'medium',
    typicalVictimLoss: 'Moderate'
  },
  '243': {
    description: 'Willful Failure to File Tax Return',
    category: 'tax',
    chapter: '2T1.1',
    severity: 'low',
    typicalVictimLoss: 'Low'
  },
  '244': {
    description: 'Conspiracy to Defraud IRS',
    category: 'tax',
    chapter: '2T1.4',
    severity: 'medium',
    typicalVictimLoss: 'Moderate'
  },

  // Fraud (General) - relevant for financial crimes
  '090': {
    description: 'Theft/Larceny',
    category: 'property',
    chapter: '2B1.1',
    severity: 'medium',
    typicalVictimLoss: 'Variable'
  },
  '091': {
    description: 'Embezzlement (Theft by Bank Officer/Employee)',
    category: 'financial',
    chapter: '2B1.1',
    severity: 'high',
    typicalVictimLoss: 'High'
  },
  '092': {
    description: 'Embezzlement (Other)',
    category: 'financial',
    chapter: '2B1.1',
    severity: 'medium',
    typicalVictimLoss: 'Moderate'
  },
  '093': {
    description: 'Fraud - Credit Card/Bank Card',
    category: 'financial',
    chapter: '2B1.1',
    severity: 'low',
    typicalVictimLoss: 'Low'
  },
  '094': {
    description: 'Fraud - Wire/Radio/TV',
    category: 'financial',
    chapter: '2B1.1',
    severity: 'medium',
    typicalVictimLoss: 'Moderate'
  },
  '095': {
    description: 'Fraud - Mail',
    category: 'financial',
    chapter: '2B1.1',
    severity: 'medium',
    typicalVictimLoss: 'Moderate'
  },
  '096': {
    description: 'Fraud - False Statements',
    category: 'financial',
    chapter: '2B1.1',
    severity: 'low',
    typicalVictimLoss: 'Low'
  },
  '097': {
    description: 'Money Laundering',
    category: 'financial',
    chapter: '2S1.1',
    severity: 'high',
    typicalVictimLoss: 'High'
  },
  '098': {
    description: 'Fraud - Other (Financial Institution)',
    category: 'financial',
    chapter: '2B1.1',
    severity: 'high',
    typicalVictimLoss: 'High'
  },
  '099': {
    description: 'Fraud - Other',
    category: 'financial',
    chapter: '2B1.1',
    severity: 'medium',
    typicalVictimLoss: 'Variable'
  },

  // Banking Offenses
  '320': {
    description: 'Bank Robbery',
    category: 'violent',
    chapter: '2B3.1',
    severity: 'high',
    typicalVictimLoss: 'N/A'
  },
  '321': {
    description: 'Bank Burglary',
    category: 'property',
    chapter: '2B2.1',
    severity: 'medium',
    typicalVictimLoss: 'Variable'
  },
  '322': {
    description: 'Bank Larceny',
    category: 'property',
    chapter: '2B1.1',
    severity: 'medium',
    typicalVictimLoss: 'Variable'
  },

  // Bribery/Corruption (relevant for corporate comparison)
  '180': {
    description: 'Bribery - Public Official',
    category: 'corruption',
    chapter: '2C1.1',
    severity: 'high',
    typicalVictimLoss: 'High'
  },
  '181': {
    description: 'Bribery - Gratuity to Public Official',
    category: 'corruption',
    chapter: '2C1.2',
    severity: 'medium',
    typicalVictimLoss: 'Moderate'
  },
  '182': {
    description: 'Commercial Bribery',
    category: 'corruption',
    chapter: '2B4.1',
    severity: 'medium',
    typicalVictimLoss: 'Moderate'
  },
  '183': {
    description: 'Fraud - Conflict of Interest',
    category: 'corruption',
    chapter: '2C1.3',
    severity: 'medium',
    typicalVictimLoss: 'Moderate'
  },
  '184': {
    description: 'Fraud - Procurement',
    category: 'corruption',
    chapter: '2B1.1',
    severity: 'high',
    typicalVictimLoss: 'High'
  },

  // RICO/Enterprise
  '070': {
    description: 'RICO - Racketer Influenced Corrupt Organizations',
    category: 'enterprise',
    chapter: '2E1.1',
    severity: 'very_high',
    typicalVictimLoss: 'Very High'
  },
  '071': {
    description: 'RICO - Continuing Criminal Enterprise',
    category: 'enterprise',
    chapter: '2E1.1',
    severity: 'very_high',
    typicalVictimLoss: 'Very High'
  },

  // Antitrust (relevant for corporate violations)
  '210': {
    description: 'Antitrust Violations',
    category: 'regulatory',
    chapter: '2R1.1',
    severity: 'medium',
    typicalVictimLoss: 'High'
  },

  // Environmental (Phase 2)
  '490': {
    description: 'Environmental Crimes',
    category: 'environmental',
    chapter: '2Q1.1',
    severity: 'medium',
    typicalVictimLoss: 'N/A'
  },

  // Other placeholder
  '000': {
    description: 'Unknown/Other',
    category: 'other',
    chapter: 'N/A',
    severity: 'unknown',
    typicalVictimLoss: 'Unknown'
  }
};

/**
 * Offense Taxonomy for Corporate Investigation Mapping
 * Maps EthicalAlternatives categories to USSC codes and statutes
 */
export const OFFENSE_TAXONOMY = {
  // Financial Fraud Vertical - Phase 1
  // FY2024 NID format uses OFFGUIDE codes:
  // 16 = Fraud (§2B1.1)
  // 17 = Economic Crimes (§2B1.1, §2T1.1 for tax)
  // 10 = Weapons
  // 2 = Drugs
  securities_fraud: {
    description: 'Securities fraud, market manipulation, investment scams',
    // Old format codes
    usscCodes: ['201', '202', '203', '205'],
    // NID OFFGUIDE codes
    offguideCodes: ['16', '17'],  // Fraud/Economic Crime
    usscChapter: '§2B1.1 (Fraud) / §2S1.1 (Money Laundering)',
    typicalIndividualStatute: '15 U.S.C. § 78j (Securities Exchange Act)',
    corporateEquivalent: 'SEC enforcement actions, DOJ securities fraud prosecutions',
    severity: 'high',
    keywords: [
      'securities', 'fraud', 'investment', 'market manipulation',
      'insider trading', 'pump and dump', ' Ponzi', 'misrepresentation',
      'disclosure', '10b-5', 'SEC', 'stock', 'bond', 'investor'
    ],
    // Offense level enhancements based on loss amount (per USSC guidelines)
    lossThresholds: {
      6500: { increase: 0 },      // $6,500 or less
      15000: { increase: 2 },     // >$6,500
      40000: { increase: 4 },     // >$15,000
      95000: { increase: 6 },     // >$40,000
      150000: { increase: 8 },    // >$95,000
      250000: { increase: 10 },   // >$150,000
      550000: { increase: 12 },   // >$250,000
      1500000: { increase: 14 },  // >$550,000
      3500000: { increase: 16 },  // >$1.5M
      9500000: { increase: 18 },  // >$3.5M
      25000000: { increase: 20 }, // >$9.5M
      65000000: { increase: 22 }, // >$25M
      150000000: { increase: 24 },// >$65M
      250000000: { increase: 26 },// >$150M
      550000000: { increase: 28 } // >$250M
    }
  },

  tax_evasion: {
    description: 'Tax evasion, willful failure to pay, false returns',
    usscCodes: ['240', '241', '242', '243', '244'],
    usscChapter: '§2T1.1 (Tax Evasion) / §2T1.4 (Fraudulent Returns)',
    typicalIndividualStatute: '26 U.S.C. § 7201 (Tax Evasion)',
    corporateEquivalent: 'Corporate tax evasion, transfer pricing violations',
    severity: 'high',
    keywords: [
      'tax', 'evasion', 'IRS', 'fraud', 'return', 'income', 'offshore',
      'shelter', 'avoidance', 'underreporting', 'deduction', 'credit',
      'employment tax', 'payroll', 'withholding'
    ],
    lossThresholds: {
      2500: { increase: 0 },       // $2,500 or less
      6000: { increase: 2 },       // >$2,500
      15000: { increase: 4 },      // >$6,000
      40000: { increase: 6 },      // >$15,000
      100000: { increase: 8 },     // >$40,000
      250000: { increase: 10 },    // >$100,000
      550000: { increase: 12 },    // >$250,000
      1500000: { increase: 14 },  // >$550,000
      3500000: { increase: 16 },   // >$1.5M
      10000000: { increase: 18 }, // >$3.5M
      25000000: { increase: 20 }, // >$10M
      50000000: { increase: 22 }  // >$25M
    }
  },

  wire_fraud: {
    description: 'Wire fraud, electronic fraud schemes',
    usscCodes: ['094', '095'],
    usscChapter: '§2B1.1 (Larceny/Embezzlement/Fraud)',
    typicalIndividualStatute: '18 U.S.C. § 1343 (Wire Fraud)',
    corporateEquivalent: 'Corporate fraud schemes, deceptive practices',
    severity: 'medium',
    keywords: [
      'wire', 'fraud', 'internet', 'email', 'scheme', 'deception',
      'electronic', 'communication', 'interstate commerce'
    ],
    // Uses same loss thresholds as securities fraud (§2B1.1)
    lossThresholds: {
      6500: { increase: 0 },
      15000: { increase: 2 },
      40000: { increase: 4 },
      95000: { increase: 6 },
      150000: { increase: 8 },
      250000: { increase: 10 },
      550000: { increase: 12 },
      1500000: { increase: 14 },
      3500000: { increase: 16 },
      9500000: { increase: 18 },
      25000000: { increase: 20 },
      65000000: { increase: 22 },
      150000000: { increase: 24 },
      250000000: { increase: 26 },
      550000000: { increase: 28 }
    }
  },

  money_laundering: {
    description: 'Money laundering, financial transactions to conceal proceeds',
    usscCodes: ['097'],
    usscChapter: '§2S1.1 (Money Laundering)',
    typicalIndividualStatute: '18 U.S.C. § 1956 (Money Laundering)',
    corporateEquivalent: 'Corporate concealment, beneficial ownership violations',
    severity: 'high',
    keywords: [
      'laundering', 'conceal', 'proceeds', 'transaction', 'structuring',
      'reporting', 'CTR', 'SAR', 'beneficial ownership', 'shell company'
    ],
    lossThresholds: {
      5000: { increase: 0 },
      25000: { increase: 2 },
      50000: { increase: 4 },
      100000: { increase: 6 },
      250000: { increase: 8 },
      500000: { increase: 10 },
      1000000: { increase: 12 },
      2500000: { increase: 14 },
      5000000: { increase: 16 },
      10000000: { increase: 18 },
      25000000: { increase: 20 },
      50000000: { increase: 22 },
      100000000: { increase: 24 },
      200000000: { increase: 26 },
      400000000: { increase: 28 }
    }
  },

  embezzlement: {
    description: 'Theft/embezzlement by fiduciary',
    usscCodes: ['091', '092'],
    usscChapter: '§2B1.1 (Larceny/Embezzlement)',
    typicalIndividualStatute: '18 U.S.C. § 656 (Theft by Bank Officer)',
    corporateEquivalent: 'Corporate asset diversion, executive theft',
    severity: 'high',
    keywords: [
      'embezzlement', 'theft', 'fiduciary', 'misappropriation', 'divert',
      'officer', 'director', 'executive', 'breach', 'trust', 'conversion'
    ],
    // Uses §2B1.1 loss table
    lossThresholds: {
      6500: { increase: 0 },
      15000: { increase: 2 },
      40000: { increase: 4 },
      95000: { increase: 6 },
      150000: { increase: 8 },
      250000: { increase: 10 },
      550000: { increase: 12 },
      1500000: { increase: 14 },
      3500000: { increase: 16 },
      9500000: { increase: 18 },
      25000000: { increase: 20 },
      65000000: { increase: 22 },
      150000000: { increase: 24 },
      250000000: { increase: 26 },
      550000000: { increase: 28 }
    }
  },

  bribery: {
    description: 'Bribery of public officials or commercial bribery',
    usscCodes: ['180', '181', '182', '183'],
    usscChapter: '§2C1.1 (Offering/Receiving Bribe) / §2C1.2 (Gratuity) / §2B4.1 (Commercial)',
    typicalIndividualStatute: '18 U.S.C. § 201 (Bribery of Public Official)',
    corporateEquivalent: 'Foreign Corrupt Practices Act violations, commercial bribery',
    severity: 'high',
    keywords: [
      'bribery', 'bribe', 'kickback', 'gratuity', 'corruption', 'FCPA',
      'foreign', 'official', 'extortion', 'quid pro quo'
    ],
    lossThresholds: {
      5000: { increase: 0 },
      25000: { increase: 2 },
      50000: { increase: 4 },
      100000: { increase: 6 },
      250000: { increase: 8 },
      500000: { increase: 10 },
      1000000: { increase: 12 },
      2500000: { increase: 14 },
      5000000: { increase: 16 },
      10000000: { increase: 18 },
      25000000: { increase: 20 }
    }
  },

  // Phase 2 Offenses (for future expansion)
  environmental_violation: {
    description: 'Environmental crimes - Clean Air/Water Act violations',
    usscCodes: ['490'],
    usscChapter: '§2Q1.1-2.4 (Environmental)',
    typicalIndividualStatute: '42 U.S.C. § 7413 (Clean Air Act)',
    corporateEquivalent: 'Corporate environmental violations, EPA enforcement',
    severity: 'medium',
    keywords: [
      'environment', 'pollution', 'emission', 'discharge', 'hazardous',
      'waste', 'clean air', 'clean water', 'CWA', 'CAA', 'RCRA'
    ],
    // Environmental uses different calculation (not loss-based)
    lossThresholds: {}
  },

  antitrust: {
    description: 'Antitrust violations, price fixing, bid rigging',
    usscCodes: ['210'],
    usscChapter: '§2R1.1 (Antitrust)',
    typicalIndividualStatute: '15 U.S.C. § 1 (Sherman Act)',
    corporateEquivalent: 'Corporate antitrust violations, DOJ Antitrust Division',
    severity: 'medium',
    keywords: [
      'antitrust', 'price fixing', 'bid rigging', 'market allocation',
      'Sherman Act', 'Clayton Act', 'monopoly', 'collusion'
    ],
    // Antitrust uses volume of commerce, not loss
    lossThresholds: {}
  },

  // Generic fraud fallback
  fraud_other: {
    description: 'Other fraud offenses',
    usscCodes: ['098', '099'],
    usscChapter: '§2B1.1 (Fraud)',
    typicalIndividualStatute: '18 U.S.C. § 1341 (Mail Fraud)',
    corporateEquivalent: 'General fraud',
    severity: 'medium',
    keywords: [
      'fraud', 'deception', 'misrepresentation', 'scheme'
    ],
    lossThresholds: {
      6500: { increase: 0 },
      15000: { increase: 2 },
      40000: { increase: 4 },
      95000: { increase: 6 },
      150000: { increase: 8 },
      250000: { increase: 10 },
      550000: { increase: 12 },
      1500000: { increase: 14 },
      3500000: { increase: 16 },
      9500000: { increase: 18 },
      25000000: { increase: 20 }
    }
  }
};

/**
 * Map investigation category to offense taxonomy
 * @param {string} category - EthicalAlternatives category
 * @param {string} violationType - Specific violation description
 * @returns {string|null} - Offense taxonomy key or null
 */
export function mapCategoryToOffense(category, violationType = '') {
  const cat = String(category).toLowerCase().trim();
  const vt = String(violationType).toLowerCase().trim();

  // Category mappings
  const categoryMap = {
    'tax': 'tax_evasion',
    'legal': 'securities_fraud', // Legal often involves securities
    'financial': 'securities_fraud',
    'corruption': 'bribery',
    'environmental': 'environmental_violation'
  };

  // Keyword-based matching on violation type
  if (vt.includes('securities') || vt.includes('investment') || vt.includes('insider')) {
    return 'securities_fraud';
  }
  if (vt.includes('tax') || vt.includes('evasion') || vt.includes('IRS')) {
    return 'tax_evasion';
  }
  if (vt.includes('embezzle') || vt.includes('theft')) {
    return 'embezzlement';
  }
  if (vt.includes('launder') || vt.includes('conceal')) {
    return 'money_laundering';
  }
  if (vt.includes('bribe') || vt.includes('kickback') || vt.includes('FCPA')) {
    return 'bribery';
  }
  if (vt.includes('wire') || vt.includes('internet') || vt.includes('electronic')) {
    return 'wire_fraud';
  }
  if (vt.includes('antitrust') || vt.includes('price fixing') || vt.includes('bid rigging')) {
    return 'antitrust';
  }

  // Fall back to category mapping
  return categoryMap[cat] || null;
}

/**
 * Calculate USSC offense level based on loss amount
 * @param {string} offenseType - Offense taxonomy key
 * @param {number} lossAmount - Amount in dollars
 * @returns {number} - Offense level increase
 */
export function calculateOffenseLevel(offenseType, lossAmount) {
  const taxonomy = OFFENSE_TAXONOMY[offenseType];
  if (!taxonomy || !taxonomy.lossThresholds) return 0;

  const thresholds = Object.entries(taxonomy.lossThresholds)
    .map(([amount, data]) => ({ amount: parseInt(amount), ...data }))
    .sort((a, b) => a.amount - b.amount);

  // Find highest threshold that applies
  let increase = 0;
  for (const threshold of thresholds) {
    if (lossAmount > threshold.amount) {
      increase = threshold.increase;
    } else {
      break;
    }
  }

  return increase;
}

/**
 * Get sentencing guidelines range
 * @param {number} baseLevel - Base offense level
 * @param {number} lossIncrease - Loss-based increase
 * @param {string} criminalHistory - A, B, C, D, E, F
 * @returns {{minMonths: number, maxMonths: number}}
 */
export function getGuidelinesRange(baseLevel, lossIncrease, criminalHistory = 'A') {
  const totalLevel = baseLevel + lossIncrease;

  // Criminal history category multipliers (simplified)
  const chMultipliers = {
    'A': 1.0,  // 0-1 points
    'B': 1.1,  // 2-3 points
    'C': 1.2,  // 4-6 points
    'D': 1.4,  // 7-9 points
    'E': 1.6,  // 10-12 points
    'F': 1.8   // 13+ points
  };

  const multiplier = chMultipliers[criminalHistory] || 1.0;

  // Approximate months from offense level (simplified lookup)
  // Level 1 = 0-6 months, Level 43 = life
  const levelToMonths = {
    1: [0, 6],
    2: [0, 6],
    3: [0, 6],
    4: [0, 6],
    5: [0, 6],
    6: [0, 6],
    7: [0, 6],
    8: [0, 6],
    9: [4, 10],
    10: [6, 12],
    11: [8, 14],
    12: [10, 16],
    13: [12, 18],
    14: [15, 21],
    15: [18, 24],
    16: [21, 27],
    17: [24, 30],
    18: [27, 33],
    19: [30, 37],
    20: [33, 41],
    21: [37, 46],
    22: [41, 51],
    23: [46, 57],
    24: [51, 63],
    25: [57, 71],
    26: [63, 78],
    27: [70, 87],
    28: [78, 97],
    29: [87, 108],
    30: [97, 121],
    31: [108, 135],
    32: [121, 151],
    33: [135, 168],
    34: [151, 188],
    35: [168, 210],
    36: [188, 235],
    37: [210, 262],
    38: [235, 293],
    39: [262, 327],
    40: [292, 365],
    41: [324, 405],
    42: [360, 450],
    43: [470, 470] // Life
  };

  const range = levelToMonths[totalLevel] || levelToMonths[42];
  return {
    minMonths: Math.round(range[0] * multiplier),
    maxMonths: Math.round(range[1] * multiplier)
  };
}

export default {
  USSC_OFFENSE_CODES,
  OFFENSE_TAXONOMY,
  mapCategoryToOffense,
  calculateOffenseLevel,
  getGuidelinesRange
};
