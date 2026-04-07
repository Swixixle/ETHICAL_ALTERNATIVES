import { useEffect, useState } from 'react';

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

  return (
    <>
      <style>{`
        @keyframes researchNarrativePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.08); }
        }
        .research-narrative__dot {
          animation: researchNarrativePulse 1.4s ease-in-out infinite;
        }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-busy={phase === 'loading'}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: '#0f1520',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            paddingTop: 28,
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

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '0 20px 32px',
            boxSizing: 'border-box',
          }}
        >
          {phase === 'loading' ? (
            <>
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
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 400 }}>
              <div
                style={{
                  width: 40,
                  height: 1,
                  background: '#f0a820',
                  margin: '24px auto',
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

              <div
                style={{
                  position: 'relative',
                  marginTop: 28,
                  minHeight: 52,
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    transform: 'translateX(-50%)',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 2,
                    color: '#6a8a9a',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    opacity: reportReady ? 0 : 1,
                    transition: 'opacity 0.4s ease',
                    pointerEvents: 'none',
                  }}
                >
                  BUILDING YOUR REPORT...
                </p>
                <button
                  type="button"
                  data-no-disintegrate
                  onClick={onSkip}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    transform: 'translateX(-50%)',
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
                    opacity: reportReady ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                    pointerEvents: reportReady ? 'auto' : 'none',
                  }}
                >
                  REPORT READY — ENTER →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
