import Timeline from './Timeline';
import CommunityImpact from './CommunityImpact';
import CostAbsorption from './CostAbsorption.jsx';
import WealthChart from './WealthChart.jsx';
import {
  TaxIcon,
  LegalIcon,
  LaborIcon,
  EnvironmentIcon,
  PoliticalIcon,
  ExecutivesIcon,
  HealthIcon,
} from './icons/SectionIcons';
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

const SECTION_PILL_LABEL = {
  tax: 'TAX',
  legal: 'LEGAL',
  labor: 'LABOR',
  environmental: 'ENVIRONMENTAL',
  political: 'POLITICAL',
  product_health: 'PRODUCT HEALTH',
  executive: 'EXECUTIVES',
};

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
  strong: { bg: 'rgba(240,168,32,0.1)', text: '#f0a820', border: '#f0a820' },
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
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 999,
        border: 'none',
        background: colors.bg,
        color: colors.text,
        marginLeft: 8,
        flexShrink: 0,
      }}
    >
      {raw}
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
    lineHeight: 1.55,
    margin: '0 0 8px',
  };

  return (
    <div
      style={{
        border: 'none',
        borderRadius: 4,
        padding: '12px 14px 14px',
        margin: '0 1rem 16px',
        background: 'rgba(240, 168, 32, 0.08)',
      }}
    >
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          letterSpacing: 2.5,
          textTransform: 'uppercase',
          color: '#6a8a9a',
          marginBottom: 10,
        }}
      >
        NOTABLE
      </div>
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
    title: 'Tax',
    summaryKey: 'tax_summary',
    flagsKey: 'tax_flags',
    sourcesKey: 'tax_sources',
    evidenceGradeKey: 'tax_evidence_grade',
  },
  {
    key: 'legal',
    title: 'Legal',
    summaryKey: 'legal_summary',
    flagsKey: 'legal_flags',
    sourcesKey: 'legal_sources',
    evidenceGradeKey: 'legal_evidence_grade',
  },
  {
    key: 'labor',
    title: 'Labor',
    summaryKey: 'labor_summary',
    flagsKey: 'labor_flags',
    sourcesKey: 'labor_sources',
    evidenceGradeKey: 'labor_evidence_grade',
  },
  {
    key: 'environmental',
    title: 'Environmental',
    summaryKey: 'environmental_summary',
    flagsKey: 'environmental_flags',
    sourcesKey: 'environmental_sources',
    evidenceGradeKey: 'environmental_evidence_grade',
  },
  {
    key: 'political',
    title: 'Political',
    summaryKey: 'political_summary',
    flagsKey: null,
    sourcesKey: 'political_sources',
    evidenceGradeKey: 'political_evidence_grade',
  },
  {
    key: 'product_health',
    title: 'Product Health',
    summaryKey: 'product_health',
    flagsKey: null,
    sourcesKey: 'product_health_sources',
    evidenceGradeKey: 'product_health_evidence_grade',
  },
  {
    key: 'executive',
    title: 'Executives',
    summaryKey: 'executive_summary',
    flagsKey: null,
    sourcesKey: 'executive_sources',
    evidenceGradeKey: null,
  },
];

/**
 * @param {{
 *   investigation: Record<string, unknown>;
 *   identification?: Record<string, unknown> | null;
 *   onShare?: () => void;
 *   recordPresentation?: Record<string, unknown> | null;
 * }} props
 */
export default function InvestigationCard({ investigation, onShare, recordPresentation }) {
  if (!investigation) return null;

  const profileType = String(investigation.profile_type || '');

  const verdictTags = Array.isArray(investigation.verdict_tags) ? investigation.verdict_tags.map(String) : [];
  const concernFlags = Array.isArray(investigation.concern_flags) ? investigation.concern_flags.map(String) : [];
  const uniqueTags = [...new Set([...verdictTags, ...concernFlags])];
  const grouped = groupTags(uniqueTags);

  const notableRaw = investigation.notable_mentions;
  const showNotable =
    profileType === 'realtime_search' && notableMentionsHasContent(notableRaw);

  const emptySectionLabels = [];
  const sectionNodes = [];

  for (const s of SECTIONS) {
    const summary = investigation[s.summaryKey];
    const fl = s.flagsKey ? investigation[s.flagsKey] : null;
    const sources = investigation[s.sourcesKey];
    const hasSummary = isSummaryMeaningful(summary);
    const hasFlags = Array.isArray(fl) && fl.length > 0;
    const hasSources = Array.isArray(sources) && sources.length > 0;
    const hasContent = hasSummary || hasFlags || hasSources;

    if (!hasContent) {
      const pill = SECTION_PILL_LABEL[s.key];
      if (pill) emptySectionLabels.push(pill);
      continue;
    }

    const Icon = SECTION_ICONS[s.key];
    const evGrade =
      s.evidenceGradeKey && investigation[s.evidenceGradeKey]
        ? investigation[s.evidenceGradeKey]
        : null;
    const headerSourced = hasSources || hasSummary;

    sectionNodes.push(
      <div key={s.key} className="investigation-card__section">
        <div className="investigation-card__section-head investigation-card__section-head--static">
          <h2
            className={`section-header investigation-card__section-title${headerSourced ? ' investigation-card__section-title--sourced' : ''}`}
            style={{
              flex: 1,
              margin: '12px 0 0',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {Icon ? <Icon /> : null}
            {s.title}
            <EvidenceBadge grade={evGrade} />
          </h2>
        </div>
        <div className="investigation-card__section-body investigation-body body-crimson">
          {hasSummary ? (
            <p className="investigation-card__section-summary">{String(summary)}</p>
          ) : null}
          {hasFlags ? (
            <ul className="investigation-card__list" style={{ listStyle: 'disc' }}>
              {fl.map((item) => (
                <li key={String(item)}>{String(item)}</li>
              ))}
            </ul>
          ) : null}
          {hasSources ? (
            <ul className="investigation-card__sources investigation-card__sources--blocks">
              {sources.map((url) => {
                const href = String(url);
                return (
                  <li key={href} className="investigation-card__source-li">
                    <a href={href} target="_blank" rel="noreferrer" className="investigation-card__source-block">
                      <span className="investigation-card__source-kicker">SOURCE</span>
                      <span className="investigation-card__source-url">{href}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    );
  }

  const variantClass =
    recordPresentation && typeof recordPresentation.variant === 'string'
      ? ` investigation-card--${recordPresentation.variant}`
      : '';

  return (
    <section className={`investigation-card${variantClass}`}>
      {showNotable ? <NotableMentionsCallout notable={notableRaw} /> : null}
      {investigation.clean_card ? (
        <p className="investigation-card__clean-card">
          Clean card — highlighted alternative; sections below include honest caveats.
        </p>
      ) : null}

      <div style={{ padding: '0 1rem' }}>
        {Object.keys(grouped).length > 0 ? (
          <div className="verdict-tags-section">
            {Object.entries(grouped).map(([category, tags]) => (
              <div key={category} className="verdict-tag-group">
                <div className="verdict-category-label">{category}</div>
                <div className="verdict-tags-container">
                  {tags.map((tag) => (
                    <span key={tag} className="verdict-tag">
                      {tag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <Timeline events={investigation.timeline} />
      </div>

      <div className="investigation-card__sections">
        {sectionNodes}
        {emptySectionLabels.length > 0 ? (
          <div className="investigation-card__empty-row">
            <div className="investigation-card__empty-pills">
              {emptySectionLabels.map((label) => (
                <span key={label} className="investigation-card__empty-pill">
                  {label}
                </span>
              ))}
            </div>
            <p className="investigation-card__empty-note">No indexed public record in these categories.</p>
          </div>
        ) : null}
      </div>

      <div style={{ padding: '0 1rem' }}>
        <CostAbsorption data={investigation.cost_absorption} />
        {String(investigation.overall_concern_level || '').toLowerCase() === 'significant' ? (
          <WealthChart />
        ) : null}
        <CommunityImpact data={investigation.community_impact} />
      </div>

      {Array.isArray(investigation.subsidiaries) && investigation.subsidiaries.length ? (
        <div className="investigation-card__subs">
          <span className="investigation-card__subs-label">Related brands / units</span>
          <p className="investigation-card__subs-body">{investigation.subsidiaries.join(' · ')}</p>
        </div>
      ) : null}

      {typeof onShare === 'function' ? (
        <div style={{ padding: '24px 1rem 8px' }}>
          <button
            type="button"
            className="app__btn app__btn--share"
            onClick={onShare}
            style={{ width: '100%', maxWidth: 420 }}
          >
            Share This Record ↑
          </button>
        </div>
      ) : null}
    </section>
  );
}
