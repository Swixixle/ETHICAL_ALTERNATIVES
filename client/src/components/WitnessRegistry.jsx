import { useCallback, useEffect, useState } from 'react';
import { WITNESS_LEGAL_NOTICE, ETHICALALT_CONTACT } from '../constants/witnessLegalNotice.js';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : '—';
  } catch {
    return '—';
  }
}

/**
 * @param {{ onBack: () => void }} props
 */
export default function WitnessRegistry({ onBack }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiPrefix()}/api/witness/summary`);
      if (!res.ok) throw new Error('summary_http');
      const d = await res.json();
      setData(d);
    } catch {
      setErr('Could not load the registry. Try again later.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!expandedSlug) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(
          `${apiPrefix()}/api/witness/brand/${encodeURIComponent(expandedSlug)}`
        );
        if (!res.ok) throw new Error('brand');
        const d = await res.json();
        if (!cancelled) setDetail(d);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expandedSlug]);

  const brands = Array.isArray(data?.brands) ? data.brands : [];
  const total = typeof data?.total_witnesses === 'number' ? data.total_witnesses : 0;

  const rowStyle = {
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    padding: '14px 0',
    cursor: 'pointer',
  };

  return (
    <div style={{ background: '#0f1520', minHeight: '100vh', color: '#e0e0e0' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#0f1520',
          borderBottom: '1px solid #2a3f52',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: '#f0a820',
            background: 'transparent',
            border: '1px solid #f0a820',
            padding: '8px 12px',
            borderRadius: 2,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 22,
            letterSpacing: 2,
            color: '#f0e8d0',
          }}
        >
          Witnesses
        </div>
        <span style={{ width: 64 }} />
      </header>

      <div style={{ padding: '20px 18px 48px', maxWidth: 640, margin: '0 auto' }}>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#a8c4d8',
            marginBottom: 8,
          }}
        >
          Civic witness registry
        </div>
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28,
            letterSpacing: 1,
            color: '#f0e8d0',
            margin: '0 0 12px',
            lineHeight: 1.1,
          }}
        >
          {total.toLocaleString()} documented witnesses
        </h1>
        <p
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 15,
            lineHeight: 1.55,
            color: '#a8c4d8',
            margin: '0 0 20px',
          }}
        >
          Public ledger of people who voluntarily opted in to say they reviewed an EthicalAlt investigation
          record. Not a legal filing — see notice below.
        </p>

        {loading ? (
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#6a8a9a' }}>Loading…</p>
        ) : null}
        {err ? <p style={{ color: '#ff6b6b' }}>{err}</p> : null}

        {!loading && !err ? (
          <div>
            {brands.length === 0 ? (
              <p style={{ fontFamily: "'Crimson Pro', serif", color: '#6a8a9a' }}>
                No entries yet — be the first to add your name from an investigation&apos;s share screen.
              </p>
            ) : null}
            {brands.map((b) => {
              const slug = String(b.brand_slug || '');
              const expanded = expandedSlug === slug;
              const loc =
                [b.last_city, b.last_state_code].filter(Boolean).join(', ') || '—';
              return (
                <div key={slug} style={rowStyle}>
                  <button
                    type="button"
                    onClick={() => setExpandedSlug(expanded ? null : slug)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 17, fontWeight: 600 }}>
                        {b.brand_name || slug}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 12,
                          color: '#d4a017',
                          flexShrink: 0,
                        }}
                      >
                        {Number(b.witness_count) || 0}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 11,
                        color: '#6a8a9a',
                        marginTop: 6,
                      }}
                    >
                      Recent: {loc} · {formatDate(b.last_witnessed)}
                    </div>
                  </button>
                  {expanded ? (
                    <div style={{ marginTop: 12, paddingLeft: 4 }}>
                      {detailLoading ? (
                        <p style={{ fontSize: 12, color: '#6a8a9a' }}>Loading names…</p>
                      ) : detail && Array.isArray(detail.witnesses) ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {detail.witnesses.map((w, i) => (
                            <li
                              key={`${w.witnessed_at}-${i}`}
                              style={{
                                fontFamily: "'Crimson Pro', serif",
                                fontSize: 14,
                                marginBottom: 10,
                                color: '#e0e0e0',
                              }}
                            >
                              <strong>{w.display_name}</strong>
                              {w.city || w.state_code
                                ? ` · ${[w.city, w.state_code].filter(Boolean).join(', ')}`
                                : ''}
                              <div style={{ fontSize: 12, color: '#6a8a9a', marginTop: 2 }}>
                                {formatDate(w.witnessed_at)}
                                {w.public_message ? ` · ${w.public_message}` : ''}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ fontSize: 12, color: '#6a8a9a' }}>Could not load entries.</p>
                      )}
                      <p
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 10,
                          color: '#6a8a9a',
                          marginTop: 12,
                        }}
                      >
                        Add your witness entry from any investigation card → Share this record → Civic Witness
                        Registry.
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        <footer
          style={{
            marginTop: 36,
            paddingTop: 20,
            borderTop: '1px solid #2a3f52',
            fontFamily: "'Crimson Pro', serif",
            fontSize: 13,
            lineHeight: 1.65,
            color: '#8a9aaa',
            whiteSpace: 'pre-wrap',
          }}
        >
          {WITNESS_LEGAL_NOTICE}
          <div style={{ marginTop: 16, fontSize: 12 }}>
            Removal requests and questions: {ETHICALALT_CONTACT}
          </div>
        </footer>
      </div>
    </div>
  );
}
