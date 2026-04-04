import { useState } from 'react';
import SeverityMeter from './SeverityMeter';
import Timeline from './Timeline';
import CommunityImpact from './CommunityImpact';
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
  { key: 'tax', title: 'Tax', summaryKey: 'tax_summary', flagsKey: 'tax_flags', sourcesKey: 'tax_sources' },
  { key: 'legal', title: 'Legal', summaryKey: 'legal_summary', flagsKey: 'legal_flags', sourcesKey: 'legal_sources' },
  { key: 'labor', title: 'Labor', summaryKey: 'labor_summary', flagsKey: 'labor_flags', sourcesKey: 'labor_sources' },
  {
    key: 'environmental',
    title: 'Environment',
    summaryKey: 'environmental_summary',
    flagsKey: 'environmental_flags',
    sourcesKey: 'environmental_sources',
  },
  {
    key: 'political',
    title: 'Political / influence',
    summaryKey: 'political_summary',
    flagsKey: null,
    sourcesKey: 'political_sources',
  },
  {
    key: 'product_health',
    title: 'Product & health',
    summaryKey: 'product_health',
    flagsKey: null,
    sourcesKey: 'product_health_sources',
  },
  {
    key: 'executive',
    title: 'Executives',
    summaryKey: 'executive_summary',
    flagsKey: null,
    sourcesKey: 'executive_sources',
  },
];

/**
 * @param {{ investigation: Record<string, unknown>; identification?: Record<string, unknown> | null }} props
 */
export default function InvestigationCard({ investigation, identification }) {
  const [open, setOpen] = useState({});
  const [expanded, setExpanded] = useState(false);

  if (!investigation) return null;

  const profileType = String(investigation.profile_type || '');
  const id = identification || {};

  const toggle = (key) => {
    setOpen((o) => ({ ...o, [key]: !o[key] }));
  };

  const verdictTags = Array.isArray(investigation.verdict_tags) ? investigation.verdict_tags.map(String) : [];
  const concernFlags = Array.isArray(investigation.concern_flags) ? investigation.concern_flags.map(String) : [];
  const uniqueTags = [...new Set([...verdictTags, ...concernFlags])];
  const grouped = groupTags(uniqueTags);

  const objectFallback =
    typeof id.object === 'string' && id.object ? id.object : String(investigation.brand || 'Investigation');
  const generated =
    typeof investigation.generated_headline === 'string' && investigation.generated_headline.trim()
      ? investigation.generated_headline.trim()
      : null;
  const headline = generated || objectFallback;
  const brandShown = investigation.brand || id.brand;

  return (
    <section className="investigation-card">
      <button type="button" className="investigation-card__header" onClick={() => setExpanded((e) => !e)}>
        <span className="investigation-card__title">The record</span>
        <span className="investigation-card__chev">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded ? (
        <>
          {profileType === 'realtime_search' ? (
            <p className="investigation-card__disclaimer">Live research — verify sources</p>
          ) : null}
          {profileType === 'limited' ? (
            <p className="investigation-card__disclaimer">Limited profile — no verified database entry yet</p>
          ) : null}
          {profileType === 'database' ? (
            <p className="investigation-card__disclaimer investigation-card__disclaimer--muted">
              Verified database profile
            </p>
          ) : null}
          {investigation.clean_card ? (
            <p className="investigation-card__clean-card">
              Clean card — highlighted alternative; sections below include honest caveats.
            </p>
          ) : null}

          <div style={{ padding: '0 1rem' }}>
            <h1 className="investigation-object-headline">{headline}</h1>
            <p className="brand-detected-line">
              Brand detected: <strong>{brandShown || 'Unknown'}</strong>
            </p>
            <SeverityMeter concernLevel={investigation.overall_concern_level} />
            {identification?.identification_method ? (
              <p
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  color: 'var(--color-text-dim)',
                  letterSpacing: 1,
                  margin: '4px 0',
                }}
              >
                {identification.identification_method === 'direct_logo' && 'Logo confirmed'}
                {identification.identification_method === 'partial_logo' && 'Brand identified from partial logo'}
                {identification.identification_method === 'product_recognition' && 'Product identified from packaging'}
                {identification.identification_method === 'scene_inference' && 'Brand inferred from scene context'}
              </p>
            ) : null}
            {identification?.identification_method === 'scene_inference' && identification?.confidence_notes ? (
              <p
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: 'var(--color-text-muted)',
                  marginBottom: 12,
                }}
              >
                {identification.confidence_notes}
              </p>
            ) : null}

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

            <Timeline events={investigation.timeline} />

            <CommunityImpact data={investigation.community_impact} />
          </div>

          <div className="investigation-card__sections">
            {SECTIONS.map((s) => {
              const summary = investigation[s.summaryKey];
              const fl = s.flagsKey ? investigation[s.flagsKey] : null;
              const sources = investigation[s.sourcesKey];
              const has =
                (summary && String(summary).trim()) ||
                (Array.isArray(fl) && fl.length) ||
                (Array.isArray(sources) && sources.length);
              if (!has) return null;

              const isOpen = open[s.key];
              const Icon = SECTION_ICONS[s.key];
              return (
                <div key={s.key} className="investigation-card__section">
                  <button type="button" className="investigation-card__section-head" onClick={() => toggle(s.key)}>
                    <h2 className="section-header" style={{ flex: 1, margin: '12px 0 0', textAlign: 'left' }}>
                      {Icon ? <Icon /> : null}
                      {s.title}
                    </h2>
                    <span className="investigation-card__section-chev">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen ? (
                    <div className="investigation-card__section-body investigation-body body-crimson">
                      {summary ? <p style={{ margin: '0 0 0.5rem' }}>{String(summary)}</p> : null}
                      {Array.isArray(fl) && fl.length ? (
                        <ul className="investigation-card__list" style={{ listStyle: 'disc' }}>
                          {fl.map((item) => (
                            <li key={item}>{String(item)}</li>
                          ))}
                        </ul>
                      ) : null}
                      {Array.isArray(sources) && sources.length ? (
                        <ul className="investigation-card__sources">
                          {sources.map((url) => (
                            <li key={url}>
                              <a href={String(url)} target="_blank" rel="noreferrer">
                                {String(url).replace(/^https?:\/\//, '').slice(0, 72)}
                                {String(url).length > 72 ? '…' : ''}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {Array.isArray(investigation.subsidiaries) && investigation.subsidiaries.length ? (
            <div className="investigation-card__subs">
              <span className="investigation-card__subs-label">Related brands / units</span>
              <p>{investigation.subsidiaries.join(' · ')}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
