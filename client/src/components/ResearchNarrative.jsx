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
  const shellRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));

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
        .research-narrative__dot {
          animation: researchNarrativePulse 1.4s ease-in-out infinite;
        }
        .research-narrative__shell {
          position: fixed;
          inset: 0;
          z-index: 7500;
          box-sizing: border-box;
          background-color: #0f1520;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          min-height: 100dvh;
          overflow: hidden;
          pointer-events: auto;
        }
        .research-narrative__main {
          flex: 1 1 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        .research-narrative__col-left {
          flex: 1 1 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .research-narrative__scroll {
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
          box-sizing: border-box;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }
        .research-narrative__col-right {
          display: none;
          box-sizing: border-box;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px 28px;
          border-left: 1px solid #2a3f52;
          background: rgba(15, 21, 32, 0.96);
        }
        .research-narrative__body-loading {
          flex: 1 1 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0 20px 32px;
          box-sizing: border-box;
        }
        .research-narrative__footer {
          flex-shrink: 0;
          position: sticky;
          bottom: 0;
          width: 100%;
          padding: 16px 24px;
          padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
          border-top: 1px solid #2a3f52;
          background-color: #0f1520;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 10px;
          min-height: 64px;
        }
        .research-narrative__footer-note {
          margin: 0;
          font-family: 'Space Mono', monospace;
          font-size: 8px;
          letter-spacing: 1.5px;
          color: #5a7a8a;
          text-transform: uppercase;
          text-align: center;
          line-height: 1.4;
          max-width: 280px;
        }
        .research-narrative__cta {
          font-family: 'Space Mono', monospace;
          letter-spacing: 2px;
          background: #f0a820;
          color: #0f1520;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          font-weight: 700;
          text-transform: uppercase;
        }
        .research-narrative__cta--mobile {
          font-size: 11px;
          padding: 14px 32px;
        }
        .research-narrative__cta--desktop {
          font-size: 13px;
          padding: 18px 40px;
          min-width: 260px;
        }
        .research-narrative__cta:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .research-narrative__waiting-name {
          animation: researchNarrativePulse 2s ease-in-out infinite;
        }
        .research-narrative__ellipsis-dots::after {
          content: '…';
          display: inline-block;
          animation: researchNarrativeEllipsis 1.2s ease-in-out infinite;
        }
        @media (min-width: 769px) {
          .research-narrative__main {
            flex-direction: row;
            align-items: stretch;
          }
          .research-narrative__col-left {
            flex: 0 0 60%;
            width: 60%;
            max-width: 60%;
          }
          .research-narrative__col-right {
            display: flex;
            flex: 0 0 40%;
            width: 40%;
            max-width: 40%;
          }
          .research-narrative__footer--mobile-only {
            display: none;
          }
        }
      `}</style>
      <div
        ref={shellRef}
        className="research-narrative__shell"
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
          <div className="research-narrative__body-loading">
            <div
              className="research-narrative__dot"
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#f0a820',
              }}
            />
            <p
              style={{
                marginTop: 20,
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 3,
                color: '#6a8a9a',
                textTransform: 'uppercase',
              }}
            >
              PULLING THE RECORD...
            </p>
          </div>
        ) : (
          <>
            <div className="research-narrative__main">
              <div className="research-narrative__col-left">
                <div
                  ref={scrollRef}
                  className="research-narrative__scroll"
                  style={{
                    padding: '0 20px',
                    scrollbarGutter: 'stable',
                    pointerEvents: 'auto',
                    overscrollBehavior: 'contain',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      maxWidth: 480,
                      margin: '0 auto',
                      paddingTop: 8,
                      paddingBottom: 24,
                      minHeight: 'min(40vh, 280px)',
                    }}
                  >
                    {showSparseNarrative ? (
                      <>
                        <h2
                          className="research-narrative__waiting-name"
                          style={{
                            margin: 0,
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
                          Searching public records
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

              <aside className="research-narrative__col-right" aria-label="Report status">
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
                  className="research-narrative__cta research-narrative__cta--desktop"
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

            <div className="research-narrative__footer research-narrative__footer--mobile-only">
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
                className="research-narrative__cta research-narrative__cta--mobile"
              >
                {reportReady ? 'REPORT READY — ENTER →' : 'PLEASE WAIT…'}
              </button>
              <p className="research-narrative__footer-note">
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
