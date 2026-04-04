import { useEffect, useId, useRef, useState } from 'react';
import './EyeGridLoader.css';

const EYE_COLORS = [
  '#8B4513',
  '#4a90d9',
  '#2d7a2d',
  '#c8a020',
  '#8B0000',
  '#4a6090',
  '#7a4a2d',
  '#5a8a5a',
  '#a07030',
];

/**
 * @param {{ color: string; clipId: string; baseDelay: number }} props
 */
function SingleEye({ color, clipId, baseDelay }) {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    const timers = new Set();
    let cancelled = false;

    function arm(fn, ms) {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!cancelled) fn();
      }, ms);
      timers.add(id);
    }

    function scheduleBlink() {
      const wait = baseDelay + Math.random() * 3000;
      arm(() => {
        setBlinking(true);
        arm(() => {
          setBlinking(false);
          scheduleBlink();
        }, 150 + Math.random() * 100);
      }, wait);
    }

    scheduleBlink();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [baseDelay]);

  const size = 64;
  const cx = size / 2;
  const cy = size / 2;
  const rx = size * 0.44;
  const ry = blinking ? 1.5 : size * 0.38;
  const transition = 'ry 0.08s ease-in';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} style={{ transition }} />
        </clipPath>
      </defs>
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx + 4}
        ry={ry + 4}
        fill="#d4956a"
        style={{ transition }}
      />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#f5f0e8" style={{ transition }} />
      <g clipPath={`url(#${clipId})`}>
        <circle cx={cx} cy={cy} r={size * 0.22} fill={color} />
        <circle cx={cx} cy={cy} r={size * 0.11} fill="#111" />
        <circle cx={cx - 5} cy={cy - 5} r={3} fill="white" opacity={0.7} />
      </g>
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke="#a0704a"
        strokeWidth={1.2}
        style={{ transition }}
      />
    </svg>
  );
}

/**
 * @param {{ message?: string }} props
 */
export default function EyeGridLoader({ message = 'Analyzing...' }) {
  const reactId = useId().replace(/:/g, '');
  const delaysRef = useRef(/** @type {number[] | null} */ (null));
  if (!delaysRef.current) {
    delaysRef.current = EYE_COLORS.map((_, i) => i * 200 + Math.random() * 500);
  }
  const delays = delaysRef.current;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: 24,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 64px)',
          gap: 8,
          background: '#d4956a',
          padding: 12,
          borderRadius: 12,
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {EYE_COLORS.map((color, i) => (
          <SingleEye
            key={i}
            color={color}
            clipId={`eye-${reactId}-${i}`}
            baseDelay={delays[i]}
          />
        ))}
      </div>
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: '#f0a820',
          animation: 'eye-grid-loader-pulse 1.5s ease-in-out infinite',
        }}
      >
        {message}
      </div>
    </div>
  );
}
