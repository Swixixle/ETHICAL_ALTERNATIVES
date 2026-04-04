import { useEffect, useState } from 'react';

/**
 * Bottom-of-home horizontal ticker: local headlines or EthicalAlt stats fallback.
 * @param {{ apiBase: string; city?: string; state?: string }} props
 */
export default function LocalNewsTicker({ apiBase, city, state }) {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    const p = new URLSearchParams({ city });
    if (state) p.set('state', state);
    const url = `${apiBase}/api/local-news?${p}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setPayload(d && Array.isArray(d.items) ? d : null);
      })
      .catch(() => {
        if (!cancelled) setPayload(null);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, city, state]);

  const items =
    payload?.items?.length > 0
      ? payload.items
      : [
          { title: 'ETHICALALT — TAP ANYTHING · FIND INDEPENDENT ALTERNATIVES', url: null },
          { title: 'LIST YOUR SHOP IN THE INDEPENDENT REGISTRY', url: null },
        ];

  const sep = '   ·   ';

  const segment = items.map((it, i) => (
    <span key={`t-${i}`} style={{ display: 'inline' }}>
      {it.url && it.url !== '#' ? (
        <a
          href={it.url}
          target="_blank"
          rel="noreferrer"
          style={{
            color: 'inherit',
            textDecoration: 'underline',
            textDecorationColor: 'rgba(106, 138, 154, 0.65)',
            textUnderlineOffset: 3,
          }}
        >
          {it.title}
        </a>
      ) : (
        <span>{it.title}</span>
      )}
      <span style={{ opacity: 0.85 }}>{sep}</span>
    </span>
  ));

  const bandStyle = {
    fontFamily: "'Space Mono', ui-monospace, monospace",
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#a8c4d8',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0,
    padding: '0 14px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 200,
        background: '#0a1020',
        borderTop: '1px solid #1a2840',
        height: 38,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={bandStyle}>{segment}</div>
      </div>
    </div>
  );
}
