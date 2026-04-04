import { useEffect, useId, useState } from 'react';

/**
 * Product mark: closed amber slit at rest; opens to iris, pupil, catchlight, lashes when `open`.
 */
export default function EyeIcon({ open = false, size = 120 }) {
  const reactId = useId().replace(/:/g, '');
  const clipId = `ea-eye-clip-${reactId}`;
  const [animOpen, setAnimOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setAnimOpen(true), 80);
      return () => clearTimeout(t);
    }
    setAnimOpen(false);
    return undefined;
  }, [open]);

  const w = size;
  const h = size * 0.6;
  const cx = w / 2;
  const cy = h / 2;
  const rx = w * 0.48;
  const ryClosed = 2;
  const ryOpen = h * 0.46;

  const openEase = '0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
  const closeEase = '0.2s ease-in';

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', margin: '0 auto' }}
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}>
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={animOpen ? ryOpen : ryClosed}
            style={{
              transition: animOpen ? `ry ${openEase}` : `ry ${closeEase}`,
            }}
          />
        </clipPath>
      </defs>

      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={animOpen ? ryOpen : ryClosed}
        fill="none"
        stroke="#e8a020"
        strokeWidth="1.5"
        style={{
          transition: animOpen ? `ry ${openEase}` : `ry ${closeEase}`,
        }}
      />

      <g clipPath={`url(#${clipId})`}>
        <circle
          cx={cx}
          cy={cy}
          r={h * 0.28}
          fill="#1c2a3a"
          stroke="#e8a020"
          strokeWidth="1"
        />
        <circle
          cx={cx}
          cy={cy}
          r={h * 0.14}
          fill="#e8a020"
          opacity={animOpen ? 1 : 0}
          style={{ transition: 'opacity 0.2s ease 0.2s' }}
        />
        <circle
          cx={cx - h * 0.07}
          cy={cy - h * 0.07}
          r={h * 0.04}
          fill="white"
          opacity={animOpen ? 0.8 : 0}
          style={{ transition: 'opacity 0.2s ease 0.22s' }}
        />
      </g>

      {animOpen
        ? [0.2, 0.35, 0.5, 0.65, 0.8].map((pct, i) => {
            const x = cx - rx + rx * 2 * pct;
            const topY = cy - ryOpen * Math.sin(Math.PI * pct) * 0.95;
            return (
              <line
                key={i}
                x1={x}
                y1={topY}
                x2={x}
                y2={topY - h * 0.08}
                stroke="#e8a020"
                strokeWidth="1"
                opacity="0.5"
              />
            );
          })
        : null}
    </svg>
  );
}
