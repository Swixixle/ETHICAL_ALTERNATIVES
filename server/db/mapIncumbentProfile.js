/**
 * Map a relational incumbent_profiles row to the parsed shape expected by normalizeInvestigation().
 * @param {Record<string, unknown>} row
 */
export function relationalRowToParsed(row) {
  const subsidiaries = Array.isArray(row.known_subsidiaries)
    ? row.known_subsidiaries.map(String)
    : [];

  const primary = Array.isArray(row.primary_sources) ? row.primary_sources.map(String) : [];
  const taxSources = [...primary];
  const legalSources = urlsFromJsonbList(row.criminal_cases)
    .concat(urlsFromJsonbList(row.civil_settlements))
    .concat(urlsFromJsonbList(row.regulatory_actions))
    .concat(primary);
  const laborSources = [...new Set([...primary])];
  const envSources = [...new Set([...primary])];
  const polSources = [...new Set([...primary])];

  const fmtMoney = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return '—';
    if (x >= 1e9) return `$${(x / 1e9).toFixed(2)}B`;
    if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`;
    if (x >= 1e3) return `$${(x / 1e3).toFixed(0)}K`;
    return `$${x}`;
  };

  const taxParts = [];
  if (row.effective_tax_rate != null && row.statutory_rate != null) {
    taxParts.push(
      `Effective tax rate ${row.effective_tax_rate}% vs ${row.statutory_rate}% statutory (per filings / analyst summaries — verify).`
    );
  }
  if (Array.isArray(row.offshore_entities) && row.offshore_entities.length) {
    taxParts.push(`Offshore / related entities cited: ${row.offshore_entities.join('; ')}.`);
  }
  if (row.government_subsidies_usd != null) {
    taxParts.push(
      `State & local subsidies (Good Jobs First and similar trackers) on the order of ${fmtMoney(row.government_subsidies_usd)} cumulative.`
    );
  }

  const legalParts = [];
  const legalFlags = [];
  summarizeJsonbCases(row.criminal_cases, legalParts, legalFlags, 'Criminal / FCPA');
  summarizeJsonbCases(row.civil_settlements, legalParts, legalFlags, 'Civil settlement');
  summarizeJsonbCases(row.regulatory_actions, legalParts, legalFlags, 'Regulatory');

  const laborParts = [];
  if (row.osha_violations_5yr != null) {
    laborParts.push(`OSHA violation count (5-year window in profile): ${row.osha_violations_5yr}.`);
  }
  if (row.wage_theft_settlements_usd != null) {
    laborParts.push(`Wage & hour / wage theft settlements (rolled-up figure in profile): ${fmtMoney(row.wage_theft_settlements_usd)}.`);
  }
  if (row.living_wage_certified != null) {
    laborParts.push(`Living wage certification: ${row.living_wage_certified ? 'yes' : 'no'}.`);
  }
  if (row.union_suppression_documented != null) {
    laborParts.push(`Union suppression documented in public record: ${row.union_suppression_documented ? 'yes' : 'no'}.`);
  }

  const envParts = [];
  if (row.epa_enforcement_actions_5yr != null) {
    envParts.push(`EPA formal enforcement actions (5-year window in profile): ${row.epa_enforcement_actions_5yr}.`);
  }

  const polParts = [];
  if (row.lobbying_annual_usd != null && row.lobbying_year != null) {
    polParts.push(
      `Federal lobbying roughly ${fmtMoney(row.lobbying_annual_usd)} in ${row.lobbying_year} (OpenSecrets-style disclosures — verify).`
    );
  }
  if (row.pac_donations_usd != null && row.pac_year != null) {
    polParts.push(`PAC-related contributions on the order of ${fmtMoney(row.pac_donations_usd)} for ${row.pac_year} cycle (verify FEC).`);
  }

  return {
    brand: row.brand_name ? String(row.brand_name) : 'Unknown',
    parent: row.parent_company
      ? String(row.parent_company)
      : row.ultimate_parent
        ? String(row.ultimate_parent)
        : null,
    subsidiaries,
    tax_summary: taxParts.length ? taxParts.join(' ') : null,
    tax_flags: [
      ...(row.offshore_entities?.length ? ['offshore_structure'] : []),
      ...(row.government_subsidies_usd ? ['government_subsidies'] : []),
    ],
    tax_sources: [...new Set(taxSources)].filter(Boolean),

    legal_summary: legalParts.length ? legalParts.join(' ') : null,
    legal_flags: [...new Set(legalFlags)],
    legal_sources: [...new Set(legalSources)].filter(Boolean),

    labor_summary: laborParts.length ? laborParts.join(' ') : null,
    labor_flags: [
      ...(row.union_suppression_documented ? ['union_suppression'] : []),
      ...(Number(row.osha_violations_5yr) > 0 ? ['osha'] : []),
      ...(Number(row.wage_theft_settlements_usd) > 0 ? ['wage_theft'] : []),
    ],
    labor_sources: [...new Set(laborSources)].filter(Boolean),

    environmental_summary: envParts.length ? envParts.join(' ') : null,
    environmental_flags: Number(row.epa_enforcement_actions_5yr) > 0 ? ['epa_enforcement'] : [],
    environmental_sources: [...new Set(envSources)].filter(Boolean),

    political_summary: polParts.length ? polParts.join(' ') : null,
    political_sources: [...new Set(polSources)].filter(Boolean),

    product_health: null,
    product_health_sources: [],

    executive_summary: row.investigation_summary ? String(row.investigation_summary) : null,
    executive_sources: [...new Set(primary)].filter(Boolean),

    overall_concern_level: row.overall_concern_level ? String(row.overall_concern_level) : 'unknown',
    verdict_tags: Array.isArray(row.verdict_tags) ? row.verdict_tags.map(String) : [],
  };
}

function urlsFromJsonbList(j) {
  if (!j) return [];
  const arr = Array.isArray(j) ? j : typeof j === 'string' ? safeJson(j) : null;
  if (!Array.isArray(arr)) return [];
  return arr.flatMap((item) => (item && typeof item === 'object' && item.source_url ? [String(item.source_url)] : []));
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function summarizeJsonbCases(j, parts, flags, label) {
  const arr = Array.isArray(j) ? j : typeof j === 'string' ? safeJson(j) : null;
  if (!Array.isArray(arr)) return;
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const bits = [];
    if (item.case) bits.push(String(item.case));
    if (item.year != null) bits.push(`(${item.year})`);
    if (item.outcome) bits.push(`— ${item.outcome}`);
    if (item.amount != null) bits.push(`— ${item.amount}`);
    if (item.agency) bits.push(`[${item.agency}]`);
    if (item.description) bits.push(String(item.description));
    if (bits.length) parts.push(`${label}: ${bits.join(' ')}`.trim());
    if (item.case && /fcpa|brib|corrupt/i.test(String(item.case))) flags.push('bribery');
    if (item.case && /opioid/i.test(String(item.case))) flags.push('opioid_settlement');
  }
}
