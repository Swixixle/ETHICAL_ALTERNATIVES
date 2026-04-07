import { useCallback, useEffect, useRef, useState } from 'react';

/** @typedef {'left' | 'right'} SwipeDir */

const EXIT_MS = 500;
const ENTRANCE_MS = 400;

/** @type {const} */
const CARDS = [
  {
    exit: 'shatter',
    primary: '#1a1a1a',
    bg: '#f8f4ee',
    labelColor: '#8a7a6a',
    headlineColor: '#1a1a1a',
    subColor: '#8a7a6a',
    labelFont: "'Georgia', serif",
    headlineFont: "'Georgia', serif",
    label: 'YOU ALREADY KNOW THESE BRANDS',
    headline: 'Clean packaging. Great marketing. Busy lawyers.',
    subtext: "There's a record behind every logo.",
    accent: 'goldBorder',
    footer: 'tm',
    footerStyle: 'corporate',
  },
  {
    exit: 'explode',
    primary: '#f0a820',
    bg: '#0f1520',
    labelColor: '#a8c4d8',
    headlineColor: '#f0a820',
    subColor: '#a8c4d8',
    labelFont: "'Space Mono', monospace",
    headlineFont: "'Space Mono', monospace",
    label: 'WHAT WE FOUND',
    headline: 'Every company has a paper trail.',
    subtext: "Settlements. Fines. Who paid. Who didn't.",
    accent: 'amberLine',
    footer: '94 PROFILES · 41 BOARD MEMBERS · DOCUMENTED',
    footerStyle: 'mono',
  },
  {
    exit: 'melt',
    primary: '#00e676',
    bg: '#0a0f0a',
    labelColor: '#4a7a4a',
    headlineColor: '#00e676',
    subColor: '#4a7a4a',
    labelFont: "'Space Mono', monospace",
    headlineFont: "'Space Mono', monospace",
    label: 'HOW IT WORKS',
    headline: 'Point at anything.',
    subtext: 'Tap the brand. See the investigation. Find the alternative.',
    accent: 'scanLine',
    footer: 'TAP ANY LOGO · ANYWHERE · ANYTIME',
    footerStyle: 'mono',
  },
  {
    exit: 'float',
    primary: '#e8c87a',
    bg: '#1a120a',
    labelColor: '#a89060',
    headlineColor: '#e8c87a',
    subColor: '#a89060',
    labelFont: "'Space Mono', monospace",
    headlineFont: "'Crimson Pro', serif",
    label: 'THE ALTERNATIVE',
    headline: 'The independent is closer than you think.',
    subtext: 'Real businesses. Real people. Your city.',
    accent: 'leftBar',
    footer: 'LOCAL · VERIFIED · YOURS',
    footerStyle: 'mixed',
  },
  {
    exit: 'none',
    primary: '#f0e8d0',
    bg: '#0f1520',
    labelColor: '#6a8a9a',
    headlineColor: '#f0e8d0',
    subColor: '#6a8a9a',
    labelFont: "'Space Mono', monospace",
    headlineFont: "'Space Mono', monospace",
    label: 'BEFORE YOU CONTINUE',
    headline: 'No account. No tracking. Just receipts.',
    subtext: "Location is used only to find what's near you. Never stored. Never sold.",
    accent: 'none',
    footer: 'cta',
    footerStyle: 'cta',
  },
];

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 240, g: 168, b: 32 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

/**
 * @param {import('react').RefObject<HTMLCanvasElement | null>} canvasRef
 * @param {number} w
 * @param {number} h
 */
function setupCanvas(canvasRef, w, h) {
  const canvas = canvasRef.current;
  if (!canvas || w < 1 || h < 1) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/**
 * @param {SwipeDir} dir
 * @returns {number} bias -1 left, 1 right
 */
function dirBias(dir) {
  return dir === 'left' ? -1 : 1;
}

/**
 * @param {'shatter' | 'explode' | 'melt' | 'float'} kind
 * @param {string} colorHex
 * @param {SwipeDir} dir
 * @param {number} w
 * @param {number} h
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t 0..1 progress
 * @param {boolean} exit
 */
function drawEffectFrame(kind, colorHex, dir, w, h, ctx, t, exit) {
  const { r, g, b } = hexToRgb(colorHex);
  const bias = dirBias(dir);

  ctx.clearRect(0, 0, w, h);

  if (kind === 'shatter') {
    const cols = 4;
    const rows = 4;
    const cw = w / cols;
    const ch = h / rows;
    const ease = exit ? t * t : 1 - (1 - t) * (1 - t);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const seed = row * cols + col;
        const vx = (Math.sin(seed * 1.7) * 6 + bias * 6) * (exit ? 1 : -1);
        const vy = (Math.cos(seed * 2.1) * 6 + ((seed % 3) - 1)) * (exit ? 1 : -1);
        const rot0 = (seed * 0.4) % 6.28;
        const vr = (seed % 2 === 0 ? 1 : -1) * 0.15;
        const ox = exit ? vx * ease * 80 : vx * (1 - ease) * 80;
        const oy = exit ? vy * ease * 80 : vy * (1 - ease) * 80;
        const rot = exit ? rot0 + vr * ease * 5 : rot0 + vr * (1 - ease) * 5;
        const alpha = exit ? 1 - ease * 0.85 : Math.min(1, ease * 1.2);
        const x0 = col * cw;
        const y0 = row * ch;
        ctx.save();
        ctx.translate(x0 + cw / 2 + ox, y0 + ch / 2 + oy);
        ctx.rotate(rot);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(-cw / 2, -ch / 2, cw - 1, ch - 1);
        ctx.restore();
      }
    }
    return;
  }

  if (kind === 'explode') {
    const n = 200;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + (i % 7) * 0.3;
      const spd = 3 + (i % 10);
      const dist = exit ? t * spd * 4.2 : (1 - t) * spd * 4.2;
      const px = w / 2 + Math.cos(ang) * dist;
      const py = h / 2 + Math.sin(ang) * dist;
      const alpha = exit ? 1 - t * 0.92 : Math.min(1, t * 1.4);
      const size = 2 + (i % 3);
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, alpha)})`;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }
    return;
  }

  if (kind === 'melt') {
    const n = 140;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * w + (i % 5) * 2;
      const baseY = h * 0.55 + (i % 17) * 3;
      const vy = 2 + (i % 5) * 0.6;
      const ease = exit ? t : 1 - t;
      const y = exit ? baseY + ease * vy * 55 : baseY + (1 - ease) * vy * 55;
      const jitter = Math.sin(i * 0.5) * 1.5 * (exit ? 1 : 1 - ease);
      const alpha = exit ? 1 - t * 0.85 : Math.min(1, t * 1.3);
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, alpha)})`;
      ctx.fillRect(x + jitter, y, 2.5, 3 + (i % 4));
    }
    return;
  }

  if (kind === 'float') {
    const n = 160;
    for (let i = 0; i < n; i++) {
      const x = (i * 97) % w;
      const baseY = h * 0.4 + (i % 40);
      const vy = 1 + (i % 3) * 0.7;
      const wobble = Math.sin(t * 8 + i) * 2;
      const ease = exit ? t : 1 - t;
      const y = exit ? baseY - ease * vy * 90 : baseY - (1 - ease) * vy * 90;
      const alpha = exit ? 1 - t * 0.95 : Math.min(1, t * 1.2);
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, alpha)})`;
      ctx.fillRect(x + wobble, y, 2, 2 + (i % 3));
    }
  }
}

/**
 * @param {'shatter' | 'explode' | 'melt' | 'float'} exitKind
 * @param {string} colorHex
 * @param {SwipeDir} dir
 * @param {import('react').RefObject<HTMLCanvasElement | null>} canvasRef
 * @param {number} w
 * @param {number} h
 */
function runExitAnimation(exitKind, colorHex, dir, canvasRef, w, h) {
  return new Promise((resolve) => {
    const ctx = setupCanvas(canvasRef, w, h);
    if (!ctx || w < 1 || h < 1) {
      resolve();
      return;
    }
    const start = performance.now();
    function frame(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / EXIT_MS);
      drawEffectFrame(exitKind, colorHex, dir, w, h, ctx, t, true);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

/**
 * Particles from exit direction converge inward; exiting card primary color.
 * ~30 steps over ENTRANCE_MS; canvas fades out revealing the card.
 * @param {'shatter' | 'explode' | 'melt' | 'float'} prevExitKind
 * @param {string} exitingCardColorHex
 */
function runEntranceAnimation(prevExitKind, exitingCardColorHex, dir, canvasRef, w, h) {
  return new Promise((resolve) => {
    const ctx = setupCanvas(canvasRef, w, h);
    if (!ctx || w < 1 || h < 1) {
      resolve();
      return;
    }
    const { r, g, b } = hexToRgb(exitingCardColorHex);
    const bias = dirBias(dir);
    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      const u = Math.min(1, elapsed / ENTRANCE_MS);
      const t = u;
      ctx.clearRect(0, 0, w, h);

      if (prevExitKind === 'shatter') {
        ctx.globalAlpha = 0.4 * (1 - t);
        drawEffectFrame('shatter', exitingCardColorHex, dir, w, h, ctx, 1 - t, false);
        ctx.globalAlpha = 1;
      }

      const cx = w / 2;
      const cy = h / 2;
      const n = 140;
      const pull = 1 - t;
      for (let i = 0; i < n; i++) {
        let sx;
        let sy;
        if (bias < 0) {
          sx = -50 + (i % 12) * (w / 11);
          sy = (i * 47) % h;
        } else {
          sx = w + 50 - (i % 12) * (w / 11);
          sy = (i * 53) % h;
        }
        const px = sx + (cx - sx) * (1 - pull);
        const py = sy + (cy - sy) * (1 - pull);
        const alpha = (1 - t) * 0.9;
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, alpha)})`;
        ctx.fillRect(px - 1, py - 1, 3, 3);
      }

      if (u < 1) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

/**
 * When leaving a card with exit 'none' (e.g. privacy), rebuild the previous slide in from the edge.
 */
function runUniversalEntranceOnly(dir, colorHex, canvasRef, w, h) {
  return new Promise((resolve) => {
    const ctx = setupCanvas(canvasRef, w, h);
    if (!ctx || w < 1 || h < 1) {
      resolve();
      return;
    }
    const { r, g, b } = hexToRgb(colorHex);
    const bias = dirBias(dir);
    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      const u = Math.min(1, elapsed / ENTRANCE_MS);
      const t = u;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const n = 140;
      const pull = 1 - t;
      for (let i = 0; i < n; i++) {
        let sx;
        let sy;
        if (bias < 0) {
          sx = -50 + (i % 12) * (w / 11);
          sy = (i * 47) % h;
        } else {
          sx = w + 50 - (i % 12) * (w / 11);
          sy = (i * 53) % h;
        }
        const px = sx + (cx - sx) * (1 - pull);
        const py = sy + (cy - sy) * (1 - pull);
        const alpha = (1 - t) * 0.9;
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, alpha)})`;
        ctx.fillRect(px - 1, py - 1, 3, 3);
      }
      if (u < 1) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

/**
 * @param {{ onComplete: () => void }} props
 */
export default function OnboardingDeck({ onComplete }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const cardWrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const transitioningRef = useRef(false);
  const cardIndexRef = useRef(0);
  const pointerStartRef = useRef(/** @type {{ x: number; y: number } | null} */ (null));

  useEffect(() => {
    cardIndexRef.current = cardIndex;
  }, [cardIndex]);

  const measure = useCallback(() => {
    const el = cardWrapRef.current;
    if (!el) return { w: 420, h: 480 };
    return { w: el.offsetWidth, h: el.offsetHeight };
  }, []);

  const runTransition = useCallback(
    async (delta, dir) => {
      if (transitioningRef.current) return;
      const i = cardIndexRef.current;
      const next = i + delta;
      if (next < 0 || next >= CARDS.length) return;
      if (i === 4 && delta > 0) return;

      const fromCard = CARDS[i];
      if (delta > 0 && fromCard.exit === 'none') return;

      transitioningRef.current = true;
      setTransitioning(true);

      const { w, h } = measure();
      const exitKind = fromCard.exit;

      if (exitKind !== 'none') {
        await runExitAnimation(
          /** @type {'shatter' | 'explode' | 'melt' | 'float'} */ (exitKind),
          fromCard.primary,
          dir,
          canvasRef,
          w,
          h
        );
      }

      cardIndexRef.current = next;
      setCardIndex(next);

      await new Promise((r) => {
        requestAnimationFrame(() => requestAnimationFrame(r));
      });

      const { w: w2, h: h2 } = measure();
      const exited = fromCard.exit;

      if (exited !== 'none') {
        await runEntranceAnimation(
          /** @type {'shatter' | 'explode' | 'melt' | 'float'} */ (exited),
          fromCard.primary,
          dir,
          canvasRef,
          w2,
          h2
        );
      } else {
        await runUniversalEntranceOnly(dir, CARDS[next].primary, canvasRef, w2, h2);
      }

      transitioningRef.current = false;
      setTransitioning(false);
    },
    [measure]
  );

  const goNext = useCallback(() => {
    runTransition(1, 'left');
  }, [runTransition]);

  const goPrev = useCallback(() => {
    runTransition(-1, 'right');
  }, [runTransition]);

  useEffect(() => {
    function onKey(e) {
      if (transitioningRef.current) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (cardIndexRef.current < 4) goNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (cardIndexRef.current > 0) goPrev();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  function onPointerDown(e) {
    if (transitioningRef.current) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerUp(e) {
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
      <style>
        {`
          @keyframes ea-onboard-scan {
            0% { top: 0%; }
            100% { top: 100%; }
          }
        `}
      </style>

      {cardIndex > 0 ? (
        <button
          type="button"
          aria-label="Previous card"
          disabled={transitioning}
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
            color: card.headlineColor,
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
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
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
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 420,
            boxSizing: 'border-box',
            minHeight: 360,
            border: card.accent === 'goldBorder' ? '1px solid #c8a84a' : undefined,
            padding: card.accent === 'goldBorder' ? '40px 32px' : '40px 32px',
          }}
        >
          <canvas
            ref={canvasRef}
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              minHeight: 280,
            }}
          >
            {card.accent === 'amberLine' ? (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: '40%',
                  left: 0,
                  right: 0,
                  height: 1,
                  background: '#f0a820',
                  zIndex: 0,
                }}
              />
            ) : null}

            <div
              style={{
                fontFamily: card.labelFont,
                fontSize: 10,
                letterSpacing: card.accent === 'goldBorder' ? 2 : 1.5,
                fontVariant: 'small-caps',
                color: card.labelColor,
                marginBottom: 16,
                textAlign: card.accent === 'goldBorder' ? 'center' : 'left',
                position: 'relative',
                zIndex: 1,
                paddingLeft: card.accent === 'leftBar' ? 12 : undefined,
              }}
            >
              {card.label}
            </div>

            {card.accent === 'scanLine' ? (
              <div
                style={{
                  position: 'relative',
                  height: 200,
                  marginBottom: 16,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 1,
                    background: '#00e676',
                    opacity: 0.3,
                    animation: 'ea-onboard-scan 3s linear infinite',
                  }}
                />
              </div>
            ) : null}

            <h1
              style={{
                fontFamily: card.headlineFont,
                fontSize: card.accent === 'goldBorder' ? 26 : 24,
                fontWeight: card.accent === 'goldBorder' ? 400 : 700,
                color: card.headlineColor,
                lineHeight: 1.25,
                margin: '0 0 16px',
                textAlign: card.accent === 'goldBorder' ? 'center' : 'left',
                position: 'relative',
                zIndex: 1,
                paddingLeft: card.accent === 'leftBar' ? 12 : undefined,
              }}
            >
              {card.headline}
            </h1>

            <p
              style={{
                fontFamily: card.accent === 'goldBorder' ? "'Georgia', serif" : card.headlineFont,
                fontSize: 16,
                color: card.subColor,
                lineHeight: 1.6,
                margin: '0 0 24px',
                textAlign: card.accent === 'goldBorder' ? 'center' : 'left',
                position: 'relative',
                zIndex: 1,
                paddingLeft: card.accent === 'leftBar' ? 12 : undefined,
              }}
            >
              {card.subtext}
            </p>

            {card.accent === 'leftBar' ? (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 72,
                  bottom: 72,
                  width: 3,
                  background: '#e8c87a',
                }}
              />
            ) : null}

            {card.footer === 'tm' ? (
              <div
                style={{
                  position: 'absolute',
                  bottom: 24,
                  right: 24,
                  fontFamily: "'Georgia', serif",
                  fontSize: 32,
                  color: '#c8a84a',
                  textShadow: '0 1px 0 rgba(255,255,255,0.4)',
                }}
              >
                ™
              </div>
            ) : null}

            {card.footerStyle === 'mono' || card.footerStyle === 'mixed' ? (
              <p
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 1,
                  color: card.labelColor,
                  margin: '32px 0 0',
                  textTransform: 'uppercase',
                }}
              >
                {card.footer}
              </p>
            ) : null}

            {card.footer === 'cta' ? (
              <button
                type="button"
                data-no-disintegrate=""
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete();
                }}
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
                  width: '100%',
                  maxWidth: 320,
                  marginTop: 8,
                  boxShadow: '0 0 0 1px rgba(240,168,32,0.35)',
                }}
              >
                SHARE MY LOCATION →
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {cardIndex < 4 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            paddingBottom: 32,
          }}
        >
          {CARDS.slice(0, 5).map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: i === cardIndex ? '#f0a820' : '#2a3f52',
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
