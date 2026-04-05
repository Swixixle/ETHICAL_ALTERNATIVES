import { useCallback, useEffect, useState } from 'react';
import { readCachedLocation } from '../services/location.js';
import { hireDirectCategoryLabel } from '../constants/hireDirect.js';
import HireDirectMessageModal from './HireDirectMessageModal.jsx';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function tweetUrl(text) {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

/**
 * @param {{ slug: string; onBack: () => void }} props
 */
export default function WorkerProfilePage({ slug, onBack }) {
  const [worker, setWorker] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(/** @type {string | null} */ (null));
  const [messageOpen, setMessageOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const loc = readCachedLocation();
    const lat = typeof loc?.lat === 'number' ? loc.lat : '';
    const lng = typeof loc?.lng === 'number' ? loc.lng : '';
    const base = apiPrefix();
    const q =
      Number.isFinite(lat) && Number.isFinite(lng) ? `?lat=${lat}&lng=${lng}` : '';
    const url = base
      ? `${base}/api/workers/profile/${encodeURIComponent(slug)}${q}`
      : `/api/workers/profile/${encodeURIComponent(slug)}${q}`;
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const w = data.worker;
      setWorker(w && typeof w === 'object' ? w : null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
      setWorker(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const site =
    typeof window !== 'undefined' ? window.location.origin : 'https://ethicalalt-client.onrender.com';
  const profileUrl = `${site}/workers/${encodeURIComponent(slug)}`;

  const shareTwitter = () => {
    if (!worker) return;
    const name = String(worker.display_name || 'Worker');
    const city = String(worker.city || '');
    const cat = hireDirectCategoryLabel(String(worker.category || '')).toLowerCase();
    const text = `${name} in ${city} does ${cat} work directly — no corporate middleman, keeps 100% of their rate. Found on EthicalAlt. ${profileUrl}`;
    window.open(tweetUrl(text), '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f1520', color: '#a8c4d8', padding: 24 }}>
        Loading…
      </div>
    );
  }

  if (err || !worker) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f1520', color: '#e0e0e0', padding: 24 }}>
        <button type="button" onClick={onBack} style={{ marginBottom: 16, cursor: 'pointer' }}>
          ← Back
        </button>
        <p>{err || 'Worker not found.'}</p>
      </div>
    );
  }

  const alts = Array.isArray(worker.corporate_alternatives) ? worker.corporate_alternatives : [];
  const dist =
    typeof worker.distance_miles === 'number' && Number.isFinite(worker.distance_miles)
      ? worker.distance_miles
      : null;
  const witnessCount = Number(worker.civic_witness_count) || 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0f1520', color: '#e0e0e0', paddingBottom: 48 }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: '#0f1520',
          borderBottom: '1px solid #2a3f52',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '1px solid #6a8a9a',
            color: '#a8c4d8',
            borderRadius: 4,
            padding: '6px 12px',
            cursor: 'pointer',
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
          }}
        >
          ← Back
        </button>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#6a8a9a' }}>HIRE DIRECT</span>
      </header>

      <div style={{ padding: '24px 20px', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 26, color: '#f0e8d0', fontFamily: "'Crimson Pro', serif" }}>
            {String(worker.display_name || '')}
          </h1>
          {worker.is_civic_verified ? (
            <span
              style={{
                fontSize: 10,
                color: '#D4A017',
                border: '1px solid #D4A017',
                borderRadius: 4,
                padding: '4px 8px',
                letterSpacing: 1,
                fontFamily: "'Space Mono', monospace",
                flexShrink: 0,
              }}
            >
              CIVIC VERIFIED
            </span>
          ) : null}
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: '#a8c4d8' }}>
          {String(worker.city || '')}, {String(worker.state_code || '')}
          {dist != null ? ` · ${dist.toFixed(1)} mi` : ''}
        </div>
        <div style={{ marginTop: 10 }}>
          <span
            style={{
              fontSize: 10,
              letterSpacing: 1,
              color: '#D4A017',
              border: '1px solid rgba(212,160,23,0.35)',
              borderRadius: 999,
              padding: '4px 12px',
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {hireDirectCategoryLabel(String(worker.category || '')).toUpperCase()}
          </span>
        </div>

        <p
          style={{
            marginTop: 20,
            fontSize: 18,
            color: '#D4A017',
            fontStyle: 'italic',
            lineHeight: 1.4,
            fontFamily: "'Crimson Pro', serif",
          }}
        >
          {String(worker.tagline || '')}
        </p>

        {worker.rate ? (
          <p style={{ marginTop: 12, color: '#E0E0E0', fontSize: 16 }}>
            <strong style={{ color: '#D4A017' }}>{String(worker.rate)}</strong> · keeps 100%
          </p>
        ) : null}

        {worker.bio ? (
          <p style={{ marginTop: 16, color: '#a8c4d8', fontSize: 15, lineHeight: 1.6 }}>{String(worker.bio)}</p>
        ) : null}

        {alts.length > 0 ? (
          <div style={{ marginTop: 28 }}>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 2,
                color: '#D4A017',
                marginBottom: 12,
              }}
            >
              CORPORATE ALTERNATIVES
            </div>
            {alts.map((a, i) => {
              if (!a || typeof a !== 'object') return null;
              const o = /** @type {Record<string, unknown>} */ (a);
              const yr = o.left_year != null ? String(o.left_year) : '—';
              return (
                <div
                  key={i}
                  style={{
                    borderLeft: '3px solid #D4A017',
                    paddingLeft: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#f0e8d0' }}>{String(o.brand_name || '')}</div>
                  <div style={{ fontSize: 12, color: '#8a9aaa' }}>Left {yr}</div>
                  {o.reason ? <div style={{ fontSize: 13, color: '#a8c4d8', marginTop: 4 }}>{String(o.reason)}</div> : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {worker.union_affiliation ? (
          <p style={{ marginTop: 20, fontSize: 14, color: '#8a9aaa' }}>
            Union: <span style={{ color: '#c8d8e8' }}>{String(worker.union_affiliation)}</span>
          </p>
        ) : null}

        <p style={{ marginTop: 16, fontSize: 13, color: '#6a8a9a' }}>
          {witnessCount.toLocaleString()} neighbor{witnessCount === 1 ? '' : 's'} have vouched for this worker in the civic registry.
        </p>

        <button
          type="button"
          onClick={() => setMessageOpen(true)}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '12px',
            background: '#D4A017',
            border: 'none',
            color: '#0A1F3D',
            borderRadius: 6,
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          HIRE DIRECT ›
        </button>

        <button
          type="button"
          onClick={shareTwitter}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '10px',
            background: 'transparent',
            border: '1px solid #344d62',
            color: '#a8c4d8',
            borderRadius: 6,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1,
          }}
        >
          SHARE
        </button>
      </div>

      {messageOpen ? (
        <HireDirectMessageModal worker={worker} onClose={() => setMessageOpen(false)} />
      ) : null}
    </div>
  );
}
