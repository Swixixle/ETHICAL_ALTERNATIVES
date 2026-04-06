import { useEffect, useState } from 'react';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

/**
 * @param {{ onBack: () => void }} props
 */
export default function ImpactPublicPage({ onBack }) {
  const [snap, setSnap] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [err, setErr] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const base = apiPrefix();
      const url = base ? `${base}/api/impact/public` : '/api/impact/public';
      try {
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (!res.ok) setErr('Could not load metrics.');
          else setSnap(data);
        }
      } catch {
        if (!cancelled) setErr('Could not load metrics.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const agg =
    snap && typeof snap.aggregates === 'object' && snap.aggregates !== null
      ? snap.aggregates
      : null;
  const civic =
    snap && typeof snap.civic === 'object' && snap.civic !== null ? snap.civic : null;
  const outcomes =
    snap && typeof snap.outcomes === 'object' && snap.outcomes !== null ? snap.outcomes : null;
  const ym = typeof snap?.year_month === 'string' ? snap.year_month : '';
  const methodology =
    typeof snap?.methodology === 'string' ? snap.methodology : '';

  const pct =
    outcomes && typeof outcomes.switched_pct === 'number' ? outcomes.switched_pct : null;

  return (
    <div style={{ minHeight: '100vh', background: '#0f1520', color: '#e8e0c8' }}>
      <header
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #2a3f52',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1,
            background: 'transparent',
            border: '1px solid #f0a820',
            color: '#f0a820',
            padding: '8px 14px',
            cursor: 'pointer',
            borderRadius: 2,
          }}
        >
          ← Back
        </button>
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28,
            letterSpacing: 2,
            margin: 0,
            color: '#f0e8d0',
          }}
        >
          Public impact
        </h1>
      </header>

      <main style={{ padding: '24px 20px 48px', maxWidth: 560, margin: '0 auto' }}>
        {err ? (
          <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 18, color: '#d4a574' }}>{err}</p>
        ) : null}

        {!err && snap ? (
          <>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                color: '#6aaa8a',
                marginTop: 0,
              }}
            >
              {ym ? `Month: ${ym}` : 'This month'}
            </p>
            <ul
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 20,
                lineHeight: 1.8,
                listStyle: 'none',
                padding: 0,
                margin: '20px 0',
              }}
            >
              <li>Product scans: {Number(agg?.scans) || 0}</li>
              <li>Alternatives viewed: {Number(agg?.alt_opens) || 0}</li>
              <li>Investigations loaded: {Number(agg?.investigations) || 0}</li>
              <li>Witness reports filed: {Number(civic?.witness_reports) || 0}</li>
              <li>Share exports opened: {Number(civic?.share_exports) || 0}</li>
              <li>Local narrations completed: {Number(civic?.narrations) || 0}</li>
            </ul>
            <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 18, lineHeight: 1.6 }}>
              {pct != null
                ? `Among users who answered (opt-in): ${pct}% reported switching.`
                : 'Not enough opt-in outcome replies yet for a percentage.'}
            </p>
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 15,
                lineHeight: 1.65,
                color: '#8a9aa8',
                marginTop: 28,
              }}
            >
              {methodology}
            </p>
          </>
        ) : !err ? (
          <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 18 }}>Loading…</p>
        ) : null}
      </main>
    </div>
  );
}
