import { useEffect, useMemo, useRef, useState } from 'react';
import Timeline from './Timeline';
import CommunityImpact from './CommunityImpact';
import CostAbsorption from './CostAbsorption.jsx';
import WealthChart from './WealthChart.jsx';
import ProofBlock from './ProofBlock.jsx';
import ConfidenceBadge from './ConfidenceBadge.jsx';
import { getConfidenceBadgePresentation } from '../utils/investigationConfidence.js';
import { collectSourceLedgerRows } from '../utils/investigationSources.js';
import {
  TaxIcon,
  LegalIcon,
  LaborIcon,
  EnvironmentIcon,
  PoliticalIcon,
  ExecutivesIcon,
  HealthIcon,
} from './icons/SectionIcons';
import HireDirectInvestigationBlock from './HireDirectInvestigationBlock.jsx';
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

const SECTIONS = [
  {
    key: 'tax',
    title: 'TAX',
    summaryKey: 'tax_summary',
    flagsKey: 'tax_flags',
    sourcesKey: 'tax_sources',
    evidenceGradeKey: 'tax_evidence_grade',
  },
  {
    key: 'legal',
    title: 'LEGAL',
    summaryKey: 'legal_summary',
    flagsKey: 'legal_flags',
    sourcesKey: 'legal_sources',
    evidenceGradeKey: 'legal_evidence_grade',
  },
  {
    key: 'labor',
    title: 'LABOR',
    summaryKey: 'labor_summary',
    flagsKey: 'labor_flags',
    sourcesKey: 'labor_sources',
    evidenceGradeKey: 'labor_evidence_grade',
  },
  {
    key: 'environmental',
    title: 'ENVIRONMENTAL',
    summaryKey: 'environmental_summary',
    flagsKey: 'environmental_flags',
    sourcesKey: 'environmental_sources',
    evidenceGradeKey: 'environmental_evidence_grade',
  },
  {
    key: 'political',
    title: 'POLITICAL',
    summaryKey: 'political_summary',
    flagsKey: null,
    sourcesKey: 'political_sources',
    evidenceGradeKey: 'political_evidence_grade',
  },
  {
    key: 'product_health',
    title: 'PRODUCT HEALTH',
    summaryKey: 'product_health',
    flagsKey: null,
    sourcesKey: 'product_health_sources',
    evidenceGradeKey: 'product_health_evidence_grade',
  },
  {
    key: 'executive',
    title: 'EXECUTIVES',
    summaryKey: 'executive_summary',
    flagsKey: null,
    sourcesKey: 'executive_sources',
    evidenceGradeKey: null,
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
  if (n >= 0.75) return 'High confidence';
  if (n >= 0.45) return 'Medium';
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
 *   onHireDirectShareFootnote?: (footnote: string) => void;
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
  onHireDirectShareFootnote,
}) {
  const [openSection, setOpenSection] = useState(/** @type {string | null} */ (null));
  const verdictRef = useRef(null);

  const profileType = investigation ? String(investigation.profile_type || '') : '';

  const headline =
    headlineProp && String(headlineProp).trim()
      ? String(headlineProp).trim()
      : investigation && typeof investigation.generated_headline === 'string' && investigation.generated_headline.trim()
        ? investigation.generated_headline.trim()
        : 'Investigation';

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

  const id = identification || {};

  const sectionItems = [];

  for (const s of SECTIONS) {
    const summary = investigation[s.summaryKey];
    const fl = s.flagsKey ? investigation[s.flagsKey] : null;
    const sources = investigation[s.sourcesKey];
    const hasSummary = isSummaryMeaningful(summary);
    const hasFlags = Array.isArray(fl) && fl.length > 0;
    const hasSources = Array.isArray(sources) && sources.length > 0;
    const hasContent = hasSummary || hasFlags || hasSources;

    const Icon = SECTION_ICONS[s.key];
    const evGrade =
      s.evidenceGradeKey && investigation[s.evidenceGradeKey] ? investigation[s.evidenceGradeKey] : null;

    sectionItems.push({
      key: s.key,
      title: s.title,
      accent: 'confirmed',
      Icon,
      evGrade,
      hasContent,
      body: hasContent ? (
        <>
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
                    <a href={href} target="_blank" rel="noreferrer" className="investigation-card__inline-source">
                      {href}
                    </a>
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
                  <a href={String(url)} target="_blank" rel="noreferrer" className="investigation-card__inline-source">
                    {String(url)}
                  </a>
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
                  <a href={String(url)} target="_blank" rel="noreferrer" className="investigation-card__inline-source">
                    {String(url)}
                  </a>
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
                        <a href={url} target="_blank" rel="noreferrer" className="investigation-card__study-link">
                          {title || url}
                        </a>
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
                  <a href={String(url)} target="_blank" rel="noreferrer" className="investigation-card__inline-source">
                    {String(url)}
                  </a>
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

  return (
    <section className={`investigation-card investigation-card--bento${variantClass}`}>
      {showNotable ? <NotableMentionsCallout notable={notableRaw} /> : null}
      {investigation.clean_card ? (
        <p className="investigation-card__clean-card investigation-card__body">
          Clean card — highlighted alternative; sections below include honest caveats.
        </p>
      ) : null}

      <div className="investigation-card__hero investigation-card__hero-mount">
        <h1 className="investigation-card__headline">{headline}</h1>
        <div className="investigation-card__hero-row">
          <ConfidenceBadge presentation={confPresent} />
        </div>
        {id && typeof id === 'object' && ('confidence' in id || id.identification_method) ? (
          <p className="investigation-card__match-line investigation-card__body-muted">
            Match: {confidenceLabelFromId(id.confidence)} · {matchMethodReadable}
          </p>
        ) : null}
      </div>

      <div className="investigation-card__verdict-block">
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

        {execSummary ? <p className="investigation-card__exec-summary investigation-card__body">{execSummary}</p> : null}

        <ProofBlock
          investigation={investigation}
          identification={identification}
          result={result}
          recordPresentation={recordPresentation}
          suppressRecordBadge
        />
      </div>

      {Array.isArray(investigation.hire_direct_categories) && investigation.hire_direct_categories.length > 0 ? (
        <HireDirectInvestigationBlock
          hireDirectCategories={investigation.hire_direct_categories.map(String)}
          onShareFootnoteChange={onHireDirectShareFootnote}
        />
      ) : null}

      <div style={{ padding: '0 0 12px' }}>
        <Timeline events={investigation.timeline} />
      </div>

      <SourcesLedger investigation={investigation} result={result} />

      <div className="investigation-card__accordion">
        {sectionItems.map((item) => {
          const SectionIcon = item.Icon;
          const open = openSection === item.key;
          const accentClass =
            item.accent === 'allegation'
              ? ' investigation-card__accordion-item--allegation'
              : ' investigation-card__accordion-item--confirmed';
          return (
            <div key={item.key} className={`investigation-card__accordion-item${accentClass}`}>
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
              <div
                className={`investigation-card__accordion-panel${open ? ' investigation-card__accordion-panel--open' : ''}`}
              >
                <div className="investigation-card__accordion-inner">{item.body}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="investigation-card__footer-blocks">
        <CostAbsorption data={investigation.cost_absorption} />
        {String(investigation.overall_concern_level || '').toLowerCase() === 'significant' ? <WealthChart /> : null}
        <CommunityImpact data={investigation.community_impact} />
      </div>

      {Array.isArray(investigation.subsidiaries) && investigation.subsidiaries.length ? (
        <div className="investigation-card__subs">
          <span className="investigation-card__subs-label">Related brands / units</span>
          <p className="investigation-card__subs-body investigation-card__body">{investigation.subsidiaries.join(' · ')}</p>
        </div>
      ) : null}

      {typeof onShare === 'function' ? (
        <div className="investigation-card__share-wrap">
          <button type="button" className="app__btn app__btn--share investigation-card__share-btn" onClick={onShare}>
            Share this record
          </button>
        </div>
      ) : null}
    </section>
  );
}
