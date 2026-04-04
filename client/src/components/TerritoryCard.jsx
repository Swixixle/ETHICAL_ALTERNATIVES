import { useState } from 'react';

/**
 * @param {{
 *   data: {
 *     history?: Record<string, unknown>;
 *     territories?: { name: string; description_url?: string | null }[];
 *     county?: string | null;
 *     state?: string | null;
 *   } | null;
 *   onDismiss: () => void;
 * }} props
 */
export default function TerritoryCard({ data, onDismiss }) {
  const [expanded, setExpanded] = useState(false);

  if (!data || !data.history) return null;

  const { history, territories, county, state } = data;
  const h = history;

  const title =
    (typeof h.location_name === 'string' && h.location_name) ||
    [county, state].filter(Boolean).join(', ');

  return (
    <div
      style={{
        background: '#0f1c2a',
        border: '1px solid #344d62',
        borderTop: '3px solid #f0a820',
        margin: '0 16px 20px',
        borderRadius: '0 0 4px 4px',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: '100%',
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          font: 'inherit',
          textAlign: 'left',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#f0a820',
              marginBottom: 6,
            }}
          >
            You are here
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 26,
              letterSpacing: 2,
              color: '#f0e8d0',
              lineHeight: 0.95,
              textTransform: 'uppercase',
            }}
          >
            {title}
          </div>

          {territories?.length > 0 ? (
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                color: '#6a8a9a',
                marginTop: 6,
                letterSpacing: 1,
              }}
            >
              {territories.map((t) => t.name).join(' · ')} territory
            </div>
          ) : null}
        </div>

        <span
          style={{
            color: '#6a8a9a',
            fontSize: 16,
            marginLeft: 12,
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {expanded ? (
        <div style={{ padding: '0 20px 20px' }}>
          {typeof h.territory_summary === 'string' && h.territory_summary ? (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#f0a820',
                  marginBottom: 8,
                }}
              >
                Whose Land
              </div>
              <p
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 18,
                  color: '#f0e8d0',
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {h.territory_summary}
              </p>
            </div>
          ) : null}

          {typeof h.treaty_note === 'string' && h.treaty_note ? (
            <div
              style={{
                background: 'rgba(240, 168, 32, 0.07)',
                border: '1px solid rgba(240, 168, 32, 0.2)',
                borderLeft: '3px solid #f0a820',
                padding: '12px 16px',
                marginBottom: 16,
                borderRadius: '0 4px 4px 0',
              }}
            >
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
                Treaty
              </div>
              <p
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 16,
                  fontStyle: 'italic',
                  color: '#a8c4d8',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {h.treaty_note}
              </p>
            </div>
          ) : null}

          {typeof h.county_history === 'string' && h.county_history ? (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#f0a820',
                  marginBottom: 8,
                }}
              >
                County History
              </div>
              <p
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 18,
                  color: '#a8c4d8',
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {h.county_history}
              </p>
            </div>
          ) : null}

          {typeof h.land_character === 'string' && h.land_character ? (
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 16,
                fontStyle: 'italic',
                color: '#6a8a9a',
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              {h.land_character}
            </p>
          ) : null}

          {typeof h.oral_tradition_note === 'string' && h.oral_tradition_note ? (
            <div
              style={{
                background: '#162030',
                border: '1px solid #344d62',
                padding: '12px 16px',
                marginBottom: 16,
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#6a8a9a',
                  marginBottom: 6,
                }}
              >
                Oral Tradition
              </div>
              <p
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 16,
                  fontStyle: 'italic',
                  color: '#a8c4d8',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {h.oral_tradition_note}
              </p>
            </div>
          ) : null}

          {territories?.length > 0 ? (
            <a
              href={territories[0].description_url || 'https://native-land.ca'}
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: '#f0a820',
                textDecoration: 'none',
                display: 'block',
                marginBottom: 12,
              }}
            >
              Learn more — Native Land Digital ↗
            </a>
          ) : null}

          {Array.isArray(h.sources) && h.sources.length > 0 ? (
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                color: '#6a8a9a',
                lineHeight: 1.8,
                borderTop: '1px solid #2a3f52',
                paddingTop: 10,
              }}
            >
              {h.sources.map((s, i) => (
                <div key={i}>· {String(s)}</div>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onDismiss}
            style={{
              marginTop: 14,
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#6a8a9a',
              background: 'transparent',
              border: '1px solid #2a3f52',
              padding: '6px 14px',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
