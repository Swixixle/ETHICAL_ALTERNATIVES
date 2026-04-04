import { useEffect, useId, useRef, useState } from 'react';
import './EyeGridLoader.css';

const AMBER = '#f0a820';
const PUPIL = '#0f1520';

const EYE_COUNT = 9;

/**
 * Minimal surveillance-style eye: amber outline, amber iris, dark pupil; blink = horizontal slit.
 * @param {{ clipId: string; baseDelay: number }} props
 */
function SingleEye({ clipId, baseDelay }) {
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

  const size = 40;
  const cx = size / 2;
  const cy = size / 2;
  const rxOpen = size * 0.42;
  const ryOpen = size * 0.36;
  /** Closed: thin horizontal amber line */
  const ry = blinking ? 0.85 : ryOpen;
  const rx = rxOpen;
  const transition = 'ry 0.08s ease-in';

  /** Iris radius = 30% of full eye width (2·rx) → r = 0.3·rx */
  const irisR = rxOpen * 0.3;
  const pupilR = irisR * 0.38;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <ellipse cx={cx} cy={cy} rx={rxOpen * 0.9} ry={ryOpen * 0.92} />
        </clipPath>
      </defs>
      {!blinking ? (
        <g clipPath={`url(#${clipId})`}>
          <circle cx={cx} cy={cy} r={irisR} fill={AMBER} />
          <circle cx={cx} cy={cy} r={pupilR} fill={PUPIL} />
        </g>
      ) : null}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke={AMBER}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
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
    delaysRef.current = Array.from({ length: EYE_COUNT }, (_, i) => i * 200 + Math.random() * 500);
  }
  const delays = delaysRef.current;

  return (
    <div className="eye-grid-loader" role="status" aria-busy="true" aria-live="polite">
      <div className="eye-grid-loader__grid">
        {delays.map((baseDelay, i) => (
          <SingleEye key={i} clipId={`eye-${reactId}-${i}`} baseDelay={baseDelay} />
        ))}
      </div>
      <div className="eye-grid-loader__message">{message}</div>
    </div>
  );
}
