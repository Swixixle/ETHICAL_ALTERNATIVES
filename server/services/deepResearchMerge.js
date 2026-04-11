/**
 * Merge `profile_json.deep_research` into investigation API responses and append live deltas.
 */

/** @type {Record<string, string>} */
export const CATEGORY_LABELS = {
  labor_and_wage: 'labor and wage',
  environmental: 'environmental',
  regulatory_and_legal: 'legal and regulatory',
  product_safety: 'product safety',
  financial_misconduct: 'financial misconduct',
  data_and_privacy: 'data and privacy',
  antitrust_and_market_power: 'antitrust',
  discrimination_and_civil_rights: 'civil rights',
  institutional_enablement: 'institutional enablement',
  executive_and_governance: 'governance',
  supply_chain: 'supply chain',
  subsidies_and_bailouts: 'subsidies and bailouts',
};

/** @type {Record<string, string>} deep_research category key → investigation section key */
export const DR_CATEGORY_TO_SECTION = {
  labor_and_wage: 'labor',
  environmental: 'environmental',
  regulatory_and_legal: 'legal',
  institutional_enablement: 'political',
  supply_chain: 'product_health',
  subsidies_and_bailouts: 'tax',
  antitrust_and_market_power: 'legal',
  financial_misconduct: 'legal',
  data_and_privacy: 'legal',
  discrimination_and_civil_rights: 'labor',
  product_safety: 'product_health',
};

/**
 * @param {unknown} profileJson — incumbent_profiles.profile_json (object or string)
 * @returns {Record<string, unknown> | null}
 */
export function extractDeepResearchFromProfileJson(profileJson) {
  if (profileJson == null) return null;
  let data = profileJson;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;
  const dr = data.deep_research;
  if (!dr || typeof dr !== 'object') return null;
  return /** @type {Record<string, unknown>} */ (dr);
}

/**
 * @param {unknown[] | undefined} a
 * @param {unknown[] | undefined} b
 */
function mergeUniqueStringArrays(a, b) {
  const out = [];
  const seen = new Set();
  for (const list of [a, b]) {
    if (!Array.isArray(list)) continue;
    for (const s of list) {
      const t = String(s || '').trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/** @param {unknown} val */
function parseYearFromDate(val) {
  if (val == null) return null;
  const m = String(val).match(/^(\d{4})/);
  if (m) return parseInt(m[1], 10);
  return null;
}

/**
 * @param {unknown} cat
 */
function categoryTotalFound(cat) {
  if (!cat || typeof cat !== 'object') return 0;
  const rec = /** @type {Record<string, unknown>} */ (cat);
  const tf = rec.total_found;
  if (typeof tf === 'number' && Number.isFinite(tf) && tf >= 0) return Math.floor(tf);
  const inc = Array.isArray(rec.incidents) ? rec.incidents : [];
  return inc.length;
}

/**
 * @param {unknown} cat
 * @returns {number | null}
 */
function earliestYearFromCategory(cat) {
  if (!cat || typeof cat !== 'object') return null;
  const rec = /** @type {Record<string, unknown>} */ (cat);
  let best = null;
  const yr = rec.year_range;
  if (yr && typeof yr === 'object') {
    const e = /** @type {Record<string, unknown>} */ (yr).earliest;
    if (e != null) {
      const y = parseInt(String(e), 10);
      if (Number.isFinite(y)) best = y;
    }
  }
  const incidents = Array.isArray(rec.incidents) ? rec.incidents : [];
  for (const inc of incidents) {
    if (!inc || typeof inc !== 'object') continue;
    const d = /** @type {Record<string, unknown>} */ (inc).date;
    const y = parseYearFromDate(d);
    if (y != null && (best == null || y < best)) best = y;
  }
  return best;
}

/**
 * @param {Record<string, unknown>} deepResearch
 * @param {string} companyName
 */
export function generateSummaryFromDeepResearch(deepResearch, companyName) {
  const perCategory = Array.isArray(deepResearch.per_category) ? deepResearch.per_category : [];
  const findings = perCategory
    .filter((cat) => categoryTotalFound(cat) > 0)
    .map((cat) => {
      if (!cat || typeof cat !== 'object') return null;
      const c = /** @type {Record<string, unknown>} */ (cat);
      const key = typeof c.category === 'string' ? c.category : '';
      const n = categoryTotalFound(cat);
      const label = CATEGORY_LABELS[key] || key || 'category';
      return `${n} documented ${label} action${n > 1 ? 's' : ''}`;
    })
    .filter(Boolean);

  if (findings.length === 0) return null;

  const totalIncidents = perCategory.reduce((sum, cat) => sum + categoryTotalFound(cat), 0);
  const yearCandidates = perCategory
    .map((cat) => earliestYearFromCategory(cat))
    .filter((y) => y != null);
  const earliestYear = yearCandidates.length ? Math.min(...yearCandidates) : null;

  const yearNote = earliestYear != null ? ` going back to ${earliestYear}` : '';

  return `Public records document ${totalIncidents} enforcement actions, settlements, and regulatory findings involving ${companyName}${yearNote}, including ${findings.slice(0, 3).join(', ')}. Sources are linked directly. This is a record of public actions, not a legal finding.`;
}

/** @param {number} totalIncidents */
export function concernLevelFromDeepResearchIncidentCount(totalIncidents) {
  if (totalIncidents <= 0) return 'low';
  if (totalIncidents <= 5) return 'moderate';
  if (totalIncidents <= 15) return 'high';
  return 'critical';
}

/** @param {unknown} outcome */
function outcomeToSeverity(outcome) {
  const o = String(outcome || '').toLowerCase();
  if (o === 'conviction' || o === 'fine') return 'critical';
  if (o === 'settlement' || o === 'consent_decree') return 'significant';
  if (o === 'ongoing') return 'moderate';
  return 'moderate';
}

/**
 * @param {Record<string, unknown>} cat — per_category entry
 */
function buildFindingFromCategory(cat) {
  const incidents = Array.isArray(cat.incidents) ? cat.incidents : [];
  const lines = [];
  for (const inc of incidents) {
    if (!inc || typeof inc !== 'object') continue;
    const date = inc.date != null ? String(inc.date) : '';
    const desc = typeof inc.description === 'string' ? inc.description.trim() : '';
    if (!desc) continue;
    const amt =
      inc.amount_usd != null && Number.isFinite(Number(inc.amount_usd))
        ? ` — $${Number(inc.amount_usd).toLocaleString('en-US')}`
        : '';
    const agency = typeof inc.agency_or_court === 'string' ? ` (${inc.agency_or_court})` : '';
    const out = typeof inc.outcome === 'string' ? inc.outcome : '';
    const url =
      typeof inc.source_url === 'string' && inc.source_url.startsWith('http') ? inc.source_url : '';
    let line = [date, desc, amt, agency].filter(Boolean).join('');
    if (out) line += ` [${out}]`;
    if (url) line += ` ${url}`;
    lines.push(`• ${line}`);
  }
  const parts = [lines.join('\n')];
  if (typeof cat.overflow_note === 'string' && cat.overflow_note.trim()) {
    parts.push(cat.overflow_note.trim());
  }
  const joined = parts.filter(Boolean).join('\n\n');
  return joined || null;
}

/** @param {unknown[]} incidents */
function evidenceGradeFromIncidentCount(incidents) {
  const n = Array.isArray(incidents) ? incidents.length : 0;
  let level = 'limited';
  if (n === 0) level = 'limited';
  else if (n <= 3) level = 'moderate';
  else if (n <= 10) level = 'strong';
  else level = 'established';
  return {
    level,
    source_types: ['regulator', 'court', 'records'],
    note: n > 0 ? `Verified profile: ${n} indexed incident(s).` : null,
  };
}

/** @param {unknown[]} incidents */
function incidentSourceUrls(incidents) {
  if (!Array.isArray(incidents)) return [];
  const out = [];
  for (const inc of incidents) {
    const u = typeof inc?.source_url === 'string' ? inc.source_url.trim() : '';
    if (u.startsWith('http')) out.push(u);
  }
  return out;
}

/**
 * @param {Record<string, unknown>} inv — finalized investigation
 * @param {Record<string, unknown>} dr — deep_research object
 * @param {boolean} healthFlag
 */
export function applyDeepResearchToInvestigation(inv, dr, healthFlag) {
  if (!inv || !dr || !Array.isArray(dr.per_category)) return;

  /** @type {string[]} */
  const execGovBlocks = [];

  /** @type {Map<string, { findings: string[]; sources: string[]; incidents: unknown[] }>} */
  const sectionData = new Map();
  const ensure = (k) => {
    if (!sectionData.has(k)) {
      sectionData.set(k, { findings: [], sources: [], incidents: [] });
    }
    return sectionData.get(k);
  };

  for (const cat of dr.per_category) {
    if (!cat || typeof cat !== 'object' || typeof cat.category !== 'string') continue;
    const catKey = cat.category;
    let sec = DR_CATEGORY_TO_SECTION[catKey];
    if (catKey === 'supply_chain' && !healthFlag) sec = 'labor';
    if (!sec) {
      if (catKey === 'executive_and_governance') {
        const finding = buildFindingFromCategory(/** @type {Record<string, unknown>} */ (cat));
        if (finding) {
          const execHead = 'Operations & governance (indexed record)';
          execGovBlocks.push(`${execHead}:\n${finding}`);
        }
        inv.executive_sources = mergeUniqueStringArrays(
          inv.executive_sources,
          incidentSourceUrls(/** @type {unknown[]} */ ((/** @type {Record<string, unknown>} */ (cat)).incidents))
        );
      }
      continue;
    }
    if (sec === 'product_health' && !healthFlag) continue;

    const bucket = ensure(sec);
    const incidents = Array.isArray((/** @type {Record<string, unknown>} */ (cat)).incidents)
      ? (/** @type {Record<string, unknown>} */ (cat)).incidents
      : [];
    bucket.incidents.push(...incidents);
    bucket.sources.push(...incidentSourceUrls(incidents));
    const f = buildFindingFromCategory(/** @type {Record<string, unknown>} */ (cat));
    if (f) bucket.findings.push(f);
  }

  const politicalBits = [];
  const hasInstitutionalCategory = (dr.per_category || []).some(
    (c) => c && typeof c === 'object' && c.category === 'institutional_enablement'
  );
  if (
    !hasInstitutionalCategory &&
    dr.institutional_enablement &&
    typeof dr.institutional_enablement === 'object'
  ) {
    try {
      const raw = JSON.stringify(dr.institutional_enablement);
      if (raw && raw.length < 6000) politicalBits.push(`Institutional enablement (structured record): ${raw}`);
    } catch {
      /* skip */
    }
  }

  for (const [sec, bucket] of sectionData) {
    const findKey = `${sec}_finding`;
    const srcKey = `${sec}_sources`;
    const gradeKey = `${sec}_evidence_grade`;
    const sumKey = `${sec}_summary`;

    const deepHeader = 'Verified public record (deep research profile)';
    const findingBlock = bucket.findings.filter(Boolean).join('\n\n');
    if (findingBlock) {
      const prev = typeof inv[findKey] === 'string' ? inv[findKey].trim() : '';
      const block = `${deepHeader}:\n${findingBlock}`;
      inv[findKey] = prev ? `${block}\n\n${prev}` : block;
    }

    if (bucket.sources.length) {
      inv[srcKey] = mergeUniqueStringArrays(inv[srcKey], bucket.sources);
    }

    if (bucket.incidents.length > 0) {
      inv[gradeKey] = evidenceGradeFromIncidentCount(bucket.incidents);
    }

    const lowN = bucket.incidents.length;
    if (lowN > 0) {
      const note = `Indexed: ${lowN} incident(s) in this category from regulatory and court sources.`;
      if (typeof inv[sumKey] === 'string' && inv[sumKey].trim()) {
        inv[sumKey] = `${inv[sumKey].trim()}\n\n${note}`;
      } else if (!inv[sumKey]) {
        inv[sumKey] = note;
      }
    }
  }

  if (politicalBits.length) {
    const p = politicalBits.join('\n\n');
    inv.political_finding = inv.political_finding?.trim() ? `${p}\n\n${inv.political_finding}` : p;
    inv.political_summary = inv.political_summary?.trim()
      ? `${p}\n\n${inv.political_summary}`
      : p;
  }

  if (dr.summaries && typeof dr.summaries === 'object') {
    const s = /** @type {Record<string, unknown>} */ (dr.summaries);
    const one = typeof s.one_line === 'string' ? s.one_line.trim() : '';
    if (one && !inv.generated_headline) {
      inv.generated_headline = one.slice(0, 220);
    }
  }

  const timeline = Array.isArray(inv.timeline) ? [...inv.timeline] : [];
  for (const cat of dr.per_category) {
    if (!cat || typeof cat !== 'object') continue;
    const c = /** @type {Record<string, unknown>} */ (cat);
    const incidents = Array.isArray(c.incidents) ? c.incidents : [];
    for (const inc of incidents) {
      if (!inc || typeof inc !== 'object') continue;
      const i = /** @type {Record<string, unknown>} */ (inc);
      const y = parseYearFromDate(i.date);
      if (y == null || !i.description) continue;
      timeline.push({
        year: y,
        month: null,
        event: String(i.description).slice(0, 500),
        category: String(c.category || '').replace(/_/g, ' '),
        severity: outcomeToSeverity(i.outcome),
        source_url: typeof i.source_url === 'string' ? i.source_url : '',
      });
    }
  }
  timeline.sort((a, b) => a.year - b.year || String(a.event).localeCompare(String(b.event)));
  inv.timeline = timeline;

  const totalDeepIncidents = dr.per_category.reduce((sum, cat) => sum + categoryTotalFound(cat), 0);
  inv.overall_concern_level = concernLevelFromDeepResearchIncidentCount(totalDeepIncidents);
  if (totalDeepIncidents > 0) {
    inv.clean_card = false;
  }

  const displayName =
    typeof inv.brand === 'string' && inv.brand.trim() ? inv.brand.trim() : 'This company';
  const generatedExec = generateSummaryFromDeepResearch(dr, displayName);
  if (generatedExec || execGovBlocks.length) {
    let execOut = generatedExec
      ? generatedExec
      : typeof inv.executive_summary === 'string'
        ? inv.executive_summary.trim()
        : '';
    if (execGovBlocks.length) {
      const block = execGovBlocks.join('\n\n');
      execOut = execOut ? `${execOut}\n\n${block}` : block;
    }
    if (execOut) inv.executive_summary = execOut;
  }
}

/**
 * Append live realtime investigation (e.g. last 30 days) without replacing deep research.
 * @param {Record<string, unknown>} base
 * @param {Record<string, unknown>} live
 * @param {boolean} healthFlag
 */
export function mergeLiveInvestigationDelta(base, live, healthFlag) {
  if (!base || !live) return;
  const sections = ['tax', 'legal', 'labor', 'environmental', 'political'];

  for (const s of sections) {
    const sumKey = `${s}_summary`;
    const liveSum = typeof live[sumKey] === 'string' ? live[sumKey].trim() : '';
    if (liveSum && !/^research pending\.?$/i.test(liveSum)) {
      const prefix = 'Recent (last ~30 days)';
      base[sumKey] =
        typeof base[sumKey] === 'string' && base[sumKey].trim()
          ? `${base[sumKey].trim()}\n\n— ${prefix}: ${liveSum}`
          : `${prefix}: ${liveSum}`;
    }
    const findKey = `${s}_finding`;
    const liveFind = typeof live[findKey] === 'string' ? live[findKey].trim() : '';
    if (liveFind) {
      base[findKey] =
        typeof base[findKey] === 'string' && base[findKey].trim()
          ? `${base[findKey].trim()}\n\n${liveFind}`
          : liveFind;
    }
    base[`${s}_sources`] = mergeUniqueStringArrays(base[`${s}_sources`], live[`${s}_sources`]);
    base[`${s}_flags`] = mergeUniqueStringArrays(base[`${s}_flags`], live[`${s}_flags`]);
  }

  if (healthFlag) {
    const ph = typeof live.product_health === 'string' ? live.product_health.trim() : '';
    if (ph && !/^research pending\.?$/i.test(ph)) {
      base.product_health =
        typeof base.product_health === 'string' && base.product_health.trim()
          ? `${base.product_health.trim()}\n\n— Recent: ${ph}`
          : ph;
      base.product_health_sources = mergeUniqueStringArrays(
        base.product_health_sources,
        live.product_health_sources
      );
      const lpf =
        typeof live.product_health_finding === 'string' ? live.product_health_finding.trim() : '';
      if (lpf) {
        base.product_health_finding =
          typeof base.product_health_finding === 'string' && base.product_health_finding.trim()
            ? `${base.product_health_finding.trim()}\n\n${lpf}`
            : lpf;
      }
    }
  }

  const liveExec = typeof live.executive_summary === 'string' ? live.executive_summary.trim() : '';
  if (liveExec && !liveExec.includes('encountered an issue')) {
    base.executive_summary =
      typeof base.executive_summary === 'string' && base.executive_summary.trim()
        ? `${base.executive_summary.trim()}\n\n— Recent overview: ${liveExec}`
        : liveExec;
  }

  base.verdict_tags = mergeUniqueStringArrays(base.verdict_tags, live.verdict_tags);

  const lt = Array.isArray(live.timeline) ? live.timeline : [];
  if (lt.length) {
    const mergedT = [...(Array.isArray(base.timeline) ? base.timeline : []), ...lt];
    mergedT.sort((a, b) => (a.year || 0) - (b.year || 0));
    base.timeline = mergedT;
  }
}
