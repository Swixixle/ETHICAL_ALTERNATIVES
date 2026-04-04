import { useEffect, useState } from 'react';
import PhotoCapture from './components/PhotoCapture.jsx';
import TapOverlay from './components/TapOverlay.jsx';
import ConfirmTap from './components/ConfirmTap.jsx';
import RegionSelectOverlay from './components/RegionSelectOverlay.jsx';
import EyeGridLoader from './components/EyeGridLoader.jsx';
import ErrorState from './components/ErrorState.jsx';
import InvestigationCard from './components/InvestigationCard.jsx';
import ProofBlock from './components/ProofBlock.jsx';
import QuickAlternatives from './components/QuickAlternatives.jsx';
import HealthCallout from './components/HealthCallout.jsx';
import AlternativesSidebar from './components/AlternativesSidebar.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import ShareCard from './components/ShareCard.jsx';
import { useTapAnalysis } from './hooks/useTapAnalysis.js';
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
  /** home — feed; snap — photo tap (Quick); deep — typed investigation (rabbit hole) */
  const [mode, setMode] = useState('home');

  const {
    image,
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
        <h2 className="app__headline">{investigationHeadline(id, result.investigation)}</h2>

        {result.investigation ? (
          <ProofBlock investigation={result.investigation} identification={id} result={result} />
        ) : null}

        {(Array.isArray(result.registry_results) && result.registry_results.length > 0) ||
        (Array.isArray(result.local_results) && result.local_results.length > 0) ? (
          <QuickAlternatives
            registryResults={result.registry_results}
            localResults={result.local_results}
          />
        ) : null}

        {id ? (
          <>
            {id.text_based_identification && id.visible_text ? (
              <p className="app__visible-text-note" style={{ marginTop: 0 }} title={id.visible_text}>
                From package text
              </p>
            ) : null}
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
            {result.investigation ? null : (
              <p className="app__footnote">
                {typeof result.response_ms === 'number' ? `${result.response_ms} ms · ` : ''}
                {Array.isArray(result.searched_sources)
                  ? `Sources: ${result.searched_sources.join(', ')}`
                  : null}
              </p>
            )}
          </>
        ) : null}

        {result.investigation ? (
          <button
            type="button"
            className="app__btn app__btn--share"
            onClick={() => setShowShare(true)}
          >
            Share This Record
          </button>
        ) : null}
        <HealthCallout investigation={result.investigation} />
        <InvestigationCard
          investigation={result.investigation}
          onShare={result.investigation ? () => setShowShare(true) : undefined}
        />
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
        <div className="app__image-shell app__image-shell--compact">
          <img className="app__photo" src={dataUrl} alt="Your capture" />
        </div>
        <div className="app__toolbar">
          <button type="button" className="app__btn app__btn--ghost" onClick={() => clearResult()}>
            Try another object
          </button>
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
            <EyeGridLoader message="Researching..." />
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
            <div className="app__image-shell">
              <TapOverlay
                key={tapSession}
                imageUrl={dataUrl || ''}
                onTap={(x, y) => analyzeTap(x, y, null)}
              />
            </div>
            {loading ? (
              <div className="app__toolbar">
                <EyeGridLoader message="Analyzing..." />
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
            {loading ? <EyeGridLoader message="Analyzing..." /> : null}
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
    </div>
  );
}
