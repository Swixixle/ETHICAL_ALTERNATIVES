import { useEffect, useRef, useState } from 'react';
import PhotoCapture from './components/PhotoCapture.jsx';
import TapOverlay from './components/TapOverlay.jsx';
import ConfirmTap from './components/ConfirmTap.jsx';
import RegionSelectOverlay from './components/RegionSelectOverlay.jsx';
import ErrorState from './components/ErrorState.jsx';
import QuickAlternatives from './components/QuickAlternatives.jsx';
import HealthCallout from './components/HealthCallout.jsx';
import AlternativesSidebar from './components/AlternativesSidebar.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import HistoryScreen from './components/HistoryScreen.jsx';
import LocalCommercial from './components/LocalCommercial.jsx';
import ShareCard from './components/ShareCard.jsx';
import ConfidenceBadge from './components/ConfidenceBadge.jsx';
import InvestigationCard, { NoRecordCompactModule } from './components/InvestigationCard.jsx';
import { readCachedLocation } from './services/location.js';
import CommunityImpact from './components/CommunityImpact.jsx';
import { useTapAnalysis } from './hooks/useTapAnalysis.js';
import {
  getInvestigationRecordPresentation,
  getConfidenceBadgePresentation,
} from './utils/investigationConfidence.js';
import { haptic } from './utils/haptics.js';
import { playReveal } from './utils/sounds.js';
import './App.css';

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

function confidenceLabel(c) {
  const n = Number(c);
  if (!Number.isFinite(n)) return 'Low — verify';
  if (n >= 0.75) return 'High confidence';
  if (n >= 0.45) return 'Medium';
  return 'Low — verify';
}

export default function App() {
  /** home — feed; snap — photo tap (Quick); deep — typed investigation (rabbit hole); history — saved taps */
  const [mode, setMode] = useState('home');

  const {
    image,
    loading,
    result,
    error,
    tapPosition,
    setImage,
    analyzeTap,
    confirmPendingIdentification,
    cancelPendingConfirmation,
    pendingConfirmation,
    regionSelectActive,
    startBackgroundReselect,
    completeRegionSelect,
    cancelRegionSelect,
    reset,
    clearResult,
    captureGeoOnce,
    tapSession,
    selectAlternativeBrand,
    investigateByBrand,
  } = useTapAnalysis();

  const [showShare, setShowShare] = useState(false);
  const [researchCommercialOn, setResearchCommercialOn] = useState(false);

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!result) setShowShare(false);
  }, [result]);

  const investigationShownRef = useRef(false);
  useEffect(() => {
    if (result?.investigation) {
      if (!investigationShownRef.current) {
        playReveal();
        haptic('success');
        investigationShownRef.current = true;
      }
    } else {
      investigationShownRef.current = false;
    }
  }, [result?.investigation]);

  useEffect(() => {
    if (!result?.research_loading) {
      setResearchCommercialOn(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const loc = readCachedLocation();
      if (loc?.city) setResearchCommercialOn(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [result?.research_loading]);

  const dataUrl = image ? `data:image/jpeg;base64,${image}` : null;

  const onImageSelected = (b64) => {
    setImage(b64);
    captureGeoOnce();
  };

  const id = result?.identification;

  const tapPhase =
    image && !result && !pendingConfirmation && !regionSelectActive ? 'tap' : null;

  const goHome = () => {
    reset();
    setMode('home');
  };

  const researchBackdropLoc = researchCommercialOn ? readCachedLocation() : null;

  if (mode === 'home') {
    return (
      <div className="app app--home">
        <HomeScreen
          onStartSnap={() => {
            reset();
            setMode('snap');
          }}
          onOpenHistory={() => setMode('history')}
          onSearchInvestigate={async (q) => {
            reset();
            setMode('deep');
            await investigateByBrand(q);
          }}
        />
      </div>
    );
  }

  if (mode === 'history') {
    return (
      <div className="app app--home">
        <HistoryScreen
          onBack={() => {
            setMode('home');
          }}
        />
      </div>
    );
  }

  const dbPreview = result?.db_preview;
  const dbTags =
    dbPreview && Array.isArray(dbPreview.verdict_tags) ? dbPreview.verdict_tags : [];
  const dbConcern =
    dbPreview && typeof dbPreview.overall_concern_level === 'string'
      ? dbPreview.overall_concern_level
      : null;
  const dbCommunity =
    dbPreview &&
    dbPreview.community_impact &&
    typeof dbPreview.community_impact === 'object' &&
    dbPreview.community_impact !== null
      ? dbPreview.community_impact
      : null;
  const showResearchBanner = Boolean(result?.research_loading);

  const recordPresentation = result
    ? getInvestigationRecordPresentation(id, result.investigation, {
        researchLoading: showResearchBanner,
        searchedSources: result.searched_sources,
      })
    : null;

  const hasAlt =
    result &&
    ((Array.isArray(result.registry_results) && result.registry_results.length > 0) ||
      (Array.isArray(result.local_results) && result.local_results.length > 0));

  const headerBadgePresentation =
    result?.investigation && id
      ? getConfidenceBadgePresentation(result.investigation, id, result)
      : null;

  const identificationBlock =
    result ? (
      <div className="app__id-block app__id-block--results">
        {!result.investigation ? (
          <h2 className="app__headline">{investigationHeadline(id, result.investigation)}</h2>
        ) : null}

        {id && !result.investigation ? (
          <>
            {id.text_based_identification && id.visible_text ? (
              <p className="app__visible-text-note" style={{ marginTop: 0 }} title={id.visible_text}>
                From package text
              </p>
            ) : null}
            {id.object ? (
              <p className="app__meta" style={{ marginTop: 6 }}>
                Object: {id.object}
              </p>
            ) : null}
            {id.brand && id.corporate_parent ? (
              <p className="app__meta">
                Made by {id.brand} ({id.corporate_parent})
              </p>
            ) : null}
            {id.brand && !id.corporate_parent ? (
              <p className="app__meta">Brand: {id.brand}</p>
            ) : null}
            {!id.brand && id.corporate_parent ? (
              <p className="app__meta">Corporate parent: {id.corporate_parent}</p>
            ) : null}
            <p className="app__meta meta-space" style={{ fontSize: 11, marginTop: 8 }}>
              Match: <span className="app__badge">{confidenceLabel(id.confidence)}</span>
            </p>
          </>
        ) : null}

        {((dbConcern && dbConcern.trim()) || dbTags.length > 0) && !result.investigation ? (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              border: 'none',
              borderRadius: 4,
              background: 'rgba(22,32,48,0.72)',
            }}
          >
            {dbConcern && dbConcern.trim() ? (
              <p
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: '#f0a820',
                  margin: '0 0 8px',
                }}
              >
                Database profile · concern: {dbConcern}
              </p>
            ) : null}
            {dbTags.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {dbTags.slice(0, 12).map((t) => (
                  <span
                    key={String(t)}
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      letterSpacing: 0.75,
                      textTransform: 'uppercase',
                      color: '#6aaa8a',
                      border: '1px solid rgba(106,170,138,0.35)',
                      borderRadius: 999,
                      padding: '2px 8px',
                    }}
                  >
                    {String(t).replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {dbCommunity && !result.investigation ? (
          <div style={{ marginTop: 16 }}>
            <CommunityImpact data={dbCommunity} />
          </div>
        ) : null}

        {showResearchBanner ? (
          <p
            className="app__text-loader"
            style={{ marginTop: 16, marginBottom: 4, textAlign: 'left' }}
            role="status"
            aria-busy="true"
          >
            Researching full record…
          </p>
        ) : null}

        {hasAlt ? (
          <QuickAlternatives
            registryResults={result.registry_results}
            localResults={result.local_results}
          />
        ) : null}

        {id &&
        recordPresentation &&
        recordPresentation.variant === 'no_record' &&
        !showResearchBanner ? (
          <NoRecordCompactModule
            onRunLiveInvestigation={() => {
              const b =
                id && typeof id.brand === 'string' && id.brand.trim()
                  ? id.brand.trim()
                  : id && typeof id.object === 'string' && id.object.trim()
                    ? id.object.trim()
                    : '';
              if (b) void investigateByBrand(b);
            }}
          />
        ) : null}

        <HealthCallout investigation={result.investigation} />
        {result.investigation ? (
          <div
            key={`investigation-${tapSession}`}
            className="app__investigation-wrap investigation-card-enter"
          >
            <InvestigationCard
              investigation={result.investigation}
              identification={id}
              result={result}
              recordPresentation={recordPresentation}
              headline={investigationHeadline(id, result.investigation)}
              onShare={() => {
                haptic('confirm');
                setShowShare(true);
              }}
              onRunLiveInvestigation={() => {
                const b =
                  id && typeof id.brand === 'string' && id.brand.trim()
                    ? id.brand.trim()
                    : '';
                if (b) void investigateByBrand(b);
              }}
            />
          </div>
        ) : null}
      </div>
    ) : null;

  const alternativesAside =
    result ? (
      <aside
        className={
          isDesktop ? 'app__results-sidebar' : 'app__results-sidebar app__results-sidebar--stacked'
        }
        aria-label="Alternatives"
      >
        <AlternativesSidebar
          registryResults={result.registry_results}
          localResults={result.local_results}
          etsyResults={result.results}
          identification={id}
          investigation={result.investigation}
        />
      </aside>
    ) : null;

  const tapPhotoToolbar =
    image && result && dataUrl ? (
      <>
        <div className="app__image-shell app__image-shell--compact" style={{ position: 'relative' }}>
          <img className="app__photo" src={dataUrl} alt="Your capture" />
          {tapPosition &&
          typeof tapPosition.x === 'number' &&
          typeof tapPosition.y === 'number' ? (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: `${tapPosition.x * 100}%`,
                top: `${tapPosition.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#f0a820',
                border: '2px solid #0f1520',
                pointerEvents: 'none',
              }}
            />
          ) : null}
        </div>
        <div className="app__toolbar">
          <button type="button" className="app__btn app__btn--ghost" onClick={() => reset()}>
            New photo
          </button>
        </div>
      </>
    ) : null;

  const deepResultsSection =
    mode === 'deep' && result ? (
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
          <button type="button" className="app__btn app__btn--ghost" onClick={goHome}>
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
            Deep investigation · no photo
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
      </div>
    ) : null;

  const tapResultsSection =
    image && result ? (
      <div className="app__results-root">
        {!isDesktop ? <div className="app__results-top">{tapPhotoToolbar}</div> : null}

        {isDesktop ? (
          <div className="app__results-grid app__results-grid--tap">
            <aside className="app__results-sidebar app__results-sidebar--tap" aria-label="Alternatives">
              <div className="app__results-sidebar-head">{tapPhotoToolbar}</div>
              <AlternativesSidebar
                registryResults={result.registry_results}
                localResults={result.local_results}
                etsyResults={result.results}
                identification={id}
                investigation={result.investigation}
              />
            </aside>
            <div className="app__results-main app__results-main--tap-pair">{identificationBlock}</div>
          </div>
        ) : (
          <div className="app__results-stack">
            <div className="app__results-main app__results-main--stacked">{identificationBlock}</div>
            {alternativesAside}
          </div>
        )}
      </div>
    ) : null;

  const showResultsNav = Boolean(
    (mode === 'snap' && image && result) || (mode === 'deep' && result?.investigation)
  );

  return (
    <div className="app">
      <header
        className={`app__header${result?.investigation ? ' app__header--minimal' : ''}`}
      >
        <div
          className={`app__header-inner${result?.investigation ? ' app__header-inner--minimal' : ''}`}
        >
          <div className="app__header-left">
            <button type="button" className="app__logo-wrap" onClick={goHome} title="Home">
              <span className="app__logo">ETHICALALT</span>
            </button>
            {!result?.investigation ? (
              <p className="app__tagline">Tap anything · Find independent alternatives</p>
            ) : null}
          </div>
          {result?.investigation && headerBadgePresentation ? (
            <ConfidenceBadge presentation={headerBadgePresentation} compact />
          ) : (
            <button type="button" className="app__btn app__btn--ghost app__btn--header" onClick={goHome}>
              ← Home
            </button>
          )}
        </div>
      </header>

      <main className={`app__main${showResultsNav ? ' app__main--with-bottom-nav' : ''}`}>
        {mode === 'deep' && loading ? (
          <div className="app__panel app__loader-panel" role="status" aria-busy="true">
            <p className="app__text-loader">Researching...</p>
          </div>
        ) : null}

        {mode === 'deep' && error && !result ? (
          <div className="app__panel">
            <ErrorState message={error} onRetry={goHome} />
          </div>
        ) : null}

        {deepResultsSection}

        {mode === 'snap' && !image ? (
          <div className="app__panel">
            <PhotoCapture onImageSelected={onImageSelected} loading={false} />
          </div>
        ) : null}

        {mode === 'snap' && tapPhase ? (
          <div className="app__panel">
            <div
              className="app__tap-mode-bar"
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
                padding: '0 1rem 12px',
              }}
            >
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted, #6a8a9a)',
                  marginRight: 4,
                }}
              >
                Tap your capture to point at it
              </span>
            </div>
            <div className="app__image-shell" style={{ position: 'relative' }}>
              <TapOverlay
                key={tapSession}
                imageUrl={dataUrl || ''}
                onTap={(x, y) => analyzeTap(x, y, null)}
                marker={loading && tapPosition ? tapPosition : null}
                interactionDisabled={loading}
              />
            </div>
            {loading ? (
              <div className="app__loader-panel" role="status" aria-busy="true">
                <p className="app__text-loader">Analyzing…</p>
              </div>
            ) : null}
            {error ? (
              <ErrorState message={error} onRetry={() => clearResult()} />
            ) : null}
            <div className="app__toolbar">
              <button type="button" className="app__btn app__btn--ghost" onClick={() => reset()}>
                New photo
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'snap' && image && pendingConfirmation && !result ? (
          <div className="app__panel">
            <ConfirmTap
              identification={pendingConfirmation.identification}
              identificationTier={pendingConfirmation.identification_tier}
              loading={loading}
              onConfirm={() => confirmPendingIdentification()}
              onRetap={() => cancelPendingConfirmation()}
              onBackgroundMode={() => startBackgroundReselect()}
              sceneInventory={pendingConfirmation.scene_inventory}
              onSelectAlternativeBrand={selectAlternativeBrand}
            />
            {loading ? (
              <div className="app__loader-panel" role="status" aria-busy="true">
                <p className="app__text-loader">Analyzing...</p>
              </div>
            ) : null}
            {error ? (
              <ErrorState message={error} onRetry={() => cancelPendingConfirmation()} />
            ) : null}
            <div className="app__toolbar">
              <button type="button" className="app__btn app__btn--ghost" onClick={() => reset()}>
                New photo
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'snap' && image && regionSelectActive && !result ? (
          <div className="app__panel">
            <RegionSelectOverlay
              imageSrc={dataUrl}
              onConfirm={(cx, cy, normRect) => completeRegionSelect(cx, cy, normRect)}
              onCancel={() => cancelRegionSelect()}
            />
            <div className="app__toolbar">
              <button type="button" className="app__btn app__btn--ghost" onClick={() => reset()}>
                New photo
              </button>
            </div>
          </div>
        ) : null}

        {tapResultsSection}
      </main>

      {showShare && result?.investigation && id ? (
        <ShareCard
          investigation={result.investigation}
          identification={id}
          onClose={() => setShowShare(false)}
        />
      ) : null}

      {researchCommercialOn && researchBackdropLoc?.city ? (
        <LocalCommercial
          city={researchBackdropLoc.city}
          state={researchBackdropLoc.state ?? null}
          lat={typeof researchBackdropLoc.lat === 'number' ? researchBackdropLoc.lat : null}
          lng={typeof researchBackdropLoc.lng === 'number' ? researchBackdropLoc.lng : null}
          onClose={() => setResearchCommercialOn(false)}
          onExploreCity={() => setResearchCommercialOn(false)}
          autoLoad
        />
      ) : null}

      {showResultsNav ? (
        <>
          <button
            type="button"
            className="app__fab-scan"
            aria-label="New scan"
            onClick={() => {
              reset();
              setMode('snap');
              haptic('tap');
            }}
          />
          <nav className="app__bottom-nav" aria-label="Primary navigation">
            <button
              type="button"
              className="app__bottom-nav__item"
              onClick={() => setMode('history')}
            >
              <span className="app__bottom-nav__icon" aria-hidden>
                ◷
              </span>
              <span className="app__bottom-nav__label">History</span>
            </button>
            <button
              type="button"
              className="app__bottom-nav__item app__bottom-nav__item--scan"
              onClick={() => {
                reset();
                setMode('snap');
                haptic('tap');
              }}
            >
              <span className="app__bottom-nav__icon app__bottom-nav__icon--scan" aria-hidden>
                ◉
              </span>
              <span className="app__bottom-nav__label">Scan</span>
            </button>
            <button
              type="button"
              className="app__bottom-nav__item"
              onClick={() => {
                reset();
                setMode('home');
              }}
            >
              <span className="app__bottom-nav__icon" aria-hidden>
                ⌖
              </span>
              <span className="app__bottom-nav__label">Local</span>
            </button>
          </nav>
        </>
      ) : null}
    </div>
  );
}
