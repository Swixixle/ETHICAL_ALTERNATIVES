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
            textDecorationColor: 'rgba(232, 160, 32, 0.45)',
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
    fontSize: 9,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#e8a020',
    paddingRight: 48,
    whiteSpace: 'nowrap',
    display: 'inline-block',
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
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <style>
        {`
          @keyframes ethicalalt-ticker-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ethicalalt-ticker__track {
            display: flex;
            width: max-content;
            animation: ethicalalt-ticker-marquee 50s linear infinite;
          }
          .ethicalalt-ticker-wrap:hover .ethicalalt-ticker__track {
            animation-play-state: paused;
          }
        `}
      </style>
      <div className="ethicalalt-ticker-wrap" style={{ width: '100%', overflow: 'hidden' }}>
        <div className="ethicalalt-ticker__track">
          <span style={bandStyle}>{segment}</span>
          <span style={bandStyle}>{segment}</span>
        </div>
      </div>
    </div>
  );
}
