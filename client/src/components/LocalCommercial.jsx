import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function seedCategory(seed) {
  const s = ((seed % 10) + 10) % 10;
  if (s <= 2) return 'PERSON';
  if (s <= 5) return 'PLACE';
  if (s <= 8) return 'LAND';
  return 'NEAR-EXTINCTION';
}

/** @param {string} raw */
export function parseCityStateInput(raw) {
  const t = String(raw || '').trim();
  if (!t) return { city: '', state: null };
  const i = t.indexOf(',');
  if (i === -1) return { city: t, state: null };
  return {
    city: t.slice(0, i).trim(),
    state: t.slice(i + 1).trim() || null,
  };
}

/**
 * @param {{
 *   city?: string | null;
 *   state?: string | null;
 *   lat?: number | null;
 *   lng?: number | null;
 *   onClose: () => void;
 *   onExploreCity?: (city: string, state: string | null) => void;
 *   autoLoad?: boolean;
 * }} props
 */
export default function LocalCommercial({
  city: propCity,
  state: propState,
  lat: propLat,
  lng: propLng,
  onClose,
  onExploreCity,
  autoLoad = true,
}) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 10));
  const [previewInput, setPreviewInput] = useState('');
  const [override, setOverride] = useState(null);
  const [commercial, setCommercial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showEnd, setShowEnd] = useState(false);
  const [progress, setProgress] = useState(0);
  const [slideEnter, setSlideEnter] = useState(true);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  const effective = useMemo(() => {
    if (override && override.city) {
      return {
        city: override.city,
        state: override.state,
        lat: override.lat ?? propLat ?? null,
        lng: override.lng ?? propLng ?? null,
      };
    }
    return {
      city: propCity || '',
      state: propState ?? null,
      lat: propLat ?? null,
      lng: propLng ?? null,
    };
  }, [override, propCity, propState, propLat, propLng]);

  const slides = commercial?.slides && Array.isArray(commercial.slides) ? commercial.slides : [];
  const totalSlides = slides.length;

  const loadCommercial = useCallback(async () => {
    const c = effective.city?.trim();
    if (!c || !autoLoad) return;
    setLoading(true);
    setFetchErr(null);
    setCommercial(null);
    setCurrentSlide(0);
    setShowEnd(false);
    setProgress(0);
    try {
      const base = apiPrefix();
      const url = base ? `${base}/api/local-commercial` : '/api/local-commercial';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: c,
          state: effective.state || undefined,
          lat: effective.lat ?? undefined,
          lng: effective.lng ?? undefined,
          rotation_seed: seed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setCommercial(data);
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [effective.city, effective.state, effective.lat, effective.lng, seed, autoLoad]);

  useEffect(() => {
    void loadCommercial();
  }, [loadCommercial]);

  useEffect(() => {
    if (commercial?.slides?.length) {
      setCurrentSlide(0);
      setShowEnd(false);
      setProgress(0);
    }
  }, [commercial]);

  useEffect(() => {
    setSlideEnter(false);
    const t = requestAnimationFrame(() => setSlideEnter(true));
    return () => cancelAnimationFrame(t);
  }, [currentSlide]);

  useEffect(() => {
    if (!totalSlides || showEnd || loading || !commercial) {
      setProgress(0);
      return;
    }

    const slideIndex = currentSlide;
    startRef.current = performance.now();
    const duration = 7000;

    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      setProgress(t);
      if (t >= 1) {
        if (slideIndex >= totalSlides - 1) {
          setShowEnd(true);
          setProgress(1);
        } else {
          setCurrentSlide(slideIndex + 1);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [totalSlides, currentSlide, showEnd, loading, commercial]);

  const handlePreviewGo = () => {
    const { city, state } = parseCityStateInput(previewInput);
    if (!city) return;
    setOverride({
      city,
      state,
      lat: propLat ?? null,
      lng: propLng ?? null,
    });
    setSeed(Math.floor(Math.random() * 10));
  };

  const handleDifferentStory = () => {
    setSeed((s) => (s + 1) % 10);
    setShowEnd(false);
    setCurrentSlide(0);
    setProgress(0);
  };

  const cityDisplay = effective.city || '—';
  const stateDisplay = effective.state;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Local documentary commercial"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(8, 12, 20, 0.97)',
        color: '#f0e8d0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid #283648',
          background: '#0a1018',
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#6a8a9a',
          }}
        >
          ETHICALALT · LOCAL COMMERCIAL · {seedCategory(seed)}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: '#a8c4d8',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 10px',
          }}
        >
          ✕ Close
        </button>
      </div>

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid #1e2838',
          background: '#0f1520',
        }}
      >
        <label
          style={{
            flex: '1 1 220px',
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: '#6a8a9a',
            minWidth: 0,
          }}
        >
          <span style={{ display: 'block', marginBottom: 4 }}>Travel preview · City, ST</span>
          <input
            type="text"
            value={previewInput}
            onChange={(e) => setPreviewInput(e.target.value)}
            placeholder="e.g. Tuscola, IL"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#162030',
              border: '1px solid #2a3f52',
              borderRadius: 2,
              padding: '10px 12px',
              fontFamily: "'Crimson Pro', serif",
              fontSize: 16,
              color: '#f0e8d0',
              outline: 'none',
            }}
          />
        </label>
        <button
          type="button"
          onClick={handlePreviewGo}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            background: '#f0a820',
            color: '#0f1520',
            border: 'none',
            padding: '12px 20px',
            borderRadius: 2,
            cursor: 'pointer',
            fontWeight: 700,
            alignSelf: 'flex-end',
          }}
        >
          Go
        </button>
      </div>

      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          padding: '20px 18px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        {loading ? (
          <p
            className="app__text-loader"
            style={{ textAlign: 'center', letterSpacing: 3 }}
            role="status"
            aria-busy="true"
          >
            Building documentary…
          </p>
        ) : null}

        {fetchErr && !commercial ? (
          <p style={{ fontFamily: "'Crimson Pro', serif", color: '#ff8a8a', textAlign: 'center' }}>
            {fetchErr}
          </p>
        ) : null}

        {!loading && commercial && !showEnd && slides[currentSlide] ? (
          <div
            style={{
              maxWidth: 720,
              margin: '0 auto',
              width: '100%',
              opacity: slideEnter ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          >
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#6a8a9a',
                textAlign: 'right',
                marginBottom: 12,
              }}
            >
              {slides[currentSlide].mood || '—'}
            </div>
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 15,
                fontStyle: 'italic',
                color: '#6a8a9a',
                lineHeight: 1.5,
                margin: '0 0 20px',
              }}
            >
              {slides[currentSlide].visual_direction}
            </p>
            <h2
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(32px, 8vw, 72px)',
                letterSpacing: 2,
                lineHeight: 0.95,
                color: '#f0e8d0',
                textTransform: 'uppercase',
                margin: '0 0 20px',
              }}
            >
              {slides[currentSlide].headline}
            </h2>
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 'clamp(18px, 2.5vw, 22px)',
                fontStyle: 'italic',
                color: '#f0a820',
                lineHeight: 1.55,
                margin: '0 0 24px',
              }}
            >
              {slides[currentSlide].voice_line}
            </p>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                letterSpacing: 1,
                color: '#6a8a9a',
                marginBottom: 20,
              }}
            >
              ♪ {slides[currentSlide].music_direction}
            </div>

            <div
              style={{
                height: 4,
                background: '#1e2838',
                borderRadius: 2,
                overflow: 'hidden',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress * 100}%`,
                  background: '#f0a820',
                }}
              />
            </div>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                color: '#6a8a9a',
                textAlign: 'right',
              }}
            >
              {currentSlide + 1}/{totalSlides}
            </div>
          </div>
        ) : null}

        {!loading && commercial && showEnd ? (
          <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
            <h2
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(28px, 6vw, 44px)',
                letterSpacing: 2,
                color: '#f0e8d0',
                textTransform: 'uppercase',
                margin: '0 0 16px',
                lineHeight: 1.05,
              }}
            >
              {commercial.city_tagline || cityDisplay}
            </h2>
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 18,
                color: '#a8c4d8',
                lineHeight: 1.55,
                margin: '0 0 20px',
              }}
            >
              {commercial.visit_reason}
            </p>
            {commercial.honest_note ? (
              <p
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 16,
                  fontStyle: 'italic',
                  color: '#8a9aaa',
                  borderLeft: '3px solid #f0a820',
                  paddingLeft: 14,
                  margin: '0 0 24px',
                  lineHeight: 1.5,
                }}
              >
                {commercial.honest_note}
              </p>
            ) : null}

            {Array.isArray(commercial.current_independents) &&
            commercial.current_independents.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
                {commercial.current_independents.slice(0, 3).map((ind, idx) => (
                  <li
                    key={idx}
                    style={{
                      marginBottom: 16,
                      paddingBottom: 14,
                      borderBottom: '1px solid #243042',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 12,
                        letterSpacing: 1,
                        color: '#f0e8d0',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      {ind.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Crimson Pro', serif",
                        fontSize: 15,
                        color: '#a8c4d8',
                        lineHeight: 1.45,
                      }}
                    >
                      {ind.description}
                    </div>
                    {ind.address ? (
                      <div
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 11,
                          color: '#6a8a9a',
                          marginTop: 6,
                        }}
                      >
                        {ind.address}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {commercial.error ? (
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#8a8040' }}>
                {commercial.error}
              </p>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  onExploreCity?.(cityDisplay, stateDisplay);
                  onClose();
                }}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  background: '#f0a820',
                  color: '#0f1520',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                EXPLORE {cityDisplay.toUpperCase()} →
              </button>
              <button
                type="button"
                onClick={handleDifferentStory}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  background: 'transparent',
                  color: '#f0a820',
                  border: '1px solid #f0a820',
                  padding: '14px 20px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Different Story →
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  background: 'transparent',
                  color: '#6a8a9a',
                  border: '1px solid #344d62',
                  padding: '12px 20px',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
