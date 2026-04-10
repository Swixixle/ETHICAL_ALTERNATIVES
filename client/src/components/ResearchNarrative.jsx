import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * @param {{
 *   city: string,
 *   state: string | null,
 *   onSkip: () => void,
 *   reportReady: boolean,
 * }} props
 */
export default function ResearchNarrative({ city, state, onSkip, reportReady }) {
  const [phase, setPhase] = useState(/** @type {'loading' | 'ready'} */ ('loading'));
  const [headline, setHeadline] = useState('');
  const [bodyText, setBodyText] = useState('');
  const shellRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));

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

  /** Desktop: wheel on fixed overlay can chain-scroll #root (e.g. .app__results-main). Capture on shell. */
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
        .research-narrative__dot {
          animation: researchNarrativePulse 1.4s ease-in-out infinite;
        }
        .research-narrative__shell {
          position: fixed;
          inset: 0;
          z-index: 7500;
          box-sizing: border-box;
          background: #0f1520;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          min-height: 0;
          height: 100vh;
          max-height: 100vh;
          height: 100dvh;
          max-height: 100dvh;
          overflow: hidden;
          pointer-events: auto;
        }
        .research-narrative__scroll {
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
          box-sizing: border-box;
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
          padding: 16px 20px calc(16px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid #2a3f52;
          background: #0f1520;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 64px;
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
            <div
              ref={scrollRef}
              className="research-narrative__scroll"
              style={{
                padding: '0 20px',
                overflowY: 'scroll',
                scrollbarGutter: 'stable',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                pointerEvents: 'auto',
                overscrollBehavior: 'contain',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  maxWidth: 400,
                  margin: '0 auto',
                  paddingTop: 8,
                  paddingBottom: 24,
                }}
              >
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
              </div>
            </div>

            <div className="research-narrative__footer">
              {!reportReady ? (
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
                  BUILDING YOUR REPORT...
                </p>
              ) : (
                <button
                  type="button"
                  data-no-disintegrate
                  onClick={onSkip}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 2,
                    background: '#f0a820',
                    color: '#0f1520',
                    border: 'none',
                    padding: '14px 32px',
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  REPORT READY — ENTER →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );

  return createPortal(ui, document.body);
}
