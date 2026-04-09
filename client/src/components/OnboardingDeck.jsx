import { useCallback, useEffect, useRef, useState } from 'react';
import '../styles/onboardingPress.css';

/** Dark shell (matches app chrome). */
const BG = '#0f1520';

/** @type {const} */
const CARDS = [
  {
    exit: 'shatter',
    primary: '#f0a820',
    bg: BG,
    headline:
      'Point your camera at any product or brand logo to investigate it',
    subtext: '',
  },
  {
    exit: 'explode',
    primary: '#f0a820',
    bg: BG,
    headline: "Scan a barcode to trace what's inside and who owns it",
    subtext: '',
  },
  {
    exit: 'melt',
    primary: '#f0a820',
    bg: BG,
    headline: 'Search any company, brand, or CEO by name',
    subtext: '',
  },
  {
    exit: 'float',
    primary: '#f0a820',
    bg: BG,
    headline: 'Save findings to your Black Book for later',
    subtext: '',
  },
  {
    exit: 'none',
    primary: '#f0a820',
    bg: BG,
    headline: 'No account. No tracking. 5 camera investigations per day.',
    subtext: '',
  },
];

const goldButtonStyle = {
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
  width: '100%',
  maxWidth: 320,
  marginTop: 8,
  boxShadow: '0 0 0 1px rgba(240,168,32,0.35)',
};

/**
 * @param {{ onComplete: () => void; onSkip: () => void; onRequestLocation: () => void }} props
 */
export default function OnboardingDeck({
  onComplete,
  onSkip,
  onRequestLocation = () => {},
}) {
  const [cardIndex, setCardIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const cardWrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const transitioningRef = useRef(false);
  const cardIndexRef = useRef(0);
  const pointerStartRef = useRef(/** @type {{ x: number; y: number } | null} */ (null));

  useEffect(() => {
    cardIndexRef.current = cardIndex;
  }, [cardIndex]);

  const runTransition = useCallback(async (delta) => {
    if (transitioningRef.current) return;
    const i = cardIndexRef.current;
    const next = i + delta;
    if (next < 0 || next >= CARDS.length) return;
    if (i === 4 && delta > 0) return;

    const fromCard = CARDS[i];
    if (delta > 0 && fromCard.exit === 'none') return;

    transitioningRef.current = true;
    setTransitioning(true);

    await new Promise((r) => {
      requestAnimationFrame(() => requestAnimationFrame(r));
    });

    cardIndexRef.current = next;
    setCardIndex(next);

    await new Promise((r) => {
      requestAnimationFrame(() => requestAnimationFrame(r));
    });

    transitioningRef.current = false;
    setTransitioning(false);
  }, []);

  const finishDeck = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const goNext = useCallback(() => {
    if (transitioningRef.current) return;
    if (cardIndexRef.current >= CARDS.length - 1) {
      finishDeck();
      return;
    }
    runTransition(1);
  }, [runTransition, finishDeck]);

  const goPrev = useCallback(() => {
    runTransition(-1);
  }, [runTransition]);

  useEffect(() => {
    function onKey(e) {
      if (transitioningRef.current) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (cardIndexRef.current > 0) goPrev();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  const jumpToSlide = useCallback(
    (i) => {
      if (transitioningRef.current) return;
      if (i < 0 || i >= CARDS.length) return;
      if (i === cardIndexRef.current) return;
      transitioningRef.current = false;
      setTransitioning(false);
      cardIndexRef.current = i;
      setCardIndex(i);
    },
    []
  );

  /** Advance from card tap; ignores clicks that originate on buttons/links. */
  function onCardAreaClick(e) {
    if (transitioningRef.current) return;
    const t = e.target;
    if (t instanceof Element && t.closest('button')) return;
    goNext();
  }

  function onPointerDown(e) {
    if (transitioningRef.current) return;
    // Do not capture swipe when the user interacts with a button (NEXT, SKIP, dots, etc.).
    // Otherwise setPointerCapture on the region breaks click activation on those controls.
    const t = e.target;
    if (t instanceof Element && t.closest('button')) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerUp(e) {
    const t = e.target;
    if (t instanceof Element && t.closest('button')) {
      pointerStartRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!start || transitioningRef.current) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < -50) goNext();
    else if (dx > 50) goPrev();
  }

  const card = CARDS[cardIndex];
  const isLastCard = cardIndex === 4;

  return (
    <div
      role="region"
      aria-label="App introduction"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{
        minHeight: '100vh',
        background: card.bg,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {cardIndex > 0 ? (
        <button
          type="button"
          className="ea-onb-press"
          data-no-disintegrate=""
          aria-label="Previous card"
          disabled={transitioning}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          style={{
            position: 'absolute',
            top: 24,
            left: 20,
            zIndex: 10,
            fontFamily: "'Space Mono', monospace",
            fontSize: 18,
            color: '#f0e8d0',
            opacity: 0.7,
            background: 'none',
            border: 'none',
            cursor: transitioning ? 'default' : 'pointer',
            padding: 8,
          }}
        >
          ←
        </button>
      ) : null}

      {cardIndex < 4 ? (
        <button
          type="button"
          className="ea-onb-press"
          data-no-disintegrate=""
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          style={{
            position: 'absolute',
            top: 24,
            right: 20,
            zIndex: 10,
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 1,
            color: '#6a8a9a',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
          }}
        >
          SKIP
        </button>
      ) : null}

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
        }}
      >
        <div
          ref={cardWrapRef}
          onClick={onCardAreaClick}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 420,
            boxSizing: 'border-box',
            minHeight: 360,
            border: '1px solid #2a3f52',
            padding: '40px 32px',
            background: isLastCard ? '#0f1520' : undefined,
            cursor: transitioning ? 'default' : 'pointer',
          }}
        >
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              minHeight: 240,
              textAlign: isLastCard ? 'center' : 'left',
            }}
          >
            <h1
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 24,
                fontWeight: 600,
                color: '#f0e8d0',
                lineHeight: 1.35,
                margin: '0 0 20px',
                textAlign: isLastCard ? 'center' : 'left',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {card.headline}
            </h1>

            {card.subtext ? (
              <p
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 16,
                  color: '#6a8a9a',
                  lineHeight: 1.6,
                  margin: '0 0 24px',
                  textAlign: isLastCard ? 'center' : 'left',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {card.subtext}
              </p>
            ) : null}

            {cardIndex < 4 ? (
              <button
                type="button"
                className="ea-onb-press"
                data-no-disintegrate=""
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                style={{
                  ...goldButtonStyle,
                  marginTop: 16,
                  position: 'relative',
                  zIndex: 3,
                }}
              >
                NEXT →
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginTop: 16,
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 3,
                  width: '100%',
                }}
              >
                {(() => {
                  try {
                    return (
                      <>
                        <button
                          type="button"
                          className="ea-onb-press"
                          data-no-disintegrate=""
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            finishDeck();
                          }}
                          style={{
                            ...goldButtonStyle,
                            marginTop: 0,
                          }}
                        >
                          GET STARTED
                        </button>
                        <button
                          type="button"
                          className="ea-onb-press"
                          data-no-disintegrate=""
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              onRequestLocation();
                            } catch (err) {
                              console.error('[OnboardingDeck] onRequestLocation', err);
                            }
                          }}
                          style={{
                            ...goldButtonStyle,
                            background: 'transparent',
                            color: '#f0a820',
                            border: '1px solid #f0a820',
                            boxShadow: 'none',
                            marginTop: 0,
                          }}
                        >
                          SHARE MY LOCATION →
                        </button>
                      </>
                    );
                  } catch (err) {
                    console.error('[OnboardingDeck] final onboarding card render', err);
                    return (
                      <button
                        type="button"
                        className="ea-onb-press"
                        data-no-disintegrate=""
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          finishDeck();
                        }}
                        style={{
                          ...goldButtonStyle,
                          marginTop: 0,
                        }}
                      >
                        GET STARTED
                      </button>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          paddingBottom: 32,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {CARDS.map((_, i) => (
            <button
              key={i}
              type="button"
              className="ea-onb-press"
              data-no-disintegrate=""
              aria-label={`Slide ${i + 1} of ${CARDS.length}`}
              aria-current={i === cardIndex ? 'true' : undefined}
              disabled={transitioning}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                jumpToSlide(i);
              }}
              style={{
                width: i === cardIndex ? 10 : 6,
                height: i === cardIndex ? 10 : 6,
                borderRadius: 999,
                border: 'none',
                padding: 0,
                background: i === cardIndex ? '#f0a820' : '#2a3f52',
                cursor: transitioning ? 'default' : 'pointer',
                flexShrink: 0,
                boxSizing: 'border-box',
                opacity: i === cardIndex ? 1 : 0.85,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
