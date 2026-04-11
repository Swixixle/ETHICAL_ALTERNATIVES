import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * @param {{
 *   city: string,
 *   state: string | null,
 *   brandName?: string | null,
 *   onSkip: () => void,
 *   reportReady: boolean,
 * }} props
 */
export default function ResearchNarrative({ city, state, brandName, onSkip, reportReady }) {
  const [phase, setPhase] = useState(/** @type {'loading' | 'ready'} */ ('loading'));
  const [headline, setHeadline] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [isWide, setIsWide] = useState(
    () => typeof window !== 'undefined' && window.innerWidth > 768
  );
  const shellRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth > 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const locationHeading = useMemo(() => {
    const c = String(city || '').trim();
    const s = state != null && String(state).trim() ? String(state).trim() : '';
    if (!c) return '';
    return s ? `${c}, ${s}` : c;
  }, [city, state]);

  const primaryHeading = useMemo(() => {
    if (brandName && String(brandName).trim()) return String(brandName).trim();
    return locationHeading;
  }, [brandName, locationHeading]);

  const recordsSearchLabel = useMemo(() => {
    if (brandName && String(brandName).trim()) return String(brandName).trim();
    if (locationHeading) return locationHeading;
    return String(city || '').trim() || 'this company';
  }, [brandName, locationHeading, city]);

  const loadingCityTitle = useMemo(() => {
    const c = String(city || '').trim();
    return c ? c.toUpperCase() : 'YOUR AREA';
  }, [city]);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 4000);

    (async () => {
      try {
        const res = await fetch('/api/city-narrative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city, state }),
          signal: ac.signal,
        });
        if (!res.ok) throw new Error('request failed');
        const data = await res.json();
        if (cancelled) return;
        const h = typeof data.headline === 'string' ? data.headline.trim() : '';
        const b = typeof data.body === 'string' ? data.body.trim() : '';
        if (h && b) {
          setHeadline(h);
          setBodyText(b);
        } else {
          setHeadline(String(city || '').toUpperCase());
          setBodyText('Every place has a story. Every purchase is part of it.');
        }
      } catch {
        if (cancelled) return;
        setHeadline(String(city || '').toUpperCase());
        setBodyText('Every place has a story. Every purchase is part of it.');
      } finally {
        clearTimeout(timer);
      }
      if (!cancelled) setPhase('ready');
    })();

    return () => {
      cancelled = true;
      ac.abort();
      clearTimeout(timer);
    };
  }, [city, state]);

  const showSparseNarrative = phase === 'ready' && bodyText.length < 200;

  /** Desktop: wheel on fixed overlay can chain-scroll #root. Capture on shell; scroll only the narrative column. */
  useEffect(() => {
    if (phase !== 'ready') return;
    const shell = shellRef.current;
    const scrollEl = scrollRef.current;
    if (!shell || !scrollEl) return;
    const onWheel = (e) => {
      if (scrollEl.scrollHeight <= scrollEl.clientHeight) return;
      e.preventDefault();
      e.stopPropagation();
      scrollEl.scrollBy({ top: e.deltaY });
    };
    shell.addEventListener('wheel', onWheel, { passive: false });
    return () => shell.removeEventListener('wheel', onWheel);
  }, [phase]);

  const shellStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 7500,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#0f1520',
    boxSizing: 'border-box',
    minHeight: '100dvh',
    pointerEvents: 'auto',
  };

  const mainStyle = {
    display: 'flex',
    flexDirection: isWide ? 'row' : 'column',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    alignItems: 'stretch',
  };

  const leftColStyle = {
    flex: isWide ? '1 1 60%' : '1 1 0',
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  };

  const rightColStyle = {
    flex: isWide ? '0 0 40%' : '0 0 auto',
    width: isWide ? '40%' : '100%',
    maxWidth: isWide ? '40%' : 'none',
    minWidth: isWide ? 0 : undefined,
    display: isWide ? 'flex' : 'none',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderLeft: isWide ? '1px solid #1a2a3a' : 'none',
    boxSizing: 'border-box',
    background: 'rgba(15, 21, 32, 0.96)',
    textAlign: 'center',
  };

  const scrollAreaStyle = {
    flex: '1 1 0',
    minHeight: 0,
    width: '100%',
    boxSizing: 'border-box',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
    padding: '0 20px',
    scrollbarGutter: 'stable',
    pointerEvents: 'auto',
    overscrollBehavior: 'contain',
  };

  const mobileFooterStyle = {
    flexShrink: 0,
    position: 'sticky',
    bottom: 0,
    width: '100%',
    padding: '16px 24px',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
    borderTop: '1px solid #2a3f52',
    backgroundColor: '#0f1520',
    boxSizing: 'border-box',
    display: isWide ? 'none' : 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    minHeight: 64,
  };

  const ctaBase = {
    fontFamily: "'Space Mono', monospace",
    letterSpacing: '2px',
    background: '#f0a820',
    color: '#0f1520',
    border: 'none',
    borderRadius: 2,
    cursor: 'pointer',
    fontWeight: 700,
    textTransform: 'uppercase',
  };

  const ui = (
    <>
      <style>{`
        @keyframes researchNarrativePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.08); }
        }
        @keyframes researchNarrativeEllipsis {
          0% { opacity: 0.2; }
          50% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        @keyframes researchNarrativeDotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        .research-narrative__dot {
          animation: researchNarrativePulse 1.4s ease-in-out infinite;
        }
        .research-narrative__waiting-name {
          animation: researchNarrativePulse 2s ease-in-out infinite;
        }
        .research-narrative__ellipsis-dots::after {
          content: '…';
          display: inline-block;
          animation: researchNarrativeEllipsis 1.2s ease-in-out infinite;
        }
        .research-narrative__load-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f0a820;
          animation: researchNarrativeDotBounce 1s ease-in-out infinite;
        }
        .research-narrative__load-dot:nth-child(1) { animation-delay: 0s; }
        .research-narrative__load-dot:nth-child(2) { animation-delay: 0.15s; }
        .research-narrative__load-dot:nth-child(3) { animation-delay: 0.3s; }
        .research-narrative__cta:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      `}</style>
      <div
        ref={shellRef}
        style={shellStyle}
        role="dialog"
        aria-modal="true"
        aria-busy={phase === 'loading'}
      >
        <div
          style={{
            flexShrink: 0,
            paddingTop: 28,
            paddingBottom: 8,
            width: '100%',
            textAlign: 'center',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28,
            color: '#f0e8d0',
            letterSpacing: 3,
          }}
        >
          ETHICALALT
        </div>

        {phase === 'loading' ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: '0 20px 24px',
              boxSizing: 'border-box',
            }}
          >
            <h2
              style={{
                margin: 0,
                paddingTop: 'clamp(24px, 6vh, 72px)',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(32px, 6vw, 52px)',
                color: '#f0e8d0',
                letterSpacing: 2,
                textAlign: 'center',
                lineHeight: 1.1,
              }}
            >
              {loadingCityTitle}
            </h2>
            <div
              style={{
                flex: 1,
                minHeight: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} aria-hidden>
                <span className="research-narrative__load-dot" />
                <span className="research-narrative__load-dot" />
                <span className="research-narrative__load-dot" />
              </div>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 17,
                  color: '#a8c4d8',
                  lineHeight: 1.6,
                  textAlign: 'center',
                  maxWidth: 360,
                }}
              >
                Searching public records in real time
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  color: '#6a8a9a',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                PULLING THE RECORD...
              </p>
            </div>
          </div>
        ) : (
          <>
            <div style={mainStyle}>
              <div style={leftColStyle}>
                <div ref={scrollRef} style={scrollAreaStyle}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      maxWidth: 480,
                      margin: '0 auto',
                      paddingTop: 8,
                      paddingBottom: 24,
                      minHeight: isWide ? 0 : 'min(36vh, 240px)',
                    }}
                  >
                    {showSparseNarrative ? (
                      <>
                        <h2
                          className="research-narrative__waiting-name"
                          style={{
                            margin: 0,
                            paddingTop: isWide ? 0 : 'clamp(8px, 3vh, 32px)',
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: 'clamp(26px, 4vw, 40px)',
                            color: '#f0e8d0',
                            letterSpacing: 2,
                            textAlign: 'center',
                            maxWidth: 400,
                            lineHeight: 1.15,
                          }}
                        >
                          {recordsSearchLabel}
                        </h2>
                        <div
                          style={{
                            marginTop: 28,
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                          }}
                          aria-hidden
                        >
                          <span className="research-narrative__load-dot" />
                          <span className="research-narrative__load-dot" />
                          <span className="research-narrative__load-dot" />
                        </div>
                        <p
                          className="research-narrative__ellipsis-dots"
                          style={{
                            marginTop: 20,
                            fontFamily: "'Crimson Pro', serif",
                            fontSize: 18,
                            color: '#a8c4d8',
                            lineHeight: 1.7,
                            textAlign: 'center',
                            maxWidth: 360,
                            marginBottom: 0,
                          }}
                        >
                          Searching public records in real time
                        </p>
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            width: 40,
                            height: 1,
                            background: '#f0a820',
                            margin: '16px auto',
                          }}
                        />
                        <h2
                          style={{
                            margin: 0,
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: 'clamp(28px, 5vw, 48px)',
                            color: '#f0e8d0',
                            letterSpacing: 2,
                            textAlign: 'center',
                            maxWidth: 360,
                            lineHeight: 1.1,
                          }}
                        >
                          {headline}
                        </h2>
                        <p
                          style={{
                            marginTop: 12,
                            fontFamily: "'Crimson Pro', serif",
                            fontSize: 18,
                            color: '#a8c4d8',
                            lineHeight: 1.7,
                            textAlign: 'center',
                            maxWidth: 340,
                            marginBottom: 0,
                          }}
                        >
                          {bodyText}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <aside style={rightColStyle} aria-label="Report status">
                <h2
                  style={{
                    margin: '0 0 20px',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 'clamp(22px, 2.2vw, 32px)',
                    color: '#f0e8d0',
                    letterSpacing: 2,
                    lineHeight: 1.15,
                    maxWidth: 320,
                  }}
                >
                  {primaryHeading || '—'}
                </h2>
                <p
                  style={{
                    margin: '0 0 24px',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 2,
                    color: reportReady ? '#6aaa8a' : '#f0a820',
                    textTransform: 'uppercase',
                  }}
                >
                  {reportReady ? 'REPORT READY' : 'BUILDING YOUR REPORT...'}
                </p>
                <button
                  type="button"
                  data-no-disintegrate
                  onClick={reportReady ? onSkip : undefined}
                  disabled={!reportReady}
                  className="research-narrative__cta"
                  style={{
                    ...ctaBase,
                    fontSize: 13,
                    padding: '18px 40px',
                    minWidth: 260,
                  }}
                >
                  {reportReady ? 'ENTER REPORT →' : 'PLEASE WAIT…'}
                </button>
                <p
                  style={{
                    margin: '20px 0 0',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 8,
                    letterSpacing: 1.5,
                    color: '#5a7a8a',
                    textTransform: 'uppercase',
                    lineHeight: 1.5,
                    maxWidth: 260,
                  }}
                >
                  LIVE INVESTIGATIONS MAY TAKE UP TO 10 MINUTES
                </p>
              </aside>
            </div>

            <div style={mobileFooterStyle}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  color: '#6a8a9a',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                {reportReady ? 'REPORT READY' : 'BUILDING YOUR REPORT...'}
              </p>
              <button
                type="button"
                data-no-disintegrate
                onClick={reportReady ? onSkip : undefined}
                disabled={!reportReady}
                className="research-narrative__cta"
                style={{
                  ...ctaBase,
                  fontSize: 11,
                  padding: '14px 32px',
                }}
              >
                {reportReady ? 'REPORT READY — ENTER →' : 'PLEASE WAIT…'}
              </button>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 8,
                  letterSpacing: 1.5,
                  color: '#5a7a8a',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  maxWidth: 280,
                }}
              >
                LIVE INVESTIGATIONS MAY TAKE UP TO 10 MINUTES
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );

  return createPortal(ui, document.body);
}
