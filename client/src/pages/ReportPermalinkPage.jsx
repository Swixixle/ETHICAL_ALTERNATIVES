import { useEffect, useMemo, useState } from 'react';
import InvestigationCard from '../components/InvestigationCard.jsx';
import AlternativesSidebar from '../components/AlternativesSidebar.jsx';
import ShareCard from '../components/ShareCard.jsx';
import { getInvestigationRecordPresentation } from '../utils/investigationConfidence.js';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function investigationHeadline(identification, investigation) {
  const id = identification || {};
  const inv = investigation || {};
  const objectFallback =
    typeof id.object === 'string' && id.object ? id.object : String(inv.brand || 'Investigation');
  const generated =
    typeof inv.generated_headline === 'string' && inv.generated_headline.trim()
      ? inv.generated_headline.trim()
      : null;
  return generated || objectFallback;
}

/**
 * @param {{ slug: string; onHome: () => void }} props
 */
export default function ReportPermalinkPage({ slug, onHome }) {
  const [investigation, setInvestigation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const s = String(slug || '').trim();
    if (!s) {
      setLoading(false);
      setError('Invalid report link.');
      return undefined;
    }
    const base = apiPrefix();
    const url = base
      ? `${base}/api/report/${encodeURIComponent(s)}`
      : `/api/report/${encodeURIComponent(s)}`;
    setLoading(true);
    setError(null);
    setInvestigation(null);
    (async () => {
      try {
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error === 'not_found' ? 'No saved report for this company.' : 'Could not load report.');
          setInvestigation(null);
          return;
        }
        setInvestigation(data);
      } catch {
        if (!cancelled) setError('Network error loading report.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const identification = useMemo(() => {
    if (!investigation) return null;
    const brand =
      typeof investigation.brand === 'string' && investigation.brand.trim()
        ? investigation.brand.trim()
        : slug;
    return {
      brand,
      corporate_parent:
        investigation.parent != null && String(investigation.parent).trim()
          ? String(investigation.parent).trim()
          : null,
      object: brand,
      resolved_incumbent_slug:
        typeof investigation.brand_slug === 'string' ? investigation.brand_slug : slug,
      identification_method: 'permalink',
      confidence: 1,
    };
  }, [investigation, slug]);

  const result = useMemo(() => {
    if (!investigation || !identification) return null;
    return {
      identification,
      identification_tier: 'confirmed',
      results: [],
      registry_results: [],
      local_results: [],
      investigation,
      research_loading: false,
      sourcing_complete: true,
      searched_sources: [],
      empty_sources: [],
      version: 'permalink',
      low_confidence_warning: false,
    };
  }, [investigation, identification]);

  const recordPresentation = result
    ? getInvestigationRecordPresentation(identification, investigation, {
        researchLoading: false,
        searchedSources: [],
      })
    : null;

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  );
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (loading) {
    return (
      <div className="app__panel app__loader-panel" role="status" aria-busy="true">
        <p className="app__text-loader">Loading report…</p>
      </div>
    );
  }

  if (error || !result?.investigation) {
    return (
      <div className="app__panel" style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
        <p
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 18,
            color: '#a8c4d8',
            marginBottom: 20,
          }}
        >
          {error || 'Report unavailable.'}
        </p>
        <button type="button" className="app__btn app__btn--ghost" onClick={onHome}>
          ← Home
        </button>
      </div>
    );
  }

  const id = identification;
  const headline = investigationHeadline(id, investigation);

  const identificationBlock = (
    <div className="app__id-block app__id-block--results">
      <InvestigationCard
        investigation={investigation}
        identification={id}
        result={result}
        recordPresentation={recordPresentation}
        headline={headline}
        userCaptureSrc={null}
        referenceImageSrc={null}
        tapPositionNormalized={null}
        onWrongBrand={onHome}
        onShare={() => setShowShare(true)}
        onReportError={() => {}}
        onRunLiveInvestigation={() => {
          try {
            window.location.href = `/profile/${encodeURIComponent(slug)}`;
          } catch {
            onHome();
          }
        }}
      />
    </div>
  );

  const alternativesAside = (
    <aside
      className={
        isDesktop ? 'app__results-sidebar' : 'app__results-sidebar app__results-sidebar--stacked'
      }
      aria-label="Alternatives"
    >
      <AlternativesSidebar
        registryResults={[]}
        localResults={[]}
        etsyResults={[]}
        identification={id}
        investigation={investigation}
      />
    </aside>
  );

  return (
    <div className="app__results-root app__results-root--deep">
      <div
        className="app__deep-toolbar"
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--color-border, #2a3f52)',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button type="button" className="app__btn app__btn--ghost" onClick={onHome}>
          ← Home
        </button>
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: 'var(--color-text-dim, #a8c4d8)',
            letterSpacing: 1,
          }}
        >
          Saved report · {typeof investigation.brand_slug === 'string' ? investigation.brand_slug : slug}
        </span>
      </div>
      {isDesktop ? (
        <div className="app__results-grid">
          {alternativesAside}
          <div className="app__results-main">{identificationBlock}</div>
        </div>
      ) : (
        <div className="app__results-stack">
          <div className="app__results-main app__results-main--stacked">{identificationBlock}</div>
          {alternativesAside}
        </div>
      )}
      {showShare && identification ? (
        <ShareCard
          investigation={investigation}
          identification={identification}
          onClose={() => setShowShare(false)}
        />
      ) : null}
    </div>
  );
}
