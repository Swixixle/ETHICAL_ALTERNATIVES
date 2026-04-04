import PhotoCapture from './components/PhotoCapture.jsx';
import TapOverlay from './components/TapOverlay.jsx';
import ConfirmTap from './components/ConfirmTap.jsx';
import RegionSelectOverlay from './components/RegionSelectOverlay.jsx';
import ResultCard from './components/ResultCard.jsx';
import LoadingState from './components/LoadingState.jsx';
import ErrorState from './components/ErrorState.jsx';
import InvestigationCard from './components/InvestigationCard.jsx';
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

function LocalPlaceCard({ place }) {
  return (
    <article className="app__local-card">
      <h4>{place.name}</h4>
      <p>{place.address}</p>
      <p>
        {typeof place.distance_miles === 'number' ? `${place.distance_miles.toFixed(1)} mi` : ''}
      </p>
      {place.website ? (
        <p>
          <a href={place.website} target="_blank" rel="noreferrer">
            Website
          </a>
        </p>
      ) : null}
      <span className="app__local-pill">{place.provenance_label || 'Local Unvetted'}</span>
    </article>
  );
}

export default function App() {
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
  } = useTapAnalysis();

  const dataUrl = image ? `data:image/jpeg;base64,${image}` : null;

  const onImageSelected = (b64) => {
    setImage(b64);
    captureGeoOnce();
  };

  const id = result?.identification;

  const tapPhase =
    image && !result && !pendingConfirmation && !regionSelectActive ? 'tap' : null;

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__logo">ETHICALALT</h1>
        <p className="app__tagline">Tap anything · Find independent alternatives</p>
      </header>

      <main className="app__main">
        {!image ? (
          <div className="app__panel">
            <PhotoCapture onImageSelected={onImageSelected} loading={false} />
          </div>
        ) : null}

        {tapPhase ? (
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

        {image && pendingConfirmation && !result ? (
          <div className="app__panel">
            <ConfirmTap
              identification={pendingConfirmation.identification}
              identificationTier={pendingConfirmation.identification_tier}
              loading={loading}
              onConfirm={() => confirmPendingIdentification()}
              onRetap={() => cancelPendingConfirmation()}
              onBackgroundMode={() => startBackgroundReselect()}
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

        {image && regionSelectActive && !result ? (
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

        {image && result ? (
          <div>
            <div className="app__split app__split--results">
              <div>
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

              <div className="app__id-block">
                {id ? (
                  <>
                    <h2 className="app__headline">{id.object}</h2>
                    <div className="app__method-row">
                      <IdentificationMethodBadge id={id} tier={result.identification_tier} />
                      {id.text_based_identification && id.visible_text ? (
                        <span className="app__visible-text-note" title={id.visible_text}>
                          From package text
                        </span>
                      ) : null}
                    </div>
                    {id.brand ? (
                      <p className="app__meta">
                        Brand detected: <strong>{id.brand}</strong>
                        <span className="app__badge">{confidenceLabel(id.confidence)}</span>
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
                    <p className="app__footnote">
                      {typeof result.response_ms === 'number' ? `${result.response_ms} ms · ` : ''}
                      {Array.isArray(result.searched_sources)
                        ? `Sources: ${result.searched_sources.join(', ')}`
                        : null}
                    </p>
                  </>
                ) : null}

                <InvestigationCard investigation={result.investigation} />
              </div>
            </div>

            <h3 className="app__section-title">Etsy — independent sellers</h3>
            <div className="app__grid">
              {(result.results || []).slice(0, 10).map((r) => (
                <ResultCard key={r.listing_id} result={r} />
              ))}
            </div>

            {Array.isArray(result.local_results) && result.local_results.length ? (
              <>
                <h3 className="app__section-title">Near you (OpenStreetMap)</h3>
                <div className="app__local-grid">
                  {result.local_results.slice(0, 12).map((p) => (
                    <LocalPlaceCard key={p.osm_id} place={p} />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
