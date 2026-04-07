import { useCallback, useEffect, useRef, useState } from 'react';
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
import ResearchNarrative from './components/ResearchNarrative.jsx';
import ShareCard from './components/ShareCard.jsx';
import WitnessRegistry from './components/WitnessRegistry.jsx';
import WorkerProfilePage from './components/WorkerProfilePage.jsx';
import ConfidenceBadge from './components/ConfidenceBadge.jsx';
import InvestigationCard, { NoRecordCompactModule } from './components/InvestigationCard.jsx';
import { persistLocation, readCachedLocation, readUserCityState } from './services/location.js';
import CommunityImpact from './components/CommunityImpact.jsx';
import { useTapAnalysis } from './hooks/useTapAnalysis.js';
import {
  getInvestigationRecordPresentation,
  getConfidenceBadgePresentation,
} from './utils/investigationConfidence.js';
import { haptic } from './utils/haptics.js';
import { playReveal } from './utils/sounds.js';
import { slugifyBrandName } from './utils/brandSlug.js';
import LocalDocumentary from './components/LocalDocumentary.jsx';
import LocationCitySheet from './components/LocationCitySheet.jsx';
import DirectoryPage from './pages/DirectoryPage.jsx';
import ImpactPublicPage from './pages/ImpactPublicPage.jsx';
import Library from './pages/Library.jsx';
import ImpactOutcomePrompt from './components/ImpactOutcomePrompt.jsx';
import { getImpactConsentOutcome } from './lib/impactConsent.js';
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
  if (n >= 0.85) return 'High confidence';
  if (n >= 0.6) return 'Medium — verify if unsure';
  return 'Low — verify';
}

/** True when investigation + capture should show the side-by-side editorial Coca-Cola strip in the card. */
function isCocaColaContext(id, investigation) {
  const slug =
    investigation && typeof investigation.brand_slug === 'string'
      ? investigation.brand_slug.toLowerCase().trim()
      : '';
  if (slug === 'coca-cola' || slug.includes('coca-cola')) return true;
  const blob = [
    id?.brand,
    id?.object,
    id?.corporate_parent,
    investigation?.brand,
    investigation?.generated_headline,
  ]
    .map((x) => String(x || '').toLowerCase())
    .join(' ');
  return (
    blob.includes('coca-cola') || blob.includes('coca cola') || /\bcoca[-\s]?cola\b/.test(blob)
  );
}

function TapRateLimitFullScreen({ message, onOpenBlackBook, onHome }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0f1520',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28,
          letterSpacing: 3,
          color: '#f0e8d0',
          marginBottom: 24,
        }}
      >
        ETHICALALT
      </div>
      <div style={{ width: 40, height: 1, background: '#f0a820', margin: '0 auto 24px' }} />
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(24px, 4vw, 40px)',
          letterSpacing: 2,
          color: '#f0a820',
          maxWidth: 340,
          marginBottom: 16,
        }}
      >
        DAILY LIMIT REACHED
      </div>
      <div
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 18,
          color: '#a8c4d8',
          lineHeight: 1.7,
          maxWidth: 340,
          marginBottom: 32,
        }}
      >
        {message}
      </div>
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          letterSpacing: 2,
          color: '#6a8a9a',
          marginBottom: 24,
          textTransform: 'uppercase',
        }}
      >
        Or search documented profiles in the Black Book
      </div>
      <button
        type="button"
        data-no-disintegrate
        onClick={onOpenBlackBook}
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          background: '#f0a820',
          color: '#0f1520',
          border: 'none',
          padding: '14px 32px',
          borderRadius: 2,
          cursor: 'pointer',
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Open Black Book →
      </button>
      <button
        type="button"
        data-no-disintegrate
        onClick={onHome}
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
          background: 'transparent',
          color: '#6a8a9a',
          border: '1px solid #2a3f52',
          padding: '10px 24px',
          borderRadius: 2,
          cursor: 'pointer',
        }}
      >
        Back to home
      </button>
    </div>
  );
}

export default function App() {
  /** home — feed; snap — photo tap (Quick); deep — typed investigation (rabbit hole); history — saved taps; witnesses — civic registry */
  const [mode, setMode] = useState('home');
  const [witnessReturnMode, setWitnessReturnMode] = useState('home');
  const [workerProfileSlug, setWorkerProfileSlug] = useState(/** @type {string | null} */ (null));
  const [hireDirectShareFootnote, setHireDirectShareFootnote] = useState('');

  const {
    image,
    loading,
    result,
    error,
    setError,
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

  const outcomeScheduleRef = useRef(null);
  const [outcomePrompt, setOutcomePrompt] = useState(/** @type {{ tapKey: number } | null} */ (null));

  const investigateByBrandNav = useCallback(
    async (brand) => {
      outcomeScheduleRef.current = null;
      await investigateByBrand(brand);
    },
    [investigateByBrand]
  );

  const resetSession = useCallback(() => {
    if (result?.investigation && getImpactConsentOutcome()) {
      outcomeScheduleRef.current = tapSession;
    } else {
      outcomeScheduleRef.current = null;
    }
    reset();
  }, [result?.investigation, tapSession, reset]);

  useEffect(() => {
    if (result != null) return;
    const k = outcomeScheduleRef.current;
    outcomeScheduleRef.current = null;
    if (k == null) return;
    try {
      if (sessionStorage.getItem(`ea_outcome_done_${k}`)) return;
    } catch {
      /* ignore */
    }
    if (!getImpactConsentOutcome()) return;
    setOutcomePrompt({ tapKey: k });
  }, [result]);

  const [showShare, setShowShare] = useState(false);
  const [researchNarrativeOn, setResearchNarrativeOn] = useState(false);

  /** Local documentary overlay during async investigation */
  const [docRun, setDocRun] = useState(null);
  const [deepBrand, setDeepBrand] = useState(null);
  const [cityGateOpen, setCityGateOpen] = useState(false);
  const [cityGateChecked, setCityGateChecked] = useState(false);

  const releaseDocumentary = useCallback(() => setDocRun(null), []);

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openWitnessRegistry = useCallback(() => {
    setWitnessReturnMode(mode);
    try {
      window.history.pushState({}, '', '/witnesses');
    } catch {
      /* ignore */
    }
    setMode('witnesses');
  }, [mode]);

  const openWorkerProfile = useCallback((slug) => {
    const s = String(slug || '').trim();
    if (!s) return;
    setWorkerProfileSlug(s);
    try {
      window.history.pushState({}, '', `/workers/${encodeURIComponent(s)}`);
    } catch {
      /* ignore */
    }
    setMode('worker-profile');
  }, []);

  const closeWorkerProfile = useCallback(() => {
    setWorkerProfileSlug(null);
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      /* ignore */
    }
    setMode('home');
  }, []);

  useEffect(() => {
    const syncPath = () => {
      const path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
      if (path === '/witnesses') {
        setWitnessReturnMode('home');
        setMode('witnesses');
        return;
      }
      const wm = path.match(/^\/workers\/([^/]+)$/);
      if (wm) {
        setWorkerProfileSlug(decodeURIComponent(wm[1]));
        setMode('worker-profile');
        return;
      }
      if (path === '/directory') {
        setWorkerProfileSlug(null);
        setMode('directory');
        return;
      }
      if (path === '/impact') {
        setWorkerProfileSlug(null);
        setMode('impact');
        return;
      }
      if (/^\/library(?:\/[^/]+)?$/.test(path)) {
        setWorkerProfileSlug(null);
        setMode('library');
        return;
      }
      const prof = path.match(/^\/profile\/([^/]+)$/);
      if (prof) {
        setWorkerProfileSlug(null);
        const slug = decodeURIComponent(prof[1]);
        setDeepBrand(slug);
        setMode('deep');
        void investigateByBrandNav(slug);
        return;
      }
      setWorkerProfileSlug(null);
      setMode((prev) =>
        prev === 'worker-profile' || prev === 'directory' || prev === 'impact' || prev === 'library'
          ? 'home'
          : prev
      );
    };
    syncPath();
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, [investigateByBrandNav]);

  useEffect(() => {
    const loc = readCachedLocation();
    if (loc?.city) {
      persistLocation(loc);
      setCityGateOpen(false);
    } else {
      try {
        setCityGateOpen(!sessionStorage.getItem('ea_user_city'));
      } catch {
        setCityGateOpen(true);
      }
    }
    setCityGateChecked(true);
  }, []);

  useEffect(() => {
    if (mode === 'witnesses' || !cityGateChecked) return;
    const loc = readCachedLocation();
    try {
      if (loc?.city || sessionStorage.getItem('ea_user_city')) setCityGateOpen(false);
    } catch {
      /* ignore */
    }
  }, [mode, cityGateChecked]);

  useEffect(() => {
    if (mode !== 'snap') return;
    if (result?.research_loading && !result?.investigation) {
      const id = result.identification;
      const brand =
        (id?.brand && String(id.brand).trim()) ||
        (id?.corporate_parent && String(id.corporate_parent).trim()) ||
        (id?.object && String(id.object).trim()) ||
        'Unknown';
      setDocRun({
        key: `tap-${tapSession}-${brand}`,
        brandName: brand,
        brandSlug: slugifyBrandName(brand),
      });
    }
  }, [mode, result?.research_loading, result?.investigation, result?.identification, tapSession]);

  useEffect(() => {
    if (mode !== 'deep') return;
    if (loading && deepBrand) {
      setDocRun({
        key: `deep-${tapSession}-${deepBrand}`,
        brandName: deepBrand,
        brandSlug: slugifyBrandName(deepBrand),
      });
    }
  }, [mode, loading, deepBrand, tapSession]);

  useEffect(() => {
    if (result && result.research_loading === false && !result.investigation && docRun) {
      setDocRun(null);
    }
  }, [result?.research_loading, result?.investigation, result, docRun]);

  useEffect(() => {
    if (mode === 'deep' && error && !loading) {
      setDocRun(null);
      setDeepBrand(null);
    }
  }, [mode, error, loading]);

  useEffect(() => {
    if (mode === 'home' && !loading) {
      setDocRun(null);
      setDeepBrand(null);
    }
  }, [mode, loading]);

  useEffect(() => {
    if (!result) setShowShare(false);
  }, [result]);

  useEffect(() => {
    setHireDirectShareFootnote('');
  }, [tapSession]);

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
    if (result == null) setResearchNarrativeOn(false);
  }, [result]);

  useEffect(() => {
    if (!result?.research_loading) return undefined;
    const timer = window.setTimeout(() => {
      const loc = readCachedLocation();
      if (loc?.city) setResearchNarrativeOn(true);
    }, 1500);
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
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      /* ignore */
    }
    resetSession();
    setMode('home');
  };

  const researchBackdropLoc = researchNarrativeOn ? readCachedLocation() : null;

  if (mode === 'library') {
    return (
      <div className="app">
        <Library
          onBack={() => {
            try {
              window.history.replaceState({}, '', '/');
            } catch {
              /* ignore */
            }
            setMode('home');
          }}
        />
      </div>
    );
  }

  if (mode === 'impact') {
    return (
      <div className="app">
        <ImpactPublicPage
          onBack={() => {
            try {
              window.history.replaceState({}, '', '/');
            } catch {
              /* ignore */
            }
            setMode('home');
          }}
        />
      </div>
    );
  }

  if (mode === 'worker-profile' && workerProfileSlug) {
    return (
      <>
        {false && (
          <div className="app">
            <WorkerProfilePage slug={workerProfileSlug} onBack={closeWorkerProfile} />
          </div>
        )}
      </>
    );
  }

  if (mode === 'witnesses') {
    return (
      <>
        {false && (
          <div className="app">
            <WitnessRegistry
              onBack={() => {
                try {
                  window.history.replaceState({}, '', '/');
                } catch {
                  /* ignore */
                }
                setMode(witnessReturnMode);
              }}
            />
          </div>
        )}
      </>
    );
  }

  if (mode === 'directory') {
    return (
      <div className="app">
        <DirectoryPage
          setMode={setMode}
          investigateByBrand={async (slug) => {
            const s = String(slug || '').trim();
            if (!s) return;
            setDeepBrand(s);
            await investigateByBrandNav(s);
          }}
        />
      </div>
    );
  }

  if (mode === 'home') {
    return (
      <div className="app app--home">
        <HomeScreen
          onStartSnap={() => {
            resetSession();
            setMode('snap');
          }}
          onOpenHistory={() => setMode('history')}
          onOpenWitnesses={() => {}}
          onOpenWorkerProfile={() => {}}
          onOpenDirectory={() => {
            try {
              window.history.pushState({}, '', '/directory');
            } catch {
              /* ignore */
            }
            setMode('directory');
          }}
          onSearchInvestigate={async (q) => {
            const trimmed = String(q || '').trim();
            setDeepBrand(trimmed);
            resetSession();
            setMode('deep');
            await investigateByBrandNav(trimmed);
          }}
          onOpenImpact={() => {
            try {
              window.history.pushState({}, '', '/impact');
            } catch {
              /* ignore */
            }
            setMode('impact');
          }}
          onOpenLibrary={() => {
            try {
              window.history.pushState({}, '', '/library');
            } catch {
              /* ignore */
            }
            setMode('library');
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
  const showResearchBanner = Boolean(result?.research_loading) && !docRun;

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

  const investigationCapturePair =
    mode === 'snap' &&
    Boolean(result?.investigation) &&
    Boolean(dataUrl) &&
    isCocaColaContext(id, result.investigation);

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
              if (b) void investigateByBrandNav(b);
            }}
          />
        ) : null}

        <HealthCallout investigation={result.investigation} />
        {result.investigation ? (
          <div
            key={`investigation-${tapSession}`}
            className="app__investigation-wrap investigation-card-enter"
          >
            {result.rate_limited ? (
              <div
                style={{
                  marginBottom: 12,
                  padding: '12px 14px',
                  borderRadius: 4,
                  border: '1px solid rgba(240,168,32,0.35)',
                  background: 'rgba(22,32,48,0.85)',
                }}
              >
                <p
                  style={{
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: 15,
                    color: '#a8c4d8',
                    margin: '0 0 10px',
                    lineHeight: 1.5,
                  }}
                >
                  {result.rate_limit_message ||
                    'You have used your 5 free investigations for today. Come back tomorrow.'}
                </p>
                <button
                  type="button"
                  data-no-disintegrate
                  onClick={() => {
                    try {
                      window.history.pushState({}, '', '/library');
                    } catch {
                      /* ignore */
                    }
                    setMode('library');
                  }}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    background: '#f0a820',
                    color: '#0f1520',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Open Black Book →
                </button>
              </div>
            ) : null}
            {result.low_confidence_warning ? (
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 1.5,
                  color: '#d4a574',
                  background: 'rgba(212,165,116,0.1)',
                  border: '1px solid rgba(212,165,116,0.3)',
                  borderRadius: 2,
                  padding: '8px 12px',
                  margin: '0 0 12px',
                  textTransform: 'uppercase',
                }}
              >
                Low confidence identification — results may be inaccurate. Tap again for a clearer shot.
              </div>
            ) : null}
            <InvestigationCard
              investigation={result.investigation}
              identification={id}
              result={result}
              recordPresentation={recordPresentation}
              headline={investigationHeadline(id, result.investigation)}
              userCaptureSrc={investigationCapturePair ? dataUrl : null}
              referenceImageSrc={
                investigationCapturePair ? '/references/coca-cola-whats-inside.png' : null
              }
              tapPositionNormalized={
                investigationCapturePair &&
                tapPosition &&
                typeof tapPosition.x === 'number' &&
                typeof tapPosition.y === 'number'
                  ? { x: tapPosition.x, y: tapPosition.y }
                  : null
              }
              onHireDirectShareFootnote={false ? setHireDirectShareFootnote : undefined}
              onWrongBrand={() => {
                resetSession();
                setMode('snap');
              }}
              onShare={() => {
                haptic('confirm');
                setShowShare(true);
              }}
              onRunLiveInvestigation={() => {
                const b =
                  id && typeof id.brand === 'string' && id.brand.trim()
                    ? id.brand.trim()
                    : '';
                if (b) void investigateByBrandNav(b);
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
          <button type="button" className="app__btn app__btn--ghost" onClick={() => resetSession()}>
            New photo
          </button>
        </div>
      </>
    ) : null;

  const tapPhotoToolbarMinimal =
    image && result ? (
      <div className="app__toolbar">
        <button type="button" className="app__btn app__btn--ghost" onClick={() => resetSession()}>
          New photo
        </button>
      </div>
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
        {isDesktop ? (
          <div className="app__results-grid app__results-grid--tap">
            <aside className="app__results-sidebar app__results-sidebar--tap" aria-label="Alternatives">
              <div className="app__results-sidebar-head">
                {investigationCapturePair ? tapPhotoToolbarMinimal : tapPhotoToolbar}
              </div>
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
            {!investigationCapturePair ? (
              <div className="app__results-top">{tapPhotoToolbar}</div>
            ) : (
              <div className="app__results-top app__results-top--minimal">{tapPhotoToolbarMinimal}</div>
            )}
            <div className="app__results-main app__results-main--stacked">{identificationBlock}</div>
            {alternativesAside}
          </div>
        )}
      </div>
    ) : null;

  const showResultsNav = Boolean(
    (mode === 'snap' && image && result) || (mode === 'deep' && result?.investigation)
  );

  const docLoc = readUserCityState();
  const docFallback = readCachedLocation();
  const documentaryCity = docLoc.city || docFallback?.city || 'your area';
  const documentaryState = docLoc.state || docFallback?.state || '';

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
        {mode === 'deep' && loading && !docRun ? (
          <div className="app__panel app__loader-panel" role="status" aria-busy="true">
            <p className="app__text-loader">Researching...</p>
          </div>
        ) : null}

        {mode === 'deep' && error && !result ? (
          <div className="app__panel">
            {typeof error === 'string' && error.startsWith('RATE_LIMITED:') ? (
              <TapRateLimitFullScreen
                message={error.replace('RATE_LIMITED:', '')}
                onOpenBlackBook={() => {
                  setError(null);
                  try {
                    window.history.pushState({}, '', '/library');
                  } catch {
                    /* ignore */
                  }
                  setMode('library');
                }}
                onHome={() => {
                  setError(null);
                  resetSession();
                  setMode('home');
                }}
              />
            ) : (
              <ErrorState message={error} onRetry={goHome} />
            )}
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
              typeof error === 'string' && error.startsWith('RATE_LIMITED:') ? (
                <TapRateLimitFullScreen
                  message={error.replace('RATE_LIMITED:', '')}
                  onOpenBlackBook={() => {
                    setError(null);
                    try {
                      window.history.pushState({}, '', '/library');
                    } catch {
                      /* ignore */
                    }
                    setMode('library');
                  }}
                  onHome={() => {
                    setError(null);
                    resetSession();
                    setMode('home');
                  }}
                />
              ) : (
                <ErrorState message={error} onRetry={() => clearResult()} />
              )
            ) : null}
            <div className="app__toolbar">
              <button type="button" className="app__btn app__btn--ghost" onClick={() => resetSession()}>
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
              typeof error === 'string' && error.startsWith('RATE_LIMITED:') ? (
                <TapRateLimitFullScreen
                  message={error.replace('RATE_LIMITED:', '')}
                  onOpenBlackBook={() => {
                    setError(null);
                    try {
                      window.history.pushState({}, '', '/library');
                    } catch {
                      /* ignore */
                    }
                    setMode('library');
                  }}
                  onHome={() => {
                    setError(null);
                    resetSession();
                    setMode('home');
                  }}
                />
              ) : (
                <ErrorState message={error} onRetry={() => cancelPendingConfirmation()} />
              )
            ) : null}
            <div className="app__toolbar">
              <button type="button" className="app__btn app__btn--ghost" onClick={() => resetSession()}>
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
              <button type="button" className="app__btn app__btn--ghost" onClick={() => resetSession()}>
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
          hireDirectShareFooter={false ? hireDirectShareFootnote : undefined}
          onClose={() => setShowShare(false)}
        />
      ) : null}

      {cityGateChecked && cityGateOpen && mode !== 'witnesses' ? (
        <LocationCitySheet
          onResolved={() => {
            setCityGateOpen(false);
          }}
        />
      ) : null}

      {docRun && (mode === 'snap' || mode === 'deep') ? (
        <LocalDocumentary
          runKey={docRun.key}
          city={documentaryCity}
          state={documentaryState}
          brandName={docRun.brandName}
          brandSlug={docRun.brandSlug}
          investigationReady={
            mode === 'deep' ? !loading && Boolean(result?.investigation) : Boolean(result?.investigation)
          }
          onRelease={releaseDocumentary}
        />
      ) : null}

      {researchNarrativeOn && researchBackdropLoc?.city ? (
        <ResearchNarrative
          city={researchBackdropLoc.city}
          state={researchBackdropLoc.state ?? null}
          reportReady={!result?.research_loading}
          onSkip={() => setResearchNarrativeOn(false)}
        />
      ) : null}

      {showResultsNav ? (
        <>
          <button
            type="button"
            className="app__fab-scan"
            aria-label="New scan"
            onClick={() => {
              resetSession();
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
                resetSession();
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
                resetSession();
                setMode('home');
              }}
            >
              <span className="app__bottom-nav__icon" aria-hidden>
                ⌖
              </span>
              <span className="app__bottom-nav__label">Local</span>
            </button>
            {false && (
              <button type="button" className="app__bottom-nav__item" onClick={openWitnessRegistry}>
                <span className="app__bottom-nav__icon" aria-hidden>
                  ✧
                </span>
                <span className="app__bottom-nav__label">Registry</span>
              </button>
            )}
          </nav>
        </>
      ) : null}

      {outcomePrompt ? (
        <ImpactOutcomePrompt
          tapKey={outcomePrompt.tapKey}
          onDone={() => setOutcomePrompt(null)}
        />
      ) : null}
    </div>
  );
}
