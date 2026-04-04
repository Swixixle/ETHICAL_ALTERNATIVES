import { useEffect, useState } from 'react';
import PhotoCapture from './components/PhotoCapture.jsx';
import TapOverlay from './components/TapOverlay.jsx';
import ConfirmTap from './components/ConfirmTap.jsx';
import RegionSelectOverlay from './components/RegionSelectOverlay.jsx';
import LoadingState from './components/LoadingState.jsx';
import ErrorState from './components/ErrorState.jsx';
import InvestigationCard from './components/InvestigationCard.jsx';
import HealthCallout from './components/HealthCallout.jsx';
import AlternativesSidebar from './components/AlternativesSidebar.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import ShareCard from './components/ShareCard.jsx';
import { useTapAnalysis } from './hooks/useTapAnalysis.js';
import './App.css';

function confidenceLabel(c) {
  const n = Number(c);
  if (!Number.isFinite(n)) return 'Low — verify';
  if (n >= 0.75) return 'High confidence';
  if (n >= 0.45) return 'Medium';
  return 'Low — verify';
}

/** Honesty layer: how the model identified the tap (see vision identification_method + tiers). */
function IdentificationMethodBadge({ id, tier }) {
  if (tier === 'ambiguous') {
    return <span className="app__method-badge app__method-badge--red">Uncertain — verify</span>;
  }
  const m = id?.identification_method;
  if (m === 'text_search') {
    return <span className="app__method-badge app__method-badge--green">Typed search</span>;
  }
  if (m === 'direct_logo') {
    return <span className="app__method-badge app__method-badge--green">Logo confirmed</span>;
  }
  if (m === 'partial_logo') {
    return <span className="app__method-badge app__method-badge--yellow">Logo inferred</span>;
  }
  if (m === 'product_recognition') {
    return <span className="app__method-badge app__method-badge--green">Product identified</span>;
  }
  if (m === 'scene_inference') {
    return <span className="app__method-badge app__method-badge--orange">Inferred from scene</span>;
  }
  return <span className="app__method-badge app__method-badge--red">Uncertain — verify</span>;
}

export default function App() {
  /** home — feed; snap — photo tap (Quick); deep — typed investigation (rabbit hole) */
  const [mode, setMode] = useState('home');

  const {
    image,
    tapPosition,
    loading,
    result,
    error,
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

  if (mode === 'home') {
    return (
      <div className="app app--home">
        <HomeScreen
          onStartSnap={() => {
            reset();
            setMode('snap');
          }}
          onSearchInvestigate={async (q) => {
            reset();
            setMode('deep');
            await investigateByBrand(q);
          }}
        />
      </div>
    );
  }

  const identificationBlock =
    result ? (
      <div className="app__id-block">
        {id ? (
          <>
            <div className="app__method-row">
              <IdentificationMethodBadge id={id} tier={result.identification_tier} />
              {id.text_based_identification && id.visible_text ? (
                <span className="app__visible-text-note" title={id.visible_text}>
                  From package text
                </span>
              ) : null}
            </div>
            {id.brand && id.corporate_parent ? (
              <p className="app__meta">
                Made by {id.brand} ({id.corporate_parent})
              </p>
            ) : null}
            {!id.brand && id.corporate_parent ? (
              <p className="app__meta">Corporate parent: {id.corporate_parent}</p>
            ) : null}
            <p className="app__meta meta-space" style={{ fontSize: 11, marginTop: 8 }}>
              Match: <span className="app__badge">{confidenceLabel(id.confidence)}</span>
            </p>
            <p className="app__footnote">
              {typeof result.response_ms === 'number' ? `${result.response_ms} ms · ` : ''}
              {Array.isArray(result.searched_sources)
                ? `Sources: ${result.searched_sources.join(', ')}`
                : null}
            </p>
          </>
        ) : null}

        {result.investigation ? (
          <button
            type="button"
            className="app__btn app__btn--share"
            onClick={() => setShowShare(true)}
          >
            Share this record
          </button>
        ) : null}
        <HealthCallout investigation={result.investigation} />
        <InvestigationCard investigation={result.investigation} identification={id} />
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
              fontSize: 10,
              color: 'var(--color-text-dim, #8fa8bc)',
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
        <div className="app__results-top">
          <div className="app__image-shell app__image-shell--compact">
            <img className="app__photo" src={dataUrl} alt="Your capture" />
          </div>
          <div className="app__toolbar">
            <button
              type="button"
              className="app__btn app__btn--ghost"
              onClick={() => clearResult()}
            >
              Try another object
            </button>
            <button type="button" className="app__btn app__btn--ghost" onClick={() => reset()}>
              New photo
            </button>
          </div>
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

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-inner">
          <div>
            <h1 className="app__logo">ETHICALALT</h1>
            <p className="app__tagline">Tap anything · Find independent alternatives</p>
          </div>
          <button type="button" className="app__btn app__btn--ghost app__btn--header" onClick={goHome}>
            ← Home
          </button>
        </div>
      </header>

      <main className="app__main">
        {mode === 'deep' && loading ? (
          <div className="app__panel" style={{ padding: '3rem 1.5rem' }}>
            <LoadingState />
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
            <div className="app__image-shell">
              <img className="app__photo" src={dataUrl} alt="Your capture" />
              <TapOverlay
                key={tapSession}
                onTap={(pos) => analyzeTap(pos.x, pos.y)}
                loading={loading}
                tappedPosition={tapPosition}
              />
            </div>
            {loading ? (
              <div className="app__toolbar">
                <LoadingState />
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
              onConfirm={(cx, cy) => completeRegionSelect(cx, cy)}
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
    </div>
  );
}
