import { useEffect, useMemo, useState } from 'react';
import { dedupeTimelineEvents } from '../utils/enforcementDisplay.js';

/** Wireframe order: Labor first, then Legal, … (default tab remains legal). */
const TAB_ORDER = [
  { key: 'labor', label: 'Labor' },
  { key: 'legal', label: 'Legal' },
  { key: 'environmental', label: 'Environmental' },
  { key: 'political', label: 'Political' },
  { key: 'tax', label: 'Tax' },
  { key: 'health', label: 'Health' },
  { key: 'executives', label: 'Executives' },
  { key: 'connections', label: 'Connections' },
];

/** @param {Record<string, unknown>} profile */
function sectionTriplet(profile, nestedKey, flatPrefix) {
  const sec = profile[nestedKey];
  if (sec && typeof sec === 'object' && 'summary' in sec) {
    return {
      summary: typeof sec.summary === 'string' ? sec.summary : '',
      flags: Array.isArray(sec.flags) ? sec.flags.map(String) : [],
      sources: Array.isArray(sec.sources) ? sec.sources.map(String) : [],
    };
  }
  const sumKey = `${flatPrefix}_summary`;
  const flagsKey = `${flatPrefix}_flags`;
  const srcKey = `${flatPrefix}_sources`;
  return {
    summary: typeof profile[sumKey] === 'string' ? profile[sumKey] : '',
    flags: Array.isArray(profile[flagsKey]) ? profile[flagsKey].map(String) : [],
    sources: Array.isArray(profile[srcKey]) ? profile[srcKey].map(String) : [],
  };
}

function concernChipClass(level) {
  const l = String(level || '').toLowerCase();
  if (l === 'significant') return 'bb-dossier__badge bb-dossier__badge--significant';
  if (l === 'moderate') return 'bb-dossier__badge bb-dossier__badge--moderate';
  return 'bb-dossier__badge bb-dossier__badge--other';
}

function severityDotClass(sev) {
  const s = String(sev || '').toLowerCase();
  if (s === 'critical') return 'bb-dossier__sev bb-dossier__sev--critical';
  if (s === 'high') return 'bb-dossier__sev bb-dossier__sev--high';
  return 'bb-dossier__sev bb-dossier__sev--neutral';
}

function tagLabel(t) {
  return String(t || '')
    .replace(/_/g, ' ')
    .toLowerCase();
}

/**
 * Black Book full dossier reader (no share, no algorithmic chrome).
 *
 * @param {{
 *   profile: Record<string, unknown>;
 *   prev?: { slug: string; name: string } | null;
 *   next?: { slug: string; name: string } | null;
 *   onNavigate?: (slug: string) => void;
 *   compact?: boolean;
 * }} props
 */
export default function DossierCard({ profile, prev, next, onNavigate, compact }) {
  const [tab, setTab] = useState('legal');

  const p = profile || {};
  const bookSlugForReset =
    typeof p.brand_slug === 'string' && p.brand_slug.trim() ? p.brand_slug.trim() : '';

  useEffect(() => {
    setTab('legal');
  }, [bookSlugForReset]);

  const headline =
    typeof p.generated_headline === 'string' && p.generated_headline.trim()
      ? p.generated_headline.trim()
      : '';
  const execSummary =
    typeof p.executive_summary === 'string' && p.executive_summary.trim()
      ? p.executive_summary.trim()
      : typeof p.investigation_summary === 'string' && p.investigation_summary.trim()
        ? p.investigation_summary.trim()
        : '';

  const brandName = typeof p.brand_name === 'string' ? p.brand_name : 'Company';
  const parent =
    (typeof p.parent_company === 'string' && p.parent_company.trim()) ||
    (typeof p.ultimate_parent === 'string' && p.ultimate_parent.trim()) ||
    '';

  const verdictTags = Array.isArray(p.verdict_tags) ? p.verdict_tags.map(String) : [];
  const concern = p.overall_concern_level || 'unknown';

  const timeline = useMemo(() => {
    const raw = Array.isArray(p.timeline)
      ? [...p.timeline].filter((e) => e && Number.isInteger(e.year))
      : [];
    return dedupeTimelineEvents(raw);
  }, [p.timeline]);

  const ci = p.community_impact && typeof p.community_impact === 'object' ? p.community_impact : null;
  const costAbs =
    p.cost_absorption && typeof p.cost_absorption === 'object' ? p.cost_absorption : null;
  const theGap =
    costAbs && typeof costAbs.the_gap === 'string' && costAbs.the_gap.trim()
      ? costAbs.the_gap.trim()
      : '';

  const whoBen = Array.isArray(costAbs?.who_benefited) ? costAbs.who_benefited : [];
  const whoPaid = Array.isArray(costAbs?.who_paid) ? costAbs.who_paid : [];

  const alternatives =
    p.alternatives && typeof p.alternatives === 'object' ? p.alternatives : null;
  const cheaper = Array.isArray(alternatives?.cheaper) ? alternatives.cheaper.map(String) : [];
  const healthier = Array.isArray(alternatives?.healthier) ? alternatives.healthier.map(String) : [];
  const diy = Array.isArray(alternatives?.diy) ? alternatives.diy.map(String) : [];

  const healthRecord =
    p.health_record && typeof p.health_record === 'object' ? p.health_record : null;
  const productHealth =
    typeof p.product_health === 'string' && p.product_health.trim() ? p.product_health.trim() : '';

  const tabBody = useMemo(() => {
    if (tab === 'health') {
      return (
        <div className="bb-dossier__tab-panel">
          {productHealth ? (
            <div className="bb-dossier__prose">
              <p className="bb-dossier__mini-label">Product / portfolio</p>
              <p>{productHealth}</p>
            </div>
          ) : null}
          {healthRecord && typeof healthRecord.summary === 'string' && healthRecord.summary.trim() ? (
            <div className="bb-dossier__prose" style={{ marginTop: productHealth ? 20 : 0 }}>
              <p className="bb-dossier__mini-label">Health record</p>
              <p>{healthRecord.summary}</p>
              {Array.isArray(healthRecord.flags) && healthRecord.flags.length ? (
                <ul className="bb-dossier__flags">
                  {healthRecord.flags.map((f, i) => (
                    <li key={i}>{String(f).replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              ) : null}
              {Array.isArray(healthRecord.sources) && healthRecord.sources.length ? (
                <ul className="bb-dossier__sources">
                  {healthRecord.sources.map((u, i) => (
                    <li key={i}>
                      <a href={u} target="_blank" rel="noopener noreferrer">
                        {u.replace(/^https?:\/\//, '').slice(0, 72)}
                        {String(u).length > 72 ? '…' : ''}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {!productHealth && !healthRecord?.summary ? (
            <p className="bb-dossier__muted">No health section in this record.</p>
          ) : null}
        </div>
      );
    }

    const map = {
      legal: sectionTriplet(p, 'legal', 'legal'),
      labor: sectionTriplet(p, 'labor', 'labor'),
      environmental: sectionTriplet(p, 'environmental', 'environmental'),
      political: sectionTriplet(p, 'political', 'political'),
      tax: sectionTriplet(p, 'tax', 'tax'),
      executives: sectionTriplet(p, 'executives', 'executives'),
      connections: sectionTriplet(p, 'connections', 'connections'),
    };
    const block = map[tab];
    if (!block) return null;
    return (
      <div className="bb-dossier__tab-panel">
        {block.summary ? <p className="bb-dossier__prose">{block.summary}</p> : null}
        {block.flags.length ? (
          <ul className="bb-dossier__flags">
            {block.flags.map((f, i) => (
              <li key={i}>{String(f).replace(/_/g, ' ')}</li>
            ))}
          </ul>
        ) : null}
        {block.sources.length ? (
          <ul className="bb-dossier__sources">
            {block.sources.map((u, i) => (
              <li key={i}>
                <a href={u} target="_blank" rel="noopener noreferrer">
                  {u.replace(/^https?:\/\//, '').slice(0, 80)}
                  {String(u).length > 80 ? '…' : ''}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {!block.summary && !block.flags.length ? (
          <p className="bb-dossier__muted">Nothing filed under this heading.</p>
        ) : null}
      </div>
    );
  }, [tab, p, healthRecord, productHealth]);

  return (
    <article className={`bb-dossier${compact ? ' bb-dossier--compact' : ''}`}>
      <header className="bb-dossier__header">
        <div className={concernChipClass(concern)}>{String(concern).toUpperCase()}</div>
        <h1 className="bb-dossier__brand">{brandName}</h1>
        {parent ? <p className="bb-dossier__parent">Parent: {parent}</p> : null}
        {headline ? <p className="bb-dossier__headline">{headline}</p> : null}
        {execSummary ? <div className="bb-dossier__exec">{execSummary}</div> : null}
        {verdictTags.length ? (
          <div className="bb-dossier__pills" aria-label="Verdict tags">
            {verdictTags.map((t, i) => (
              <span key={i} className="bb-dossier__pill">
                {tagLabel(t)}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <nav className="bb-dossier__tabs" aria-label="Record sections">
        {TAB_ORDER.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`bb-dossier__tab${tab === key ? ' bb-dossier__tab--active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tabBody}

      <section className="bb-dossier__section">
        <h2 className="bb-dossier__section-title">Timeline</h2>
        {!timeline.length ? (
          <p className="bb-dossier__muted">No timeline entries.</p>
        ) : (
          <ul className="bb-dossier__timeline">
            {timeline.map((e, i) => (
              <li key={i} className="bb-dossier__timeline-row">
                <span className="bb-dossier__year">{e.year}</span>
                <span
                  className={severityDotClass(e.severity)}
                  title={String(e.severity || 'moderate')}
                  aria-hidden
                />
                <span className="bb-dossier__event">
                  {typeof e.event === 'string' ? e.event : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ci ? (
        <section className="bb-dossier__interpretive bb-dossier__interpretive--tier2" aria-label="Background">
          <p className="bb-dossier__interpretive-kicker bb-dossier__interpretive-kicker--tier2">Background</p>
          <p className="bb-dossier__interpretive-note">
            Contextual framing; not counted as formal enforcement actions.
          </p>
          <section className="bb-dossier__section bb-dossier__section--interpretive-inner">
            <h2 className="bb-dossier__section-title bb-dossier__section-title--interpretive">Community impact</h2>
            {ci.displacement ? (
              <div className="bb-dossier__impact-block">
                <h3 className="bb-dossier__impact-label">Displacement</h3>
                <p>{String(ci.displacement)}</p>
              </div>
            ) : null}
            {ci.price_illusion ? (
              <div className="bb-dossier__impact-block">
                <h3 className="bb-dossier__impact-label">Price illusion</h3>
                <p>{String(ci.price_illusion)}</p>
              </div>
            ) : null}
            {ci.tax_math ? (
              <div className="bb-dossier__impact-block">
                <h3 className="bb-dossier__impact-label">Tax math</h3>
                <p>{String(ci.tax_math)}</p>
              </div>
            ) : null}
            {ci.wealth_velocity ? (
              <div className="bb-dossier__impact-block">
                <h3 className="bb-dossier__impact-label">Wealth velocity</h3>
                <p>{String(ci.wealth_velocity)}</p>
              </div>
            ) : null}
          </section>
        </section>
      ) : null}

      {theGap || whoBen.length || whoPaid.length ? (
        <section
          className="bb-dossier__interpretive bb-dossier__interpretive--tier3"
          aria-label="Analysis — not a finding"
        >
          <p className="bb-dossier__interpretive-kicker bb-dossier__interpretive-kicker--tier3">
            Analysis — not a finding
          </p>
          <p className="bb-dossier__interpretive-note bb-dossier__interpretive-note--tier3">
            Distributional and narrative claims without a single mapped enforcement docket; excluded from action
            counts.
          </p>
          <section className="bb-dossier__gap bb-dossier__gap--interpretive-inner" aria-label="The gap">
            <h2 className="bb-dossier__gap-title bb-dossier__gap-title--interpretive">The gap</h2>
            {theGap ? <p className="bb-dossier__gap-body bb-dossier__gap-body--interpretive">{theGap}</p> : null}
            {whoBen.length || whoPaid.length ? (
              <div className="bb-dossier__gap-cost">
                {whoBen.length ? (
                  <div>
                    <h3 className="bb-dossier__mini-label bb-dossier__mini-label--interpretive">Who benefited</h3>
                    <ul className="bb-dossier__who bb-dossier__who--interpretive">
                      {whoBen.map((row, i) =>
                        row && typeof row === 'object' ? (
                          <li key={i}>
                            <strong>{String(row.group || '')}</strong>
                            {row.how ? ` — ${String(row.how)}` : ''}
                          </li>
                        ) : null
                      )}
                    </ul>
                  </div>
                ) : null}
                {whoPaid.length ? (
                  <div style={{ marginTop: whoBen.length ? 16 : 0 }}>
                    <h3 className="bb-dossier__mini-label bb-dossier__mini-label--interpretive">Who paid</h3>
                    <ul className="bb-dossier__who bb-dossier__who--interpretive">
                      {whoPaid.map((row, i) =>
                        row && typeof row === 'object' ? (
                          <li key={i}>
                            <strong>{String(row.group || '')}</strong>
                            {row.how ? ` — ${String(row.how)}` : ''}
                          </li>
                        ) : null
                      )}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </section>
      ) : null}

      {cheaper.length || healthier.length || diy.length ? (
        <section className="bb-dossier__section">
          <h2 className="bb-dossier__section-title">Alternatives</h2>
          <div className="bb-dossier__alt-grid">
            <div>
              <h3 className="bb-dossier__mini-label">Cheaper</h3>
              <ul>
                {cheaper.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="bb-dossier__mini-label">Healthier</h3>
              <ul>
                {healthier.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="bb-dossier__mini-label">DIY</h3>
              <ul>
                {diy.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {typeof onNavigate === 'function' && (prev || next) ? (
        <footer className="bb-dossier__nav-footer">
          {prev ? (
            <button
              type="button"
              className="bb-dossier__adj"
              onClick={() => onNavigate(prev.slug)}
            >
              <span className="bb-dossier__adj-arrow">←</span> Previous
              <span className="bb-dossier__adj-name">{prev.name}</span>
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button
              type="button"
              className="bb-dossier__adj bb-dossier__adj--next"
              onClick={() => onNavigate(next.slug)}
            >
              Next <span className="bb-dossier__adj-arrow">→</span>
              <span className="bb-dossier__adj-name">{next.name}</span>
            </button>
          ) : (
            <span />
          )}
        </footer>
      ) : null}
    </article>
  );
}
