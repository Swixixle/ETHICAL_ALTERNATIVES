/**
 * EPA Adapter for EthicalAlt
 * Uses EPA ECHO (Enforcement & Compliance History Online) API
 */

const EPA_ECHO_BASE = 'https://echodata.epa.gov/echo/echo_rest_services';

export const epaAdapter = {
  name: 'epa',

  async search(companyName, options = {}) {
    // Step 1: Find facilities by name
    const facilities = await this._findFacilities(companyName);

    if (facilities.length === 0) {
      return {
        source: 'epa',
        company: companyName,
        findings: [],
        facilities: [],
        searchedAt: new Date().toISOString(),
        note: 'No EPA-regulated facilities found for this company name',
      };
    }

    // Step 2: Get enforcements for each facility
    const allEnforcements = [];
    for (const facility of facilities.slice(0, 5)) { // Limit to top 5 facilities
      try {
        const enforcements = await this._getEnforcements(facility);
        allEnforcements.push(...enforcements.map(e => ({
          ...e,
          facilityName: facility.name,
          facilityLocation: `${facility.city}, ${facility.state}`,
        })));
      } catch (err) {
        console.warn(`Failed to get enforcements for facility ${facility.id}:`, err.message);
      }
    }

    // Convert to findings
    const findings = this._enforcementsToFindings(allEnforcements, companyName);

    return {
      source: 'epa',
      company: companyName,
      findings,
      facilities: facilities.map(f => ({
        id: f.id,
        name: f.name,
        location: `${f.city}, ${f.state}`,
        programs: f.programs,
      })),
      enforcements: allEnforcements.length,
      searchedAt: new Date().toISOString(),
    };
  },

  async _findFacilities(companyName) {
    // Try exact match first, then partial
    const searchTerms = [
      companyName,
      companyName.replace(/\s+(Inc\.?|Corp\.?|Corporation|LLC|Ltd\.?|Limited)/i, ''),
      companyName.split(' ')[0], // First word for broader match
    ];

    const allFacilities = [];

    for (const term of searchTerms) {
      const params = new URLSearchParams({
        output: 'json',
        p_name: term,
      });

      const response = await fetch(`${EPA_ECHO_BASE}.get_facilities?${params.toString()}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) continue;

      const data = await response.json();
      const facilities = data.Results?.Facilities || [];

      for (const f of facilities) {
        allFacilities.push({
          pgm_sys_id: f.Facilities[0]?.pgm_sys_id,
          name: f.Facilities[0]?.name,
          city: f.Facilities[0]?.city,
          state: f.Facilities[0]?.state,
          programs: f.Facilities[0]?.programs,
        });
      }
    }

    // Deduplicate by facility ID
    const seen = new Set();
    return allFacilities.filter(f => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
  },

  async _getEnforcements(facility) {
    const params = new URLSearchParams({
      output: 'json',
      p_id: facility.id,
    });

    const response = await fetch(`${EPA_ECHO_BASE}.get_enforcements?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`EPA enforcements API error: ${response.status}`);
    }

    const data = await response.json();
    const enforcements = data.Results?.Enforcements || [];

    return enforcements.map(e => ({
      caseNumber: e.caseNumber || e.activity_id,
      activityId: e.activity_id,
      statute: e.statute,
      violationType: e.caseViolationTypes,
      penaltyAmount: e.penaltyAmount ? parseFloat(e.penaltyAmount) : null,
      penaltyStatus: e.penaltyStatus,
      achievementDate: e.achievementDate,
      program: e.programCode,
      description: e.caseActivitySummary || e.caseSynthesisNotes,
    }));
  },

  _enforcementsToFindings(enforcements, companyName) {
    if (enforcements.length === 0) return [];

    const findings = [];

    // Group by facility
    const byFacility = {};
    for (const e of enforcements) {
      if (!byFacility[e.facilityName]) {
        byFacility[e.facilityName] = [];
      }
      byFacility[e.facilityName].push(e);
    }

    // Create findings for each facility with enforcements
    for (const [facilityName, facilityEnforcements] of Object.entries(byFacility)) {
      // Calculate total penalties
      const totalPenalty = facilityEnforcements
        .filter(e => e.penaltyAmount)
        .reduce((sum, e) => sum + e.penaltyAmount, 0);

      // Get date range
      const dates = facilityEnforcements
        .map(e => e.achievementDate ? new Date(e.achievementDate) : null)
        .filter(d => d && !isNaN(d));
      dates.sort((a, b) => a - b);

      findings.push({
        type: 'environmental',
        subtype: 'epa_enforcement',
        summary: `${facilityEnforcements.length} EPA enforcement action(s) at ${facilityName}`,
        facility: facilityName,
        location: facilityEnforcements[0]?.facilityLocation,
        enforcementCount: facilityEnforcements.length,
        totalPenalty: totalPenalty > 0 ? totalPenalty : null,
        statutes: [...new Set(facilityEnforcements.map(e => e.statute).filter(Boolean))],
        dateRange: dates.length > 0 ? {
          earliest: dates[0].toISOString().slice(0, 10),
          latest: dates[dates.length - 1].toISOString().slice(0, 10),
        } : null,
        details: facilityEnforcements.map(e => ({
          caseNumber: e.caseNumber,
          statute: e.statute,
          penalty: e.penaltyAmount,
          date: e.achievementDate,
        })),
        confidence: 'high',
        sourceUrl: 'https://echo.epa.gov/',
      });
    }

    return findings;
  },
};

export default epaAdapter;
