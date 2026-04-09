import { useState } from 'react';

/* ── Section icons (inline SVG, amber stroke) ── */
function BarChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#f0a820" strokeWidth="1.5">
      <rect x="3" y="10" width="4" height="7" />
      <rect x="8" y="7" width="4" height="10" />
      <rect x="13" y="4" width="4" height="13" />
      <line x1="2" y1="17" x2="18" y2="17" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#f0a820" strokeWidth="1.5">
      <circle cx="10" cy="10" r="7" />
      <line x1="10" y1="5.5" x2="10" y2="7" />
      <line x1="10" y1="13" x2="10" y2="14.5" />
      <path d="M8 8.5 C8 7 12 7 12 9 C12 11 8 11 8 13 C8 15 12 15 12 13.5" />
    </svg>
  );
}

function TriangleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#f0a820" strokeWidth="1.5">
      <path d="M10 3 L18 17 L2 17 Z" />
      <line x1="10" y1="9" x2="10" y2="13" />
      <circle cx="10" cy="15" r="0.8" fill="#f0a820" stroke="none" />
    </svg>
  );
}

function FlowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#f0a820" strokeWidth="1.5">
      <circle cx="5" cy="15" r="2" />
      <circle cx="15" cy="5" r="2" />
      <path d="M6.4 13.6 C9 10 11 10 13.6 6.4" />
      <polyline points="11,5 15,5 15,9" />
    </svg>
  );
}

/* ── Sub-section wrapper ── */
function SubSection({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: '1px solid #2a3f52',
        }}
      >
        {icon}
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#f0a820',
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ── Body text ── */
function Body({ children, muted }) {
  return (
    <p
      style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: 20,
        lineHeight: 1.8,
        color: muted ? '#a8c4d8' : '#f0e8d0',
        margin: '0 0 10px',
      }}
    >
      {children}
    </p>
  );
}

/* ── Bullet list with amber arrows ── */
function Bullets({ items }) {
  if (!items?.length) return null;
  return (
    <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: '#f0a820',
              flexShrink: 0,
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              marginTop: 1,
            }}
          >
            →
          </span>
          <span
            style={{
              fontFamily: "'Crimson Pro', Georgia, serif",
              fontSize: 18,
              lineHeight: 1.65,
              color: '#a8c4d8',
            }}
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── Highlighted callout box ── */
function Callout({ label, children }) {
  return (
    <div
      style={{
        background: 'rgba(240, 168, 32, 0.07)',
        border: '1px solid rgba(240, 168, 32, 0.2)',
        borderLeft: '3px solid #f0a820',
        borderRadius: '0 4px 4px 0',
        padding: '14px 18px',
        marginTop: 6,
        marginBottom: 10,
      }}
    >
      {label ? (
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#f0a820',
            marginBottom: 6,
          }}
        >
          {label}
        </div>
      ) : null}
      <p
        style={{
          fontFamily: "'Crimson Pro', Georgia, serif",
          fontSize: 20,
          lineHeight: 1.75,
          color: '#f0e8d0',
          margin: 0,
        }}
      >
        {children}
      </p>
    </div>
  );
}

/**
 * Systemic community / category effects (no company names — category lens only).
 * @param {{ data: Record<string, unknown> | null | undefined }} props
 */
function ChevronDown({ open: expanded }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#f0a820"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        display: 'block',
        flexShrink: 0,
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
      }}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function CommunityImpact({ data }) {
  const [open, setOpen] = useState(false);
  const [headerHover, setHeaderHover] = useState(false);
  const [headerActive, setHeaderActive] = useState(false);

  if (!data) return null;

  const hasContent =
    data.displacement_effect ||
    data.price_illusion ||
    data.tax_math ||
    data.wealth_velocity ||
    data.the_real_math;

  if (!hasContent) return null;

  const headerBg = headerActive
    ? 'rgba(240, 168, 32, 0.22)'
    : headerHover
      ? 'rgba(240, 168, 32, 0.16)'
      : 'rgba(240, 168, 32, 0.09)';

  return (
    <section style={{ margin: '36px 0' }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="community-impact-panel"
        id="community-impact-toggle"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHeaderHover(true)}
        onMouseLeave={() => {
          setHeaderHover(false);
          setHeaderActive(false);
        }}
        onMouseDown={() => setHeaderActive(true)}
        onMouseUp={() => setHeaderActive(false)}
        onTouchStart={() => setHeaderActive(true)}
        onTouchEnd={() => setHeaderActive(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          width: '100%',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          background: headerBg,
          border: '2px solid #f0a820',
          boxShadow: headerHover
            ? '0 0 0 1px rgba(240, 168, 32, 0.35), 0 4px 14px rgba(0, 0, 0, 0.25)'
            : '0 2px 8px rgba(0, 0, 0, 0.12)',
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: open ? 28 : 0,
          font: 'inherit',
          textAlign: 'left',
          transition: 'background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        }}
      >
        <h2
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28,
            letterSpacing: 3,
            color: '#f0a820',
            textTransform: 'uppercase',
            margin: 0,
            textShadow: headerHover ? '0 0 20px rgba(240, 168, 32, 0.25)' : 'none',
            transition: 'text-shadow 0.15s ease',
          }}
        >
          Community Impact
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {data.category_label ? (
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: '#6a8a9a',
                border: '1px solid #2a3f52',
                borderRadius: 999,
                padding: '3px 10px',
              }}
            >
              {data.category_label}
            </span>
          ) : null}
          <ChevronDown open={open} />
        </div>
      </button>

      {open ? (
        <div id="community-impact-panel" role="region" aria-labelledby="community-impact-toggle">
          {data.displacement_effect ? (
            <SubSection icon={<BarChartIcon />} title="Local Business Displacement">
              {data.displacement_effect.summary ? <Body>{data.displacement_effect.summary}</Body> : null}
              <Bullets items={data.displacement_effect.specifics} />
            </SubSection>
          ) : null}

          {data.price_illusion ? (
            <SubSection icon={<DollarIcon />} title="The Price Illusion">
              {data.price_illusion.summary ? <Body>{data.price_illusion.summary}</Body> : null}
              <Bullets items={data.price_illusion.mechanisms} />
            </SubSection>
          ) : null}

          {data.tax_math ? (
            <SubSection icon={<TriangleIcon />} title="The Tax Math">
              {data.tax_math.summary ? <Body>{data.tax_math.summary}</Body> : null}
              {data.tax_math.who_pays ? <Callout label="Who pays instead">{data.tax_math.who_pays}</Callout> : null}
              {data.tax_math.what_disappears ? (
                <Callout label="What disappears">{data.tax_math.what_disappears}</Callout>
              ) : null}
            </SubSection>
          ) : null}

          {data.wealth_velocity ? (
            <SubSection icon={<FlowIcon />} title="Where the Money Goes">
              {data.wealth_velocity.summary ? <Body>{data.wealth_velocity.summary}</Body> : null}
            </SubSection>
          ) : null}

          {data.the_real_math ? (
            <div
              style={{
                background: 'rgba(240, 168, 32, 0.05)',
                border: '1px solid rgba(240, 168, 32, 0.3)',
                borderTop: '2px solid #f0a820',
                padding: '20px 24px',
                marginTop: 8,
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#f0a820',
                  marginBottom: 10,
                }}
              >
                The Real Math
              </div>
              <p
                style={{
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  fontSize: 20,
                  lineHeight: 1.8,
                  color: '#f0e8d0',
                  margin: 0,
                }}
              >
                {data.the_real_math}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
