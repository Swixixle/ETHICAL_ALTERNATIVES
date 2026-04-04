import { useState } from 'react';
import './InvestigationCard.css';

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

function flagTone(tag) {
  const t = String(tag).toLowerCase();
  if (/clean|living_wage|bcorp|fair|transparent/.test(t)) return 'investigation-card__flag--pos';
  if (/tax|labor|violation|bribery|corrupt|fraud|criminal|wage|osha|nlrb|epa/.test(t))
    return 'investigation-card__flag--neg';
  return 'investigation-card__flag--neu';
}

function concernTone(level) {
  switch (level) {
    case 'significant':
      return 'investigation-card__concern--high';
    case 'moderate':
      return 'investigation-card__concern--med';
    case 'minor':
      return 'investigation-card__concern--low';
    case 'clean':
      return 'investigation-card__concern--clean';
    default:
      return 'investigation-card__concern--unk';
  }
}

/**
 * @param {{ investigation: Record<string, unknown> }} props
 */
export default function InvestigationCard({ investigation }) {
  const [open, setOpen] = useState({});
  const [expanded, setExpanded] = useState(false);

  if (!investigation) return null;

  const profileType = String(investigation.profile_type || '');
  const concern = investigation.overall_concern_level || 'unknown';
  const flags = Array.isArray(investigation.concern_flags) ? investigation.concern_flags : [];

  const toggle = (key) => {
    setOpen((o) => ({ ...o, [key]: !o[key] }));
  };

  return (
    <section className="investigation-card">
      <button type="button" className="investigation-card__header" onClick={() => setExpanded((e) => !e)}>
        <span className="investigation-card__title">The record</span>
        <span className={`investigation-card__concern ${concernTone(concern)}`}>{String(concern)}</span>
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

          {flags.length ? (
            <div className="investigation-card__flags">
              {flags.map((f) => (
                <span key={f} className={`investigation-card__flag ${flagTone(f)}`}>
                  {f.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          ) : null}

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
              return (
                <div key={s.key} className="investigation-card__section">
                  <button type="button" className="investigation-card__section-head" onClick={() => toggle(s.key)}>
                    <span>{s.title}</span>
                    <span>{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen ? (
                    <div className="investigation-card__section-body">
                      {summary ? <p className="investigation-card__summary">{String(summary)}</p> : null}
                      {Array.isArray(fl) && fl.length ? (
                        <ul className="investigation-card__list">
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
