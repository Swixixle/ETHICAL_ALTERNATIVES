import { useCallback, useEffect, useMemo, useState } from 'react';
import { readCachedLocation } from '../services/location.js';
import HireDirectMessageModal from './HireDirectMessageModal.jsx';
import WorkerRegistrationModal from './WorkerRegistrationModal.jsx';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

/**
 * @param {{
 *   hireDirectCategories: string[];
 *   onShareFootnoteChange?: (footnote: string) => void;
 * }} props
 */
export default function HireDirectInvestigationBlock({ hireDirectCategories = [], onShareFootnoteChange }) {
  const [workersByCat, setWorkersByCat] = useState(/** @type {Record<string, unknown[]>} */ ({}));
  const [loading, setLoading] = useState(false);
  const [messageWorker, setMessageWorker] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [registerOpen, setRegisterOpen] = useState(false);

  const cats = useMemo(
    () => (Array.isArray(hireDirectCategories) ? hireDirectCategories.map(String) : []),
    [hireDirectCategories]
  );

  const load = useCallback(async () => {
    if (!cats.length) return;
    const loc = readCachedLocation();
    const lat = typeof loc?.lat === 'number' ? loc.lat : null;
    const lng = typeof loc?.lng === 'number' ? loc.lng : null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setWorkersByCat({});
      return;
    }
    setLoading(true);
    const base = apiPrefix();
    try {
      /** @type {Record<string, unknown[]>} */
      const acc = {};
      await Promise.all(
        cats.map(async (cat) => {
          const url = base
            ? `${base}/api/workers/nearby?lat=${lat}&lng=${lng}&category=${encodeURIComponent(cat)}`
            : `/api/workers/nearby?lat=${lat}&lng=${lng}&category=${encodeURIComponent(cat)}`;
          const res = await fetch(url);
          const data = await res.json().catch(() => ({}));
          const list = Array.isArray(data.workers) ? data.workers : [];
          acc[cat] = list;
        })
      );
      setWorkersByCat(acc);
    } catch {
      setWorkersByCat({});
    } finally {
      setLoading(false);
    }
  }, [cats]);

  useEffect(() => {
    void load();
  }, [load]);

  const mergedWorkers = useMemo(() => {
    const seen = new Set();
    /** @type {unknown[]} */
    const out = [];
    for (const cat of cats) {
      const list = workersByCat[cat] || [];
      for (const w of list) {
        if (!w || typeof w !== 'object') continue;
        const id = /** @type {{ id?: unknown }} */ (w).id;
        if (id == null || seen.has(id)) continue;
        seen.add(id);
        out.push(w);
      }
    }
    return out.slice(0, 12);
  }, [cats, workersByCat]);

  const site =
    typeof window !== 'undefined' ? window.location.origin : 'https://ethicalalt-client.onrender.com';

  useEffect(() => {
    if (!onShareFootnoteChange) return;
    if (!mergedWorkers.length) {
      onShareFootnoteChange('');
      return;
    }
    const lines = mergedWorkers
      .slice(0, 3)
      .map((w) => {
        const o = /** @type {Record<string, unknown>} */ (w);
        const slug = String(o.slug || '');
        const name = String(o.display_name || 'Worker');
        if (!slug) return null;
        return `${name}: ${site}/workers/${slug}`;
      })
      .filter(Boolean);
    onShareFootnoteChange(lines.length ? `Hire direct nearby — ${lines.join(' · ')}` : '');
  }, [mergedWorkers, onShareFootnoteChange, site]);

  if (!cats.length) return null;

  const loc = readCachedLocation();
  const hasGeo = typeof loc?.lat === 'number' && typeof loc?.lng === 'number';
  const anyWorkers = mergedWorkers.length > 0;

  return (
    <div style={{ marginTop: 20, marginBottom: 8 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          color: '#D4A017',
          marginBottom: 10,
          fontFamily: "'Space Mono', monospace",
          textTransform: 'uppercase',
        }}
      >
        HIRE DIRECT — AVOID THE MIDDLEMAN
      </div>
      <div style={{ fontSize: 12, color: '#6A8A9A', marginBottom: 12, lineHeight: 1.5 }}>
        Local workers in your area who do this work directly. They set their own rates and keep everything they earn.
      </div>

      {!hasGeo ? (
        <div style={{ fontSize: 13, color: '#a8c4d8', padding: '12px 0' }}>
          Set your location (city or GPS) to see local workers here.
        </div>
      ) : loading ? (
        <div style={{ fontSize: 12, color: '#6A8A9A', padding: '12px 0' }}>Loading workers…</div>
      ) : anyWorkers ? (
        mergedWorkers.map((raw) => {
          const worker = /** @type {Record<string, unknown>} */ (raw);
          const alts = Array.isArray(worker.corporate_alternatives) ? worker.corporate_alternatives : [];
          const dist =
            typeof worker.distance_miles === 'number' && Number.isFinite(worker.distance_miles)
              ? worker.distance_miles
              : null;
          return (
            <div
              key={String(worker.id)}
              style={{
                background: 'rgba(212,160,23,0.08)',
                border: '1px solid rgba(212,160,23,0.25)',
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, color: '#E0E0E0', fontWeight: 600 }}>
                    {String(worker.display_name || '')}
                  </div>
                  <div style={{ fontSize: 11, color: '#A8C4D8', marginTop: 2 }}>
                    {String(worker.city || '')}, {String(worker.state_code || '')}
                    {dist != null ? ` · ${dist.toFixed(1)} mi` : ''}
                  </div>
                </div>
                {worker.is_civic_verified ? (
                  <span
                    style={{
                      fontSize: 10,
                      color: '#D4A017',
                      border: '1px solid #D4A017',
                      borderRadius: 4,
                      padding: '2px 6px',
                      letterSpacing: 1,
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    CIVIC VERIFIED
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: 12, color: '#A8C4D8', marginTop: 6, fontStyle: 'italic' }}>
                {String(worker.tagline || '')}
              </div>
              {alts.length > 0 ? (
                <div style={{ fontSize: 11, color: '#6A8A9A', marginTop: 4 }}>
                  Left:{' '}
                  {alts
                    .map((a) => (a && typeof a === 'object' ? String(/** @type {{brand_name?:string}} */ (a).brand_name || '') : ''))
                    .filter(Boolean)
                    .join(', ')}
                </div>
              ) : null}
              {worker.rate ? (
                <div style={{ fontSize: 11, color: '#D4A017', marginTop: 4 }}>
                  {String(worker.rate)} · keeps 100%
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setMessageWorker(worker)}
                style={{
                  marginTop: 10,
                  width: '100%',
                  background: '#D4A017',
                  color: '#0A1F3D',
                  border: 'none',
                  borderRadius: 6,
                  padding: '9px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                HIRE DIRECT ›
              </button>
            </div>
          );
        })
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 13, color: '#6A8A9A', marginBottom: 8 }}>
            No local workers registered in your area yet.
          </div>
          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            style={{
              background: 'transparent',
              border: '1px solid #D4A017',
              color: '#D4A017',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Register as a local worker ›
          </button>
        </div>
      )}

      {messageWorker ? (
        <HireDirectMessageModal worker={messageWorker} onClose={() => setMessageWorker(null)} />
      ) : null}
      {registerOpen ? (
        <WorkerRegistrationModal onClose={() => setRegisterOpen(false)} origin={site} />
      ) : null}
    </div>
  );
}
