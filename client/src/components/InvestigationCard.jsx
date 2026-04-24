import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  prepareDeepCategoryForDisplay,
  countTier1UniqueMattersAcrossInvestigation,
  dedupeTimelineEvents,
  investigationHasIndexedActiveMatters,
} from '../utils/enforcementDisplay.js';
import Timeline from './Timeline';
import CommunityImpact from './CommunityImpact';
import CostAbsorption from './CostAbsorption.jsx';
import WealthChart from './WealthChart.jsx';
import CompanyCharts from './CompanyCharts.jsx';
import ProofBlock from './ProofBlock.jsx';
import ConfidenceBadge from './ConfidenceBadge.jsx';
import { getConfidenceBadgePresentation } from '../utils/investigationConfidence.js';
import { collectSourceLedgerRows } from '../utils/investigationSources.js';
import { consumerFacingSectionFinding } from '../utils/consumerInvestigationCopy.js';
import {
  TaxIcon,
  LegalIcon,
  LaborIcon,
  EnvironmentIcon,
  PoliticalIcon,
  ExecutivesIcon,
  HealthIcon,
} from './icons/SectionIcons';
import ActiveNowSection from './ActiveNowSection.jsx';
import HumanScaleAnalysis from './HumanScaleAnalysis.jsx';
import InvestigationReceipt from './InvestigationReceipt.jsx';
import { fetchProportionality } from '../lib/fetchProportionality.js';
import { methodologyPageUrl } from '../lib/methodologyUrl.js';
import { profileStructuredExportUrl } from '../lib/profileExportUrl.js';
import { computeIncidentIndexCounts, computeIncidentProvenanceCounts } from '../utils/incidentIndexCounts.js';
import { getSourceAuthorityTier } from '../utils/sourceAuthorityTier.js';
import './InvestigationCard.css';

const PLACEHOLDER_EMPTY_NORM = 'no indexed public material in this category';

/** @param {unknown} summary */
function isSummaryMeaningful(summary) {
  if (summary == null) return false;
  const s = String(summary).trim();
  if (!s) return false;
  if (s.replace(/\.$/, '').toLowerCase() === PLACEHOLDER_EMPTY_NORM) return false;
  return s.length >= 20;
}

const TAG_CATEGORY_MAP = {
  tax_avoidance: 'FINANCIAL',
  offshore_profit_shifting: 'FINANCIAL',
  government_subsidies: 'FINANCIAL',
  accounting_fraud: 'FINANCIAL',
  criminal_charges: 'LEGAL',
  settlements: 'LEGAL',
  antitrust: 'LEGAL',
  bribery: 'LEGAL',
  rico_conviction: 'LEGAL',
  sanctions_violations: 'LEGAL',
  labor_violations: 'LABOR',
  union_suppression: 'LABOR',
  wage_theft: 'LABOR',
  worker_safety: 'LABOR',
  racial_discrimination: 'LABOR',
  environmental_violations: 'ENVIRONMENT',
  pollution: 'ENVIRONMENT',
  greenwashing: 'ENVIRONMENT',
  deforestation_supply_chain: 'ENVIRONMENT',
  political_influence: 'POLITICAL',
  lobbying: 'POLITICAL',
  health_concerns: 'HEALTH',
  product_safety_issues: 'HEALTH',
  child_labor: 'SUPPLY CHAIN',
  forced_labor_risk: 'SUPPLY CHAIN',
};

function groupTags(tags) {
  if (!tags || !Array.isArray(tags)) return {};
  return tags.reduce((acc, tag) => {
    const cat = TAG_CATEGORY_MAP[tag] || 'OTHER';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {});
}

const GRADE_COLORS = {
  established: { bg: 'rgba(106,170,138,0.15)', text: '#6aaa8a', border: '#6aaa8a' },
  strong: { bg: 'rgba(212,160,23,0.1)', text: '#D4A017', border: '#D4A017' },
  moderate: { bg: 'rgba(168,196,216,0.12)', text: '#a8c4d8', border: '#6a8a9a' },
  limited: { bg: 'rgba(106,138,154,0.12)', text: '#6a8a9a', border: '#344d62' },
  alleged: { bg: 'rgba(255,107,107,0.1)', text: '#ff6b6b', border: '#ff6b6b' },
};

/** @param {{ grade: Record<string, unknown> | null | undefined }} props */
function EvidenceBadge({ grade }) {
  if (!grade || typeof grade !== 'object') return null;
  const raw = typeof grade.level === 'string' ? grade.level.toLowerCase() : '';
  if (!raw) return null;
  const colors = GRADE_COLORS[raw] || GRADE_COLORS.limited;
  return (
    <span
      title={typeof grade.note === 'string' ? grade.note : undefined}
      className="investigation-card__evidence-badge"
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'none',
        padding: '2px 8px',
        borderRadius: 999,
        border: 'none',
        background: colors.bg,
        color: colors.text,
        marginLeft: 8,
        flexShrink: 0,
      }}
    >
      {raw.charAt(0).toUpperCase() + raw.slice(1)} evidence
    </span>
  );
}

/** @param {unknown} notable */
function notableMentionsHasContent(notable) {
  if (!notable || typeof notable !== 'object') return false;
  const awards = Array.isArray(notable.awards) ? notable.awards : [];
  const press = Array.isArray(notable.press) ? notable.press : [];
  const knownFor = typeof notable.known_for === 'string' ? notable.known_for.trim() : '';
  return awards.some((a) => String(a).trim()) || press.some((p) => String(p).trim()) || Boolean(knownFor);
}

/** @param {{ notable: Record<string, unknown> }} props */
function NotableMentionsCallout({ notable }) {
  if (!notable || typeof notable !== 'object') return null;
  const awards = Array.isArray(notable.awards) ? notable.awards.map(String).filter(Boolean) : [];
  const press = Array.isArray(notable.press) ? notable.press.map(String).filter(Boolean) : [];
  const knownFor =
    typeof notable.known_for === 'string' && notable.known_for.trim()
      ? notable.known_for.trim()
      : '';
  if (!awards.length && !press.length && !knownFor) return null;

  const lineStyle = {
    fontFamily: "'Crimson Pro', serif",
    fontSize: 14,
    fontStyle: 'italic',
    color: '#a8c4d8',
    lineHeight: 1.65,
    margin: '0 0 8px',
  };

  return (
    <div className="investigation-card__notable">
      <div className="investigation-card__notable-label">Notable</div>
      {knownFor ? <p style={{ ...lineStyle, marginBottom: awards.length || press.length ? 10 : 0 }}>{knownFor}</p> : null}
      {awards.length ? (
        <ul style={{ ...lineStyle, margin: '0 0 8px', paddingLeft: 18, listStyle: 'disc' }}>
          {awards.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : null}
      {press.length ? (
        <ul style={{ ...lineStyle, margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
          {press.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const SECTION_ICONS = {
  tax: TaxIcon,
  legal: LegalIcon,
  labor: LaborIcon,
  environmental: EnvironmentIcon,
  political: PoliticalIcon,
  product_health: HealthIcon,
  executive: ExecutivesIcon,
};

/** Collapsed accordion — monospace text badge colors (Phase 1). */
const EVIDENCE_LEVEL_ROW_BADGE = {
  established: { color: '#4ade80', label: 'CONFIRMED' },
  strong: { color: '#facc15', label: 'STRONG' },
  moderate: { color: '#fb923c', label: 'MODERATE' },
  limited: { color: '#94a3b8', label: 'LIMITED' },
  alleged: { color: '#f87171', label: 'ALLEGED' },
};

/** @param {string} sectionKey */
function sectionKeyToTimelineCategory(sectionKey) {
  const m = {
    tax: 'tax',
    legal: 'legal',
    labor: 'labor',
    environmental: 'environmental',
    political: 'political',
    product_health: 'product',
    executive: 'executive',
  };
  return m[sectionKey] ?? null;
}

/**
 * @param {unknown} timeline
 * @param {string} sectionKey
 */
function getMostRecentTimelineYearForSection(timeline, sectionKey) {
  if (!Array.isArray(timeline)) return null;
  const want = sectionKeyToTimelineCategory(sectionKey);
  if (!want) return null;
  const labelSlug = String(sectionKey).toLowerCase().replace(/_/g, ' ');
  const matching = timeline.filter((e) => {
    if (!e || typeof e !== 'object') return false;
    if (typeof e.category !== 'string') return false;
    const cat = e.category.toLowerCase();
    if (cat === want) return true;
    const ev = typeof e.event === 'string' ? e.event.toLowerCase() : '';
    if (!ev) return false;
    return ev.includes(want) || ev.includes(labelSlug);
  });
  if (!matching.length) return null;
  matching.sort((a, b) => {
    const dy = (Number(b.year) || 0) - (Number(a.year) || 0);
    if (dy !== 0) return dy;
    return (Number(b.month) || 0) - (Number(a.month) || 0);
  });
  const y = matching[0].year;
  return Number.isFinite(Number(y)) ? Number(y) : null;
}

const PROPORTIONALITY_SECTION_KEYS = new Set([
  'tax',
  'legal',
  'labor',
  'environmental',
  'political',
  'product_health',
]);

/** @param {number} n */
function formatUsdRecord(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Deep category key → investigation section accordion key (must match server deepResearchMerge). */
const DR_CATEGORY_TO_SECTION_KEY = {
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

/** @param {string} url */
function sourceDomainFromUrl(url) {
  try {
    const u = new URL(String(url));
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'Source';
  }
}

/** @param {{ url: string | null | undefined }} props */
function SourceAuthorityMark({ url }) {
  const tier = getSourceAuthorityTier(url);
  if (tier === 'primary_press') return null;
  if (tier === 'official') {
    return (
      <span
        className="investigation-card__source-tier investigation-card__source-tier--official"
        title="Government or official primary record"
      >
        GOV
      </span>
    );
  }
  return (
    <span
      className="investigation-card__source-tier investigation-card__source-tier--secondary"
      title="Secondary or contextual source"
    >
      SECONDARY
    </span>
  );
}

/** @param {{ href: string }} props */
function AccordionSectionSourceLink({ href }) {
  const h = String(href || '');
  const label = /^https?:\/\//i.test(h) ? `${sourceDomainFromUrl(h)} \u2197` : h;
  return (
    <span className="investigation-card__source-link-wrap">
      <a href={h} target="_blank" rel="noreferrer" className="investigation-card__inline-source" title={h}>
        {label}
      </a>
      <SourceAuthorityMark url={h} />
    </span>
  );
}

/** @param {string | null | undefined} level */
function concernTierBadgeProps(level) {
  const l = String(level || 'moderate').toLowerCase();
  if (l === 'critical') {
    return {
      label: 'CRITICAL',
      color: '#ff6b6b',
      border: 'rgba(255,107,107,0.5)',
      bg: 'rgba(255,107,107,0.12)',
    };
  }
  if (l === 'high') {
    return {
      label: 'HIGH',
      color: '#f0a820',
      border: 'rgba(240,168,32,0.55)',
      bg: 'rgba(240,168,32,0.14)',
    };
  }
  return {
    label: l.replace(/_/g, ' ').toUpperCase() || 'MODERATE',
    color: '#8a9aac',
    border: 'rgba(138,154,172,0.35)',
    bg: 'rgba(106,138,154,0.12)',
  };
}

/** @param {string | null | undefined} summary */
function extractPublicRecordsLede(summary) {
  if (!summary || typeof summary !== 'string') return null;
  const s = summary.trim();
  const idx = s.indexOf('Public records document');
  if (idx < 0) return null;
  const slice = s.slice(idx);
  const end = slice.search(/\.\s/);
  const sentence = end >= 0 ? slice.slice(0, end + 1) : slice.split('\n')[0]?.split('.')[0] + '.' || slice;
  return sentence.trim() || null;
}

/** @param {unknown} raw */
function normalizeDeepResearchCategories(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.filter((x) => x != null && typeof x === 'object');
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.filter((x) => x != null && typeof x === 'object') : [];
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const vals = Object.values(/** @type {Record<string, unknown>} */ (raw));
    if (vals.length && vals.every((v) => v != null && typeof v === 'object' && !Array.isArray(v))) {
      return vals;
    }
  }
  return [];
}

/** @param {string} dot */
function severityDotColor(dot) {
  if (dot === 'critical') return '#ff6b6b';
  if (dot === 'high') return '#f0a820';
  return '#6a8a9a';
}

/** @param {{ actionType?: string }} props */
function ActionTypeBadge({ actionType }) {
  const t = String(actionType || 'disposition');
  if (t === 'disposition') return null;
  /** @type {Record<string, string>} */
  const labels = {
    regulator_action: 'Regulatory action',
    recall: 'Recall',
    civil_allegation: 'Allegation — unresolved',
    contextual: 'Context',
  };
  const label = labels[t];
  if (!label) return null;
  const safe = t.replace(/_/g, '-').replace(/[^a-z-]/g, '') || 'other';
  return (
    <span className={`investigation-card__action-type-badge investigation-card__action-type-badge--${safe}`}>
      {label}
    </span>
  );
}

/**
 * @param {{
 *   incident: Record<string, unknown>;
 * }} props
 */
function DeepIncidentCard({ incident, variant = 'default' }) {
  const date = typeof incident.date === 'string' ? incident.date : '';
  const desc =
    typeof incident.description === 'string' && incident.description.trim()
      ? incident.description.trim()
      : '—';
  const outcomeRaw = typeof incident.outcome === 'string' ? incident.outcome : '';
  const outcomeLabel = outcomeRaw ? outcomeRaw.replace(/_/g, ' ') : '—';
  const amt =
    incident.amount_usd != null && Number.isFinite(Number(incident.amount_usd))
      ? formatUsdRecord(Number(incident.amount_usd))
      : null;
  const url = typeof incident.source_url === 'string' ? incident.source_url : '';
  const domain = url && /^https?:\/\//i.test(url) ? sourceDomainFromUrl(url) : null;
  const linkLabel = domain ? `${domain} \u2197` : '';
  const agency =
    typeof incident.agency_or_court === 'string' && incident.agency_or_court.trim()
      ? incident.agency_or_court.trim()
      : typeof incident.jurisdiction === 'string' && incident.jurisdiction.trim()
        ? incident.jurisdiction.trim()
        : '';
  const actionType = typeof incident.action_type === 'string' ? incident.action_type : 'disposition';
  const typeMod =
    actionType === 'civil_allegation'
      ? ' investigation-card__incident-card--allegation'
      : actionType === 'regulator_action'
        ? ' investigation-card__incident-card--regulator'
        : actionType === 'recall'
          ? ' investigation-card__incident-card--recall'
          : '';

  const cardClass =
    variant === 'background'
      ? `investigation-card__incident-card investigation-card__incident-card--background${typeMod}`
      : `investigation-card__incident-card${typeMod}`;

  return (
    <div className={cardClass}>
      <div className="investigation-card__incident-card-grid">
        <div className="investigation-card__incident-date">{date || '—'}</div>
        <div className="investigation-card__incident-main">
          <ActionTypeBadge actionType={actionType} />
          {agency ? (
            <div className="investigation-card__incident-jurisdiction">{agency}</div>
          ) : null}
          <p className="investigation-card__incident-desc">{desc}</p>
          <div className="investigation-card__incident-meta">
            {outcomeRaw ? (
              <span className="investigation-card__incident-outcome">{outcomeLabel}</span>
            ) : null}
            {amt ? <span className="investigation-card__incident-amount">{amt}</span> : null}
          </div>
          {domain && url ? (
            <span className="investigation-card__source-link-wrap investigation-card__source-link-wrap--incident">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="investigation-card__incident-source"
              >
                {linkLabel}
              </a>
              <SourceAuthorityMark url={url} />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   group: {
 *     canonical: Record<string, unknown>;
 *     alternates: Record<string, unknown>[];
 *     amountDiscrepancyNote: string | null;
 *   };
 * }} props
 */
function Tier1MatterCard({ group }) {
  const { canonical, alternates, amountDiscrepancyNote } = group;
  return (
    <div className="investigation-card__matter-block">
      <DeepIncidentCard incident={canonical} />
      {amountDiscrepancyNote ? (
        <p className="investigation-card__incident-discrepancy">{amountDiscrepancyNote}</p>
      ) : null}
      {alternates.length > 0 ? (
        <div className="investigation-card__incident-alternates">
          <div className="investigation-card__incident-alternates-label">Also reported at</div>
          <ul className="investigation-card__incident-alternates-list">
            {alternates.map((alt, i) => {
              if (!alt || typeof alt !== 'object') return null;
              const u = typeof alt.source_url === 'string' ? alt.source_url : '';
              const dom = u && /^https?:\/\//i.test(u) ? sourceDomainFromUrl(u) : 'Source';
              return (
                <li key={`${u}-${i}`}>
                  {u ? (
                    <span className="investigation-card__source-link-wrap investigation-card__source-link-wrap--incident">
                      <a href={u} target="_blank" rel="noopener noreferrer" className="investigation-card__incident-source">
                        {dom}
                        {'\u2197'}
                      </a>
                      <SourceAuthorityMark url={u} />
                    </span>
                  ) : (
                    <span className="investigation-card__body-muted">{dom}</span>
                  )}
                  {alt.amount_usd != null && Number.isFinite(Number(alt.amount_usd)) ? (
                    <span className="investigation-card__incident-alt-amt">
                      {' '}
                      · {formatUsdRecord(Number(alt.amount_usd))}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
function InterpretiveAnalysisSilo({ children }) {
  const arr = Array.isArray(children) ? children : [children];
  const visible = arr.some((c) => c != null && c !== false);
  if (!visible) return null;
  return (
    <div className="investigation-card__interpretive-silo">
      <p className="investigation-card__interpretive-kicker">Analysis — not a finding</p>
      <div className="investigation-card__interpretive-inner">{children}</div>
    </div>
  );
}

/** @param {{ text: string; url?: string | null }} props */
function ProportionalitySourceLine({ text, url }) {
  const body =
    url && /^https?:\/\//i.test(url) ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="investigation-card__legal-context-source-link"
      >
        {text}
      </a>
    ) : (
      text
    );
  return (
    <p className="investigation-card__legal-context-source investigation-card__legal-context-source--with-tier">
      {body}
      {url && /^https?:\/\//i.test(url) ? <SourceAuthorityMark url={url} /> : null}
    </p>
  );
}

/** @param {unknown} chargeStatus */
function shouldPrefixFacilityBlock(chargeStatus) {
  const s = String(chargeStatus || '').toLowerCase();
  return s.includes('credibly alleged') || s.includes('under investigation');
}

/**
 * @param {{
 *   sectionKey: string;
 *   investigation: Record<string, unknown>;
 *   clientPacket: Record<string, unknown> | null | undefined;
 *   onClientPacket: (p: Record<string, unknown>) => void;
 *   geoDismissed: boolean;
 *   onGeoDismiss: () => void;
 * }} props
 */
function ProportionalityLegalContextBlock({
  sectionKey,
  investigation,
  clientPacket,
  onClientPacket,
  geoDismissed,
  onGeoDismiss,
}) {
  const serverPacket = investigation[`${sectionKey}_proportionality_packet`];
  const packet =
    clientPacket && typeof clientPacket === 'object'
      ? clientPacket
      : serverPacket && typeof serverPacket === 'object'
        ? serverPacket
        : null;
  if (!packet) return null;

  const coords = investigation.investigation_coordinates;
  const hasServerCoords =
    coords &&
    typeof coords === 'object' &&
    Number.isFinite(Number(coords.lat)) &&
    Number.isFinite(Number(coords.lng));

  const statutes = Array.isArray(packet.applicable_statutes) ? packet.applicable_statutes : [];
  const sc =
    packet.sentencing_context && typeof packet.sentencing_context === 'object'
      ? packet.sentencing_context
      : null;
  const amountComp =
    packet.amount_comparison && typeof packet.amount_comparison === 'object'
      ? packet.amount_comparison
      : null;
  const facility =
    packet.facility_context && typeof packet.facility_context === 'object'
      ? packet.facility_context
      : null;

  const showStatutes = statutes.length > 0;
  const showSentencing = Boolean(sc);
  const showAmount =
    amountComp &&
    amountComp.median_amount_involved != null &&
    Number.isFinite(Number(amountComp.median_amount_involved));
  const showFacility = Boolean(facility);
  const showGeoPrompt =
    !showFacility &&
    !hasServerCoords &&
    !geoDismissed &&
    typeof navigator !== 'undefined' &&
    'geolocation' in navigator;

  if (!showStatutes && !showSentencing && !showAmount && !showFacility && !showGeoPrompt) return null;

  const chargeStatus = packet.charge_status ?? investigation[`${sectionKey}_charge_status`];

  const requestGeo = () => {
    if (!navigator.geolocation) {
      onGeoDismiss();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const vt =
          typeof packet.violation_type === 'string'
            ? packet.violation_type
            : String(investigation[`${sectionKey}_violation_type`] || '');
        const cs = chargeStatus != null ? String(chargeStatus) : '';
        const amtRaw =
          amountComp && amountComp.amount_involved != null
            ? amountComp.amount_involved
            : investigation[`${sectionKey}_amount_involved`];
        const next = await fetchProportionality({
          category: sectionKey,
          violationType: vt,
          chargeStatus: cs || undefined,
          amountInvolved: amtRaw != null ? Number(amtRaw) : undefined,
          lat,
          lng,
        });
        if (next && typeof next === 'object') onClientPacket(next);
      },
      () => {
        onGeoDismiss();
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 }
    );
  };

  const bopHref =
    facility && typeof facility.source_url === 'string' && facility.source_url.startsWith('http')
      ? facility.source_url
      : 'https://www.bop.gov/';

  return (
    <div className="investigation-card__legal-context investigation-card__body">
      <div className="investigation-card__legal-context-title">LEGAL CONTEXT</div>
      {showStatutes ? (
        <div className="investigation-card__legal-context-sub">
          <div className="investigation-card__legal-context-divider" aria-hidden />
          <div className="investigation-card__legal-context-heading">APPLICABLE LAW</div>
          {statutes.map((row, i) => (
            <div key={`${row.code}-${i}`} className="investigation-card__legal-context-statute">
              <div>
                {row.code} — {row.description}
              </div>
              <div>Max term: {row.max_penalty_years} years</div>
              {row.citation_url ? (
                <ProportionalitySourceLine text={String(row.citation_url)} url={String(row.citation_url)} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {showSentencing && sc ? (
        <div className="investigation-card__legal-context-sub">
          <div className="investigation-card__legal-context-divider" aria-hidden />
          <div className="investigation-card__legal-context-heading">SENTENCE COMPARISON</div>
          <div>Comparison offense: {String(sc.comparison_offense)}</div>
          <div>Median sentence (comparable federal cases): {String(sc.median_sentence_months)} months</div>
          <div>Total sentenced (2023, comparable): {String(sc.total_sentenced_2023)}</div>
          <ProportionalitySourceLine text={String(sc.source)} url={sc.source_url ? String(sc.source_url) : null} />
        </div>
      ) : null}
      {showAmount && amountComp ? (
        <div className="investigation-card__legal-context-sub">
          <div className="investigation-card__legal-context-divider" aria-hidden />
          <div className="investigation-card__legal-context-heading">AMOUNT IN RECORD</div>
          <div>Amount involved: {formatUsdRecord(Number(amountComp.amount_involved))}</div>
          <div>Median amount in comparable federal cases: {formatUsdRecord(Number(amountComp.median_amount_involved))}</div>
          <div>≈ {String(amountComp.multiple_of_median)}x the median</div>
          {sc ? (
            <ProportionalitySourceLine text={String(sc.source)} url={sc.source_url ? String(sc.source_url) : null} />
          ) : null}
        </div>
      ) : null}
      {showGeoPrompt ? (
        <div className="investigation-card__legal-context-sub">
          <div className="investigation-card__legal-context-divider" aria-hidden />
          <button type="button" className="investigation-card__legal-context-geo-prompt" onClick={requestGeo}>
            Show nearest federal facility — uses your location, nothing stored
          </button>
        </div>
      ) : null}
      {showFacility && facility ? (
        <div className="investigation-card__legal-context-sub">
          <div className="investigation-card__legal-context-divider" aria-hidden />
          <div className="investigation-card__legal-context-heading">NEAREST FEDERAL FACILITY</div>
          {shouldPrefixFacilityBlock(chargeStatus) ? (
            <p className="investigation-card__legal-context-charge-prefix investigation-card__body-muted">
              No criminal charge established — context only
            </p>
          ) : null}
          <div>
            {String(facility.facility_name)} · {String(facility.distance_miles)} miles
          </div>
          <div>Security level: {String(facility.security_level)}</div>
          {facility.population_total != null && Number.isFinite(Number(facility.population_total)) ? (
            <div>Population: {String(facility.population_total)}</div>
          ) : null}
          <p className="investigation-card__legal-context-bop-line">
            <a href={bopHref} target="_blank" rel="noreferrer" className="investigation-card__legal-context-bop-link">
              Bureau of Prisons ↗
            </a>
          </p>
          {typeof facility.source_url === 'string' && facility.source_url.startsWith('http') ? (
            <ProportionalitySourceLine text={facility.source_url} url={facility.source_url} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const SECTIONS = [
  {
    key: 'tax',
    title: 'TAX',
    summaryKey: 'tax_summary',
    flagsKey: 'tax_flags',
    sourcesKey: 'tax_sources',
    evidenceGradeKey: 'tax_evidence_grade',
    findingKey: 'tax_finding',
  },
  {
    key: 'legal',
    title: 'LEGAL',
    summaryKey: 'legal_summary',
    flagsKey: 'legal_flags',
    sourcesKey: 'legal_sources',
    evidenceGradeKey: 'legal_evidence_grade',
    findingKey: 'legal_finding',
  },
  {
    key: 'labor',
    title: 'LABOR',
    summaryKey: 'labor_summary',
    flagsKey: 'labor_flags',
    sourcesKey: 'labor_sources',
    evidenceGradeKey: 'labor_evidence_grade',
    findingKey: 'labor_finding',
  },
  {
    key: 'environmental',
    title: 'ENVIRONMENTAL',
    summaryKey: 'environmental_summary',
    flagsKey: 'environmental_flags',
    sourcesKey: 'environmental_sources',
    evidenceGradeKey: 'environmental_evidence_grade',
    findingKey: 'environmental_finding',
  },
  {
    key: 'political',
    title: 'POLITICAL',
    summaryKey: 'political_summary',
    flagsKey: null,
    sourcesKey: 'political_sources',
    evidenceGradeKey: 'political_evidence_grade',
    findingKey: 'political_finding',
  },
  {
    key: 'product_health',
    title: 'PRODUCT HEALTH',
    summaryKey: 'product_health',
    flagsKey: null,
    sourcesKey: 'product_health_sources',
    evidenceGradeKey: 'product_health_evidence_grade',
    findingKey: 'product_health_finding',
  },
  {
    key: 'executive',
    title: 'EXECUTIVES',
    summaryKey: 'executive_summary',
    flagsKey: null,
    sourcesKey: 'executive_sources',
    evidenceGradeKey: null,
    findingKey: null,
  },
];

/** @param {{ label: string }} props */
function AltGridCard({ label }) {
  const text = String(label);
  const short = text.length > 90 ? `${text.slice(0, 87).trim()}…` : text;
  return (
    <div className="investigation-card__alt-grid-card">
      <div className="investigation-card__alt-grid-title">{short}</div>
      <div className="investigation-card__alt-grid-meta">Local</div>
      <button type="button" className="investigation-card__alt-grid-cta">
        Visit ›
      </button>
    </div>
  );
}

/** @param {{ cheaper: string[]; healthier: string[]; diy: string[] }} props */
function AlternativesGrid({ cheaper, healthier, diy }) {
  const [tab, setTab] = useState(/** @type {'cheaper'|'healthier'|'diy'} */ ('cheaper'));
  const list =
    tab === 'cheaper' ? cheaper : tab === 'healthier' ? healthier : diy;
  return (
    <div className="investigation-card__alternatives-wrap">
      <div className="investigation-card__alt-tabs" role="tablist">
        {(
          [
            { id: 'cheaper', label: 'Cheaper' },
            { id: 'healthier', label: 'Healthier' },
            { id: 'diy', label: 'DIY' },
          ]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`investigation-card__alt-tab${tab === t.id ? ' investigation-card__alt-tab--active' : ''}`}
            onClick={() => setTab(/** @type {'cheaper'|'healthier'|'diy'} */ (t.id))}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        className="investigation-card__alt-grid investigation-card__alt-grid--animate"
        key={tab}
        role="tabpanel"
      >
        {list.length
          ? list.map((line, i) => <AltGridCard key={`${tab}-${i}`} label={String(line)} />)
          : (
            <p className="investigation-card__body-muted investigation-card__alt-grid-empty">
              No entries in this category.
            </p>
          )}
      </div>
    </div>
  );
}

/** @param {{ investigation: Record<string, unknown>; result?: Record<string, unknown> | null }} props */
function SourcesLedger({ investigation, result }) {
  const rows = useMemo(
    () => collectSourceLedgerRows(investigation, result || null),
    [investigation, result]
  );
  const ts =
    typeof investigation.last_updated === 'string' && investigation.last_updated.trim()
      ? investigation.last_updated.trim()
      : 'Indexed';

  if (!rows.length) return null;

  return (
    <div className="investigation-card__sources-ledger">
      <div className="investigation-card__sources-ledger-label">Sources</div>
      <ul className="investigation-card__sources-ledger-list">
        {rows.map((row) => (
          <li key={row.url} className="investigation-card__sources-ledger-row">
            <a href={row.url} target="_blank" rel="noreferrer" className="investigation-card__sources-ledger-link">
              <span className="investigation-card__sources-ledger-name">{row.name}</span>
              <span className="investigation-card__sources-ledger-url">{row.url}</span>
              <span className="investigation-card__sources-ledger-ts">{ts}</span>
              <span className="investigation-card__sources-ledger-chev" aria-hidden>
                ›
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Compact empty state — Instruction 3
 * @param {{ onRunLiveInvestigation?: () => void }} props
 */
export function NoRecordCompactModule({ onRunLiveInvestigation }) {
  return (
    <div className="investigation-card__no-record-module">
      <div className="investigation-card__no-record-copy">No public record indexed for this brand yet</div>
      <div className="investigation-card__no-record-pills">
        {['Tax', 'Legal', 'Labor', 'Environmental', 'Political'].map((cat) => (
          <span key={cat} className="investigation-card__no-record-pill">
            {cat}
          </span>
        ))}
      </div>
      <button type="button" className="investigation-card__no-record-cta" onClick={() => onRunLiveInvestigation?.()}>
        Run live investigation
      </button>
    </div>
  );
}

function confidenceLabelFromId(c) {
  const n = Number(c);
  if (!Number.isFinite(n)) return 'Low — verify';
  if (n >= 0.85) return 'High confidence';
  if (n >= 0.6) return 'Medium — verify if unsure';
  return 'Low — verify';
}

/**
 * @param {{
 *   investigation: Record<string, unknown> | null;
 *   identification?: Record<string, unknown> | null;
 *   result?: Record<string, unknown> | null;
 *   recordPresentation?: Record<string, unknown> | null;
 *   headline?: string | null;
 *   onShare?: () => void;
 *   onRunLiveInvestigation?: () => void;
 *   showNoRecordModule?: boolean;
 *   onWrongBrand?: () => void;
 *   onReportError?: () => void;
 *   userCaptureSrc?: string | null;
 *   referenceImageSrc?: string | null;
 *   tapPositionNormalized?: { x: number; y: number } | null;
 *   onFindAlternatives?: () => void;
 * }} props
 */
export default function InvestigationCard({
  investigation,
  identification = null,
  result = null,
  recordPresentation = null,
  headline: headlineProp = null,
  onShare,
  onRunLiveInvestigation,
  showNoRecordModule = false,
  onWrongBrand,
  onReportError,
  userCaptureSrc = null,
  referenceImageSrc = null,
  tapPositionNormalized = null,
  onFindAlternatives,
}) {
  const [openSection, setOpenSection] = useState(/** @type {string | null} */ (null));
  const [proportionalityClientPacket, setProportionalityClientPacket] = useState(
    /** @type {Record<string, Record<string, unknown>>} */ ({})
  );
  const [proportionalityGeoDismissed, setProportionalityGeoDismissed] = useState(
    /** @type {Record<string, boolean>} */ ({})
  );
  const verdictRef = useRef(null);

  const profileType = investigation ? String(investigation.profile_type || '') : '';

  const confPresent = getConfidenceBadgePresentation(investigation, identification, result);

  if (showNoRecordModule && !investigation) {
    return (
      <section className="investigation-card investigation-card--bento">
        <NoRecordCompactModule onRunLiveInvestigation={onRunLiveInvestigation} />
      </section>
    );
  }

  if (!investigation) return null;

  const verdictTags = Array.isArray(investigation.verdict_tags) ? investigation.verdict_tags.map(String) : [];
  const concernFlags = Array.isArray(investigation.concern_flags) ? investigation.concern_flags.map(String) : [];
  const uniqueTags = [...new Set([...verdictTags, ...concernFlags])];
  const grouped = groupTags(uniqueTags);
  const flatVerdictPills = uniqueTags.slice(0, 14);

  const notableRaw = investigation.notable_mentions;
  const showNotable =
    profileType === 'realtime_search' && notableMentionsHasContent(notableRaw);

  const execSummary =
    typeof investigation.executive_summary === 'string' && investigation.executive_summary.trim()
      ? investigation.executive_summary.trim()
      : typeof investigation.investigation_summary === 'string' && investigation.investigation_summary.trim()
        ? investigation.investigation_summary.trim()
        : '';

  const dataSource = typeof investigation.data_source === 'string' ? investigation.data_source : '';
  const heroLede = extractPublicRecordsLede(execSummary);
  const useDeepPublicRecordHero =
    dataSource === 'deep_research+live' &&
    typeof execSummary === 'string' &&
    execSummary.startsWith('Public records document') &&
    Boolean(heroLede);

  const liveHeadline =
    (headlineProp && String(headlineProp).trim()) ||
    (typeof investigation.generated_headline === 'string' && investigation.generated_headline.trim()
      ? investigation.generated_headline.trim()
      : '');

  const primaryHeroTitle = useDeepPublicRecordHero ? heroLede : liveHeadline || 'Investigation';

  const showLatestSubhead =
    useDeepPublicRecordHero &&
    Boolean(liveHeadline) &&
    liveHeadline.trim() !== String(primaryHeroTitle).trim();

  const execSummaryAfterLede =
    useDeepPublicRecordHero && heroLede && execSummary.startsWith(heroLede)
      ? execSummary.slice(heroLede.length).trim().replace(/^[\s\n—\-]+/, '')
      : '';

  const id = identification || {};

  const hasDeepResearchCategories =
    normalizeDeepResearchCategories(investigation.deep_research_categories).length > 0;

  const sectionItems = [];

  for (const s of SECTIONS) {
    const summary = investigation[s.summaryKey];
    const fl = s.flagsKey ? investigation[s.flagsKey] : null;
    const sources = investigation[s.sourcesKey];
    const hasSummary = isSummaryMeaningful(summary);
    const hasFlags = Array.isArray(fl) && fl.length > 0;
    const hasSources = Array.isArray(sources) && sources.length > 0;
    const proportionalityPacketKey = `${s.key}_proportionality_packet`;
    const rawPacket = PROPORTIONALITY_SECTION_KEYS.has(s.key) ? investigation[proportionalityPacketKey] : null;
    const hasProportionality = rawPacket != null && typeof rawPacket === 'object';
    const findingKey = s.findingKey;
    const findingRaw = findingKey ? investigation[findingKey] : null;
    const findingText = consumerFacingSectionFinding(findingRaw, hasDeepResearchCategories);
    const hasContent =
      hasSummary || hasFlags || hasSources || hasProportionality || Boolean(findingText);

    const Icon = SECTION_ICONS[s.key];
    const evGrade =
      s.evidenceGradeKey && investigation[s.evidenceGradeKey] ? investigation[s.evidenceGradeKey] : null;
    const levelRaw =
      evGrade && typeof evGrade === 'object' && typeof evGrade.level === 'string'
        ? evGrade.level.toLowerCase()
        : '';
    const rowBadge = EVIDENCE_LEVEL_ROW_BADGE[levelRaw] || null;
    const hasEvidenceGradeLevel = Boolean(rowBadge);
    const isCollapsedEmpty =
      !hasSummary &&
      !hasSources &&
      !hasEvidenceGradeLevel &&
      !hasProportionality &&
      !findingText;
    const timelineYear = getMostRecentTimelineYearForSection(investigation.timeline, s.key);

    const findingBorderColor = rowBadge ? rowBadge.color : '#d4a017';

    sectionItems.push({
      key: s.key,
      title: s.title,
      accent: 'confirmed',
      Icon,
      evGrade,
      rowPhase1: {
        isCollapsedEmpty,
        badge: rowBadge,
        sourceCount: hasSources ? sources.length : 0,
        timelineYear,
      },
      hasContent,
      body: hasContent ? (
        <>
          {findingText ? (
            <p
              className="investigation-card__section-finding investigation-card__body"
              style={{ borderLeftColor: findingBorderColor }}
            >
              {findingText}
            </p>
          ) : null}
          {PROPORTIONALITY_SECTION_KEYS.has(s.key) ? (
            <ProportionalityLegalContextBlock
              sectionKey={s.key}
              investigation={investigation}
              clientPacket={proportionalityClientPacket[s.key]}
              onClientPacket={(p) =>
                setProportionalityClientPacket((prev) => ({ ...prev, [s.key]: p }))
              }
              geoDismissed={!!proportionalityGeoDismissed[s.key]}
              onGeoDismiss={() =>
                setProportionalityGeoDismissed((prev) => ({ ...prev, [s.key]: true }))
              }
            />
          ) : null}
          {hasSummary ? (
            <p className="investigation-card__section-summary investigation-card__body">{String(summary)}</p>
          ) : null}
          {hasFlags ? (
            <ul className="investigation-card__list investigation-card__body">
              {fl.map((item) => (
                <li key={String(item)}>{String(item).replace(/_/g, ' ')}</li>
              ))}
            </ul>
          ) : null}
          {hasSources ? (
            <ul className="investigation-card__sources-inline">
              {sources.map((url) => {
                const href = String(url);
                return (
                  <li key={href}>
                    <AccordionSectionSourceLink href={href} />
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : (
        <span className="investigation-card__empty-chip">No public filing found</span>
      ),
    });
  }

  const connections = investigation.connections;
  if (connections && typeof connections === 'object') {
    const cSummary = typeof connections.summary === 'string' ? connections.summary.trim() : '';
    const cFlags = Array.isArray(connections.flags) ? connections.flags : [];
    const cSources = Array.isArray(connections.sources) ? connections.sources : [];
    const hasContent = Boolean(cSummary || cFlags.length || cSources.length);
    sectionItems.push({
      key: 'connections',
      title: 'CONNECTIONS',
      accent: 'confirmed',
      Icon: PoliticalIcon,
      evGrade: null,
      hasContent,
      body: hasContent ? (
        <>
          {cSummary ? <p className="investigation-card__section-summary investigation-card__body">{cSummary}</p> : null}
          {cFlags.length ? (
            <ul className="investigation-card__list investigation-card__body">
              {cFlags.map((item) => (
                <li key={String(item)}>{String(item).replace(/_/g, ' ')}</li>
              ))}
            </ul>
          ) : null}
          {cSources.length ? (
            <ul className="investigation-card__sources-inline">
              {cSources.map((url) => (
                <li key={String(url)}>
                  <AccordionSectionSourceLink href={String(url)} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <span className="investigation-card__empty-chip">No public filing found</span>
      ),
    });
  }

  const allegations = investigation.allegations;
  if (allegations && typeof allegations === 'object') {
    const aSummary = typeof allegations.summary === 'string' ? allegations.summary.trim() : '';
    const aDisclaimer =
      typeof allegations.disclaimer === 'string' && allegations.disclaimer.trim()
        ? allegations.disclaimer.trim()
        : 'The following are allegations and unproven claims. They are documented in credible sources but have not been adjudicated.';
    const aFlags = Array.isArray(allegations.flags) ? allegations.flags : [];
    const aSources = Array.isArray(allegations.sources) ? allegations.sources : [];
    const hasContent = Boolean(aSummary || aFlags.length || aSources.length);
    sectionItems.push({
      key: 'allegations',
      title: 'ALLEGATIONS',
      accent: 'allegation',
      Icon: LegalIcon,
      evGrade: null,
      hasContent,
      body: hasContent ? (
        <>
          <p className="investigation-card__allegations-disclaimer investigation-card__body">{aDisclaimer}</p>
          {aSummary ? <p className="investigation-card__section-summary investigation-card__body">{aSummary}</p> : null}
          {aFlags.length ? (
            <ul className="investigation-card__list investigation-card__body">
              {aFlags.map((item) => (
                <li key={String(item)}>{String(item).replace(/_/g, ' ')}</li>
              ))}
            </ul>
          ) : null}
          {aSources.length ? (
            <ul className="investigation-card__sources-inline">
              {aSources.map((url) => (
                <li key={String(url)}>
                  <AccordionSectionSourceLink href={String(url)} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <span className="investigation-card__empty-chip">No public filing found</span>
      ),
    });
  }

  const HEALTH_SEVERITY_META = {
    minimal: { border: '#6aaa8a', accent: '#6aaa8a' },
    low: { border: '#7ab892', accent: '#7ab892' },
    moderate: { border: '#e8b84a', accent: '#e8b84a' },
    high: { border: '#e07040', accent: '#e07040' },
    critical: { border: '#c0302a', accent: '#ff6b6b' },
  };

  const healthRecord = investigation.health_record;
  if (healthRecord && typeof healthRecord === 'object') {
    const hSummary = typeof healthRecord.summary === 'string' ? healthRecord.summary.trim() : '';
    const hFlags = Array.isArray(healthRecord.flags) ? healthRecord.flags : [];
    const hSources = Array.isArray(healthRecord.sources) ? healthRecord.sources : [];
    const hStudies = Array.isArray(healthRecord.studies) ? healthRecord.studies : [];
    const sevRaw =
      typeof healthRecord.severity === 'string' ? healthRecord.severity.trim().toLowerCase() : 'moderate';
    const sev = HEALTH_SEVERITY_META[sevRaw] ? sevRaw : 'moderate';
    const sevStyle = HEALTH_SEVERITY_META[sev];
    const hasContent = Boolean(hSummary || hFlags.length || hSources.length || hStudies.length);
    sectionItems.push({
      key: 'health_record',
      title: 'HEALTH RECORD',
      accent: 'confirmed',
      Icon: HealthIcon,
      evGrade: null,
      severityStyle: sevStyle,
      severityLabel: sev,
      hasContent,
      body: hasContent ? (
        <>
          {hSummary ? <p className="investigation-card__section-summary investigation-card__body">{hSummary}</p> : null}
          {hStudies.length ? (
            <div className="investigation-card__studies">
              <div className="investigation-card__studies-label">Research & studies</div>
              <ul className="investigation-card__list investigation-card__body">
                {hStudies.map((st, i) => {
                  const title = st && typeof st === 'object' && st.title ? String(st.title) : '';
                  const url = st && typeof st === 'object' && st.url ? String(st.url) : '';
                  if (!url && !title) return null;
                  return (
                    <li key={`${url}-${i}`}>
                      {url ? (
                        <span className="investigation-card__source-link-wrap">
                          <a href={url} target="_blank" rel="noreferrer" className="investigation-card__study-link">
                            {title || sourceDomainFromUrl(url)}
                          </a>
                          <SourceAuthorityMark url={url} />
                        </span>
                      ) : (
                        title
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {hFlags.length ? (
            <ul className="investigation-card__list investigation-card__body">
              {hFlags.map((item) => (
                <li key={String(item)}>{String(item).replace(/_/g, ' ')}</li>
              ))}
            </ul>
          ) : null}
          {hSources.length ? (
            <ul className="investigation-card__sources-inline">
              {hSources.map((url) => (
                <li key={String(url)}>
                  <AccordionSectionSourceLink href={String(url)} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <span className="investigation-card__empty-chip">No public filing found</span>
      ),
    });
  }

  const alternatives = investigation.alternatives;
  if (alternatives && typeof alternatives === 'object') {
    const cheaper = Array.isArray(alternatives.cheaper) ? alternatives.cheaper : [];
    const healthier = Array.isArray(alternatives.healthier) ? alternatives.healthier : [];
    const diy = Array.isArray(alternatives.diy) ? alternatives.diy : [];
    if (cheaper.length || healthier.length || diy.length) {
      sectionItems.push({
        key: 'alternatives',
        title: 'ALTERNATIVES',
        accent: 'confirmed',
        Icon: EnvironmentIcon,
        evGrade: null,
        hasContent: true,
        body: <AlternativesGrid cheaper={cheaper} healthier={healthier} diy={diy} />,
      });
    }
  }

  useEffect(() => {
    if (!verdictRef.current) return;
    const t = window.setTimeout(() => {
      verdictRef.current?.classList.add('investigation-card__verdict--visible');
    }, 80);
    return () => window.clearTimeout(t);
  }, [investigation]);

  const variantClass =
    recordPresentation && typeof recordPresentation.variant === 'string'
      ? ` investigation-card--${recordPresentation.variant}`
      : '';

  const matchMethodReadable =
    id.identification_method === 'text_search'
      ? 'Text search'
      : id.identification_method === 'direct_logo'
        ? 'Logo confirmed'
        : id.identification_method === 'partial_logo' || id.identification_method === 'product_recognition'
          ? 'Logo inferred'
          : id.identification_method === 'scene_inference'
            ? 'Scene context'
            : 'Verify match';

  const idConf = typeof id.confidence === 'number' ? id.confidence : NaN;
  const showIdentificationAccuracyHint =
    Number.isFinite(idConf) && idConf >= 0.6 && idConf < 0.85;
  const serviceDegraded = Boolean(investigation.service_degraded);
  const degradedMessage =
    typeof investigation.degraded_message === 'string' && investigation.degraded_message.trim()
      ? investigation.degraded_message.trim()
      : null;
  const perimeterSlug =
    typeof investigation.brand_slug === 'string' && investigation.brand_slug.trim()
      ? investigation.brand_slug.trim()
      : '';
  const showActiveNow =
    Boolean(perimeterSlug) && (profileType === 'database' || serviceDegraded);

  const isStubInvestigation =
    Boolean(result?.is_stub_investigation) || Boolean(investigation.is_stub_investigation);
  const hasResultInvestigation = result == null || result.investigation != null;
  const showFinancialAnalysis = !isStubInvestigation && hasResultInvestigation;

  const deepCategories = normalizeDeepResearchCategories(investigation.deep_research_categories);
  if (import.meta.env.DEV) console.log('[InvestigationCard] deep_research_categories', deepCategories);

  const deepDisplayByCat = useMemo(() => {
    /** @type {Map<string, { tier1Groups: object[]; tier2Incidents: object[]; display_total_found: number; action_type_subtitle: string }>} */
    const m = new Map();
    for (const dc of deepCategories) {
      if (!dc || typeof dc !== 'object') continue;
      const cat = typeof /** @type {Record<string, unknown>} */ (dc).category === 'string' ? /** @type {Record<string, unknown>} */ (dc).category : '';
      if (cat) m.set(cat, prepareDeepCategoryForDisplay(/** @type {Record<string, unknown>} */ (dc)));
    }
    return m;
  }, [deepCategories]);

  const dossierListsOngoingMatters = useMemo(
    () => investigationHasIndexedActiveMatters(investigation),
    [investigation]
  );

  const displayTimelineEvents = useMemo(
    () => dedupeTimelineEvents(investigation.timeline),
    [investigation.timeline]
  );

  const incidentIndexCounts = useMemo(
    () => computeIncidentIndexCounts(/** @type {Record<string, unknown>} */ (investigation)),
    [investigation]
  );
  const incidentProvenance = useMemo(
    () => computeIncidentProvenanceCounts(/** @type {Record<string, unknown>} */ (investigation)),
    [investigation]
  );
  const placementTabTotalSum = useMemo(() => {
    let s = 0;
    for (const dc of deepCategories) {
      if (!dc || typeof dc !== 'object') continue;
      const tf = /** @type {Record<string, unknown>} */ (dc).total_found;
      if (typeof tf === 'number' && Number.isFinite(tf)) s += Math.floor(tf);
    }
    return s;
  }, [deepCategories]);
  const receiptAlignedVerified = useMemo(() => {
    const inv = /** @type {Record<string, unknown>} */ (investigation);
    const r = inv.receipt_incident_count;
    if (typeof r === 'number' && Number.isFinite(r)) return Math.max(0, Math.floor(r));
    if (deepCategories.length > 0) return incidentIndexCounts.unique_incident_count;
    return incidentProvenance.verifiedEnforcementMatters;
  }, [
    investigation,
    deepCategories.length,
    incidentIndexCounts.unique_incident_count,
    incidentProvenance.verifiedEnforcementMatters,
  ]);
  const additionalContextualItems = useMemo(() => {
    if (placementTabTotalSum > 0) return Math.max(0, placementTabTotalSum - receiptAlignedVerified);
    return incidentProvenance.additionalItems;
  }, [placementTabTotalSum, receiptAlignedVerified, incidentProvenance.additionalItems]);

  const coveredSections = new Set();
  for (const d of deepCategories) {
    if (!d || typeof d !== 'object') continue;
    const ck = typeof /** @type {Record<string, unknown>} */ (d).category === 'string' ? /** @type {Record<string, unknown>} */ (d).category : '';
    const sk = DR_CATEGORY_TO_SECTION_KEY[ck];
    if (sk) coveredSections.add(sk);
    if (ck === 'executive_and_governance') coveredSections.add('executive');
  }
  const accordionSectionItems = sectionItems.filter((it) => !coveredSections.has(it.key));

  const concernTier = concernTierBadgeProps(investigation.overall_concern_level);
  const topChipCategories = deepCategories.slice(0, 4);
  const moreChipCount = Math.max(0, deepCategories.length - 4);

  const timelineAccordionResetKey = useMemo(() => {
    const slug =
      typeof investigation.brand_slug === 'string' && investigation.brand_slug.trim()
        ? investigation.brand_slug.trim()
        : '';
    const brand = typeof id.brand === 'string' && id.brand.trim() ? id.brand.trim() : '';
    const parent =
      typeof id.corporate_parent === 'string' && id.corporate_parent.trim() ? id.corporate_parent.trim() : '';
    return slug || brand || parent || 'investigation';
  }, [investigation.brand_slug, id.brand, id.corporate_parent]);

  const scrollToDeepCategory = useCallback((catKey) => {
    setOpenSection(`deep:${catKey}`);
    window.requestAnimationFrame(() => {
      document.getElementById(`ea-deep-cat-${catKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const handleFindAlternatives = useCallback(() => {
    if (typeof onFindAlternatives === 'function') onFindAlternatives();
    else
      document.getElementById('ea-alternatives-region')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [onFindAlternatives]);

  const ca = investigation.cost_absorption;
  const hasCostAbsorptionData =
    ca &&
    typeof ca === 'object' &&
    ((Array.isArray(ca.who_benefited) && ca.who_benefited.length > 0) ||
      (Array.isArray(ca.who_paid) && ca.who_paid.length > 0) ||
      (typeof ca.the_gap === 'string' && ca.the_gap.trim()));
  const ci = investigation.community_impact;
  const hasCommunityImpactData =
    ci &&
    typeof ci === 'object' &&
    Boolean(
      ci.displacement_effect ||
        ci.price_illusion ||
        ci.tax_math ||
        ci.wealth_velocity ||
        ci.the_real_math
    );
  const showInterpretiveSilo = showFinancialAnalysis || hasCostAbsorptionData || hasCommunityImpactData;

  /** @param {string} catKey */
  const legacySectionForDeepCategory = (catKey) => {
    if (catKey === 'executive_and_governance') return sectionItems.find((s) => s.key === 'executive');
    const sec = DR_CATEGORY_TO_SECTION_KEY[catKey];
    if (!sec) return null;
    return sectionItems.find((s) => s.key === sec);
  };

  return (
    <section className={`investigation-card investigation-card--bento${variantClass}`}>
      {serviceDegraded && degradedMessage ? (
        <div className="investigation-card__service-degraded" role="status">
          {degradedMessage}
        </div>
      ) : null}
      {showIdentificationAccuracyHint ? (
        <div className="investigation-card__id-accuracy-hint" role="note">
          <p className="investigation-card__body">
            Lower confidence on the brand match — does this look right? The record below is from public filings
            and news; it does not depend on the photo.
          </p>
          {typeof onWrongBrand === 'function' ? (
            <button type="button" className="investigation-card__wrong-brand-link" onClick={onWrongBrand}>
              Wrong brand?
            </button>
          ) : null}
        </div>
      ) : null}
      {showNotable ? <NotableMentionsCallout notable={notableRaw} /> : null}
      {investigation.clean_card ? (
        <p className="investigation-card__clean-card investigation-card__body">
          Clean card — highlighted alternative; sections below include honest caveats.
        </p>
      ) : null}

      {showActiveNow ? (
        <ActiveNowSection brandSlug={perimeterSlug} variant="tap" dossierListsOngoingMatters={dossierListsOngoingMatters} />
      ) : null}

      <div className="investigation-card__hero investigation-card__hero-mount investigation-card__hero--redesign">
        <div className="investigation-card__hero-top">
          <h1
            className={`investigation-card__headline investigation-card__headline--hero${
              useDeepPublicRecordHero ? ' investigation-card__headline--public-records' : ''
            }`}
          >
            {primaryHeroTitle}
          </h1>
          <span
            className="investigation-card__concern-tier"
            style={{
              color: concernTier.color,
              borderColor: concernTier.border,
              background: concernTier.bg,
            }}
          >
            {concernTier.label}
          </span>
        </div>
        {useDeepPublicRecordHero ? (
          <>
            {execSummaryAfterLede ? (
              <p className="investigation-card__hero-lede investigation-card__body">{execSummaryAfterLede}</p>
            ) : null}
            {showLatestSubhead ? (
              <div className="investigation-card__hero-latest">
                <span className="investigation-card__hero-latest-kicker">Latest</span>
                <span className="investigation-card__hero-latest-headline">{liveHeadline}</span>
              </div>
            ) : null}
          </>
        ) : heroLede ? (
          <p className="investigation-card__hero-lede investigation-card__body">{heroLede}</p>
        ) : execSummary ? (
          <p className="investigation-card__hero-lede investigation-card__body">{execSummary}</p>
        ) : null}
        <p className="investigation-card__index-counts investigation-card__body-muted" role="note">
          {receiptAlignedVerified} verified enforcement matters · {additionalContextualItems} additional
          contextual items · Tab totals are higher because incidents appear in multiple categories
        </p>
        {deepCategories.length > 0 ? (
          <div
            className="investigation-card__category-chips"
            role="navigation"
            aria-label="Jump to category (counts are placements per tab, not unique matters)"
          >
            {topChipCategories.map((dc, i) => {
              if (!dc || typeof dc !== 'object') return null;
              const cat = typeof dc.category === 'string' ? dc.category : '';
              const chip = typeof dc.chip_label === 'string' ? dc.chip_label : cat;
              const prep = cat ? deepDisplayByCat.get(cat) : null;
              const d = /** @type {Record<string, unknown>} */ (dc);
              const n =
                typeof d.total_found === 'number' && Number.isFinite(d.total_found)
                  ? Math.floor(d.total_found)
                  : prep != null
                    ? prep.display_total_found
                    : 0;
              const br = prep?.action_type_subtitle;
              return (
                <button
                  key={cat ? `${cat}-${i}` : `chip-${i}`}
                  type="button"
                  className="investigation-card__category-chip ea-press-label"
                  onClick={() => scrollToDeepCategory(cat)}
                  aria-label={`${chip}: ${n} category placements`}
                >
                  <span className="investigation-card__category-chip-line1">
                    {chip} ({n} placements)
                  </span>
                  {br ? <span className="investigation-card__category-chip-breakdown">{br}</span> : null}
                </button>
              );
            })}
            {moreChipCount > 0 && deepCategories[4] && typeof deepCategories[4].category === 'string' ? (
              <button
                type="button"
                className="investigation-card__category-chip investigation-card__category-chip--more ea-press-label"
                onClick={() => scrollToDeepCategory(String(deepCategories[4].category))}
              >
                +{moreChipCount} more
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="investigation-card__hero-row investigation-card__hero-row--compact">
          <ConfidenceBadge presentation={confPresent} compact />
        </div>
        {id && typeof id === 'object' && ('confidence' in id || id.identification_method) ? (
          <p className="investigation-card__match-line investigation-card__body-muted investigation-card__match-line--compact">
            Match: {confidenceLabelFromId(id.confidence)} · {matchMethodReadable}
          </p>
        ) : null}
      </div>

      <div className="investigation-card__accordion">
        {deepCategories.map((dc) => {
          if (!dc || typeof dc !== 'object') return null;
          const d = /** @type {Record<string, unknown>} */ (dc);
          const cat = typeof d.category === 'string' ? d.category : '';
          const title = typeof d.title === 'string' ? d.title : cat;
          const prep = cat ? deepDisplayByCat.get(cat) : prepareDeepCategoryForDisplay(d);
          const tabPlacementTotal =
            typeof d.total_found === 'number' && Number.isFinite(d.total_found)
              ? Math.floor(d.total_found)
              : prep.display_total_found;
          const overflowNote = typeof d.overflow_note === 'string' ? d.overflow_note.trim() : '';
          const sevDot = typeof d.severity_dot === 'string' ? d.severity_dot : 'low';
          const open = openSection === `deep:${cat}`;
          return (
            <div
              key={cat}
              id={`ea-deep-cat-${cat}`}
              className="investigation-card__accordion-item investigation-card__accordion-item--confirmed"
            >
              <button
                type="button"
                className="investigation-card__accordion-trigger investigation-card__accordion-trigger--deep"
                aria-expanded={open}
                onClick={() => setOpenSection(open ? null : `deep:${cat}`)}
              >
                <span
                  className="investigation-card__severity-dot"
                  style={{ background: severityDotColor(sevDot) }}
                  aria-hidden
                />
                <span className="investigation-card__accordion-title-wrap">
                  <span className="investigation-card__accordion-title investigation-card__accordion-title--deep">
                    {title}
                  </span>
                  {prep.action_type_subtitle ? (
                    <span className="investigation-card__accordion-type-breakdown investigation-card__body-muted">
                      {prep.action_type_subtitle}
                    </span>
                  ) : null}
                </span>
                <span className="investigation-card__accordion-count">{tabPlacementTotal} placements</span>
                {overflowNote ? (
                  <span className="investigation-card__accordion-overflow">{overflowNote}</span>
                ) : null}
                <span
                  className="investigation-card__accordion-chev investigation-card__accordion-chev--end"
                  aria-hidden
                  style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  ›
                </span>
              </button>
              <div
                className={`investigation-card__accordion-panel${open ? ' investigation-card__accordion-panel--open' : ''}`}
              >
                <div className="investigation-card__accordion-inner investigation-card__accordion-inner--incidents">
                  {prep.tier1Groups.map((g, idx) => (
                    <Tier1MatterCard key={g.key || `${cat}-t1-${idx}`} group={g} />
                  ))}
                  {prep.tier2Incidents.length > 0 ? (
                    <div className="investigation-card__background-block">
                      <div className="investigation-card__background-label">Background</div>
                      <p className="investigation-card__background-hint investigation-card__body-muted">
                        Contextual reporting and sourced narrative — not a standalone enforcement finding.
                      </p>
                      {prep.tier2Incidents.map((inc, idx) =>
                        inc && typeof inc === 'object' ? (
                          <DeepIncidentCard
                            key={`${cat}-t2-${idx}`}
                            variant="background"
                            incident={/** @type {Record<string, unknown>} */ (inc)}
                          />
                        ) : null
                      )}
                    </div>
                  ) : null}
                  {(() => {
                    const legacy = legacySectionForDeepCategory(cat);
                    if (!legacy || !legacy.hasContent) return null;
                    return (
                      <div className="investigation-card__deep-legacy-context">{legacy.body}</div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
        {perimeterSlug ? (
          <div
            className="investigation-card__accordion-item investigation-card__accordion-item--confirmed"
            key="ea-human-scale"
          >
            <button
              type="button"
              className="investigation-card__accordion-trigger"
              aria-expanded={openSection === 'human-scale'}
              onClick={() => setOpenSection(openSection === 'human-scale' ? null : 'human-scale')}
            >
              <span
                className="investigation-card__accordion-chev"
                aria-hidden
                style={{ transform: openSection === 'human-scale' ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                ›
              </span>
              <span className="investigation-card__accordion-title">HUMAN-SCALE PENALTY ANALYSIS</span>
            </button>
            <div
              className={`investigation-card__accordion-panel${
                openSection === 'human-scale' ? ' investigation-card__accordion-panel--open' : ''
              }`}
            >
              <div className="investigation-card__accordion-inner">
                <HumanScaleAnalysis brandSlug={perimeterSlug} />
              </div>
            </div>
          </div>
        ) : null}
        {accordionSectionItems.map((item) => {
          const SectionIcon = item.Icon;
          const open = openSection === item.key;
          const accentClass =
            item.accent === 'allegation'
              ? ' investigation-card__accordion-item--allegation'
              : ' investigation-card__accordion-item--confirmed';
          const rp = item.rowPhase1;
          return (
            <div key={item.key} className={`investigation-card__accordion-item${accentClass}`}>
              {rp ? (
                <button
                  type="button"
                  className="investigation-card__accordion-trigger investigation-card__accordion-trigger--split"
                  aria-expanded={open}
                  onClick={() => setOpenSection(open ? null : item.key)}
                >
                  <span className="investigation-card__accordion-trigger-start">
                    {SectionIcon ? <SectionIcon /> : null}
                    <span
                      className="investigation-card__accordion-title investigation-card__accordion-title--split"
                      style={{ opacity: rp.isCollapsedEmpty ? 0.35 : 1 }}
                    >
                      {item.title}
                    </span>
                  </span>
                  <span className="investigation-card__accordion-trigger-end">
                    {!rp.isCollapsedEmpty ? (
                      <span className="investigation-card__accordion-row-meta investigation-card__body-muted">
                        {rp.badge ? (
                          <>
                            <span aria-hidden> · </span>
                            <span
                              className="investigation-card__evidence-row-label"
                              style={{ color: rp.badge.color }}
                            >
                              {rp.badge.label}
                            </span>
                          </>
                        ) : null}
                        {rp.sourceCount > 0 ? (
                          <span>
                            {' · '}
                            {rp.sourceCount} source{rp.sourceCount === 1 ? '' : 's'}
                          </span>
                        ) : null}
                        {rp.timelineYear != null ? <span>{` · ${rp.timelineYear}`}</span> : null}
                      </span>
                    ) : null}
                    <span
                      className="investigation-card__accordion-chev investigation-card__accordion-chev--end"
                      aria-hidden
                      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      ›
                    </span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="investigation-card__accordion-trigger"
                  aria-expanded={open}
                  onClick={() => setOpenSection(open ? null : item.key)}
                >
                  <span className="investigation-card__accordion-chev" aria-hidden style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    ›
                  </span>
                  {SectionIcon ? <SectionIcon /> : null}
                  <span className="investigation-card__accordion-title">{item.title}</span>
                  {item.evGrade ? <EvidenceBadge grade={item.evGrade} /> : null}
                  {item.severityStyle ? (
                    <span
                      className="investigation-card__health-severity-pill"
                      style={{ color: item.severityStyle.accent, borderColor: item.severityStyle.border }}
                    >
                      {String(item.severityLabel).toUpperCase()}
                    </span>
                  ) : null}
                </button>
              )}
              <div
                className={`investigation-card__accordion-panel${open ? ' investigation-card__accordion-panel--open' : ''}`}
              >
                <div className="investigation-card__accordion-inner">{item.body}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="investigation-card__timeline-wrap">
        {/* key resets collapsed state per dossier; do not use minEvents — it hid the whole timeline when fewer than 3 events */}
        <Timeline key={timelineAccordionResetKey} events={displayTimelineEvents} />
      </div>

      {userCaptureSrc && referenceImageSrc ? (
        <div className="investigation-card__photo-pair" aria-label="Capture and editorial context">
          <figure className="investigation-card__photo-cell">
            <figcaption className="investigation-card__photo-label">Your capture</figcaption>
            <div className="investigation-card__photo-frame">
              <img src={userCaptureSrc} alt="Your photo used for this investigation" />
              {tapPositionNormalized &&
              typeof tapPositionNormalized.x === 'number' &&
              typeof tapPositionNormalized.y === 'number' ? (
                <span
                  aria-hidden
                  className="investigation-card__tap-dot"
                  style={{
                    left: `${tapPositionNormalized.x * 100}%`,
                    top: `${tapPositionNormalized.y * 100}%`,
                  }}
                />
              ) : null}
            </div>
          </figure>
          <figure className="investigation-card__photo-cell">
            <figcaption className="investigation-card__photo-label">Editorial — product context</figcaption>
            <div className="investigation-card__photo-frame">
              <img
                src={referenceImageSrc}
                alt="Editorial reference image for the same product category"
              />
            </div>
          </figure>
        </div>
      ) : null}

      <div className="investigation-card__verdict-block investigation-card__verdict-block--compact">
        {flatVerdictPills.length ? (
          <div ref={verdictRef} className="investigation-card__verdict investigation-card__verdict-pills">
            {flatVerdictPills.map((tag) => (
              <span key={tag} className="investigation-card__verdict-pill">
                {String(tag).replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        ) : Object.keys(grouped).length > 0 ? (
          <div ref={verdictRef} className="investigation-card__verdict investigation-card__verdict-grouped">
            {Object.entries(grouped).map(([category, tags]) => (
              <div key={category} className="investigation-card__verdict-group">
                <div className="investigation-card__verdict-cat">{category}</div>
                <div className="investigation-card__verdict-tags-row">
                  {tags.map((tag) => (
                    <span key={tag} className="investigation-card__verdict-pill">
                      {tag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!useDeepPublicRecordHero && !heroLede && execSummary ? (
          <p className="investigation-card__exec-summary investigation-card__body">{execSummary}</p>
        ) : null}

        <ProofBlock
          investigation={investigation}
          identification={identification}
          result={result}
          recordPresentation={recordPresentation}
          suppressRecordBadge
        />
      </div>

      {showInterpretiveSilo ? (
        <InterpretiveAnalysisSilo>
          {showFinancialAnalysis ? (
            <details className="investigation-card__financial-details">
              <summary className="investigation-card__financial-summary">Financial analysis</summary>
              <div className="investigation-card__financial-inner">
                <CompanyCharts profile={investigation} />
                {['significant', 'high', 'critical'].includes(
                  String(investigation.overall_concern_level || '').toLowerCase()
                ) ? (
                  <WealthChart />
                ) : null}
              </div>
            </details>
          ) : null}
          <div className="investigation-card__footer-blocks investigation-card__footer-blocks--post-accordion">
            <CostAbsorption data={investigation.cost_absorption} />
            <CommunityImpact data={investigation.community_impact} />
          </div>
        </InterpretiveAnalysisSilo>
      ) : null}

      {Array.isArray(investigation.subsidiaries) && investigation.subsidiaries.length ? (
        <div className="investigation-card__subs">
          <span className="investigation-card__subs-label">Related brands / units</span>
          <p className="investigation-card__subs-body investigation-card__body">{investigation.subsidiaries.join(' · ')}</p>
        </div>
      ) : null}

      <SourcesLedger investigation={investigation} result={result} />

      {profileType === 'database' && perimeterSlug ? (
        <p className="investigation-card__export-json-wrap">
          <a
            className="investigation-card__export-json"
            href={profileStructuredExportUrl(perimeterSlug)}
            target="_blank"
            rel="noreferrer"
          >
            {'{ }'} Export JSON
          </a>
        </p>
      ) : null}

      <p className="investigation-card__methodology investigation-card__body-muted">
        <a
          className="investigation-card__methodology-link"
          href={methodologyPageUrl()}
          target="_blank"
          rel="noopener noreferrer"
        >
          How investigations work
        </a>
        <span className="investigation-card__methodology-rest"> — methodology, limits, corrections.</span>
      </p>

      <InvestigationReceipt investigation={investigation} />

      {typeof onReportError === 'function' ? (
        <button
          type="button"
          onClick={onReportError}
          data-no-disintegrate
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
            letterSpacing: 1,
            textTransform: 'uppercase',
            background: 'transparent',
            border: 'none',
            color: '#4a6a7a',
            cursor: 'pointer',
            padding: '4px 0',
            marginTop: 8,
            display: 'block',
          }}
        >
          report an error
        </button>
      ) : null}

      <div className="investigation-card__bottom-bar" aria-label="Primary actions">
        <button
          type="button"
          className="investigation-card__bottom-bar-btn investigation-card__bottom-bar-btn--primary ea-press-label"
          onClick={handleFindAlternatives}
        >
          FIND ALTERNATIVES →
        </button>
        {typeof onShare === 'function' ? (
          <button
            type="button"
            className="investigation-card__bottom-bar-btn investigation-card__bottom-bar-btn--outline ea-press-label"
            onClick={onShare}
          >
            SHARE ↑
          </button>
        ) : (
          <span className="investigation-card__bottom-bar-spacer" aria-hidden />
        )}
      </div>
    </section>
  );
}
