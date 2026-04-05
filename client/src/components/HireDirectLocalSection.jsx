import { useCallback, useEffect, useState } from 'react';
import { hireDirectCategoryLabel } from '../constants/hireDirect.js';
import HireDirectMessageModal from './HireDirectMessageModal.jsx';
import WorkerRegistrationModal from './WorkerRegistrationModal.jsx';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

const FILTERS = [
  { key: 'all', label: 'ALL' },
  { key: 'delivery', label: 'DELIVERY' },
  { key: 'cleaning', label: 'CLEANING' },
  { key: 'handyman', label: 'HANDYMAN' },
  { key: 'grocery', label: 'GROCERY' },
  { key: 'more', label: 'MORE' },
];

/**
 * @param {{
 *   lat: number | null;
 *   lng: number | null;
 *   onWorkerProfile: (slug: string) => void;
 *   origin?: string;
 * }} props
 */
export default function HireDirectLocalSection({ lat, lng, onWorkerProfile, origin }) {
  const [filter, setFilter] = useState('all');
  const [workers, setWorkers] = useState(/** @type {unknown[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [messageWorker, setMessageWorker] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [registerOpen, setRegisterOpen] = useState(false);
  const [ledgerSlug, setLedgerSlug] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    try {
      setLedgerSlug(sessionStorage.getItem('ea_worker_slug'));
    } catch {
      setLedgerSlug(null);
    }
  }, [registerOpen]);

  const site =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    'https://ethicalalt-client.onrender.com';

  const load = useCallback(async () => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setWorkers([]);
      return;
    }
    setLoading(true);
    const base = apiPrefix();
    try {
      if (filter === 'all') {
        const url = base
          ? `${base}/api/workers/nearby?lat=${lat}&lng=${lng}&radius_km=25`
          : `/api/workers/nearby?lat=${lat}&lng=${lng}&radius_km=25`;
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        setWorkers(Array.isArray(data.workers) ? data.workers : []);
        return;
      }
      if (filter === 'more') {
        const lists = await Promise.all(
          ['lawn_garden', 'childcare', 'tech_help'].map(async (cat) => {
            const url = base
              ? `${base}/api/workers/nearby?lat=${lat}&lng=${lng}&category=${cat}`
              : `/api/workers/nearby?lat=${lat}&lng=${lng}&category=${cat}`;
            const res = await fetch(url);
            const data = await res.json().catch(() => ({}));
            return Array.isArray(data.workers) ? data.workers : [];
          })
        );
        const seen = new Set();
        /** @type {unknown[]} */
        const merged = [];
        for (const list of lists) {
          for (const w of list) {
            const id = w && typeof w === 'object' ? /** @type {{id?:unknown}} */ (w).id : null;
            if (id == null || seen.has(id)) continue;
            seen.add(id);
            merged.push(w);
          }
        }
        merged.sort((a, b) => {
          const da =
            a && typeof a === 'object' && typeof /** @type {{distance_miles?:number}} */ (a).distance_miles === 'number'
              ? /** @type {{distance_miles:number}} */ (a).distance_miles
              : 0;
          const db =
            b && typeof b === 'object' && typeof /** @type {{distance_miles?:number}} */ (b).distance_miles === 'number'
              ? /** @type {{distance_miles:number}} */ (b).distance_miles
              : 0;
          return da - db;
        });
        setWorkers(merged);
        return;
      }
      const url = base
        ? `${base}/api/workers/nearby?lat=${lat}&lng=${lng}&category=${encodeURIComponent(filter)}`
        : `/api/workers/nearby?lat=${lat}&lng=${lng}&category=${encodeURIComponent(filter)}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      setWorkers(Array.isArray(data.workers) ? data.workers : []);
    } catch {
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <div
      style={{
        margin: '28px 16px 0',
        padding: '20px 16px',
        border: '1px solid #2a3f52',
        borderRadius: 4,
        background: '#121820',
      }}
    >
      {ledgerSlug ? (
        <button
          type="button"
          onClick={() => onWorkerProfile(ledgerSlug)}
          style={{
            width: '100%',
            marginBottom: 16,
            padding: '10px 12px',
            background: 'rgba(212,160,23,0.12)',
            border: '1px solid rgba(212,160,23,0.4)',
            borderRadius: 6,
            color: '#D4A017',
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1,
            cursor: 'pointer',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          You are on the Hire Direct ledger › View your profile
        </button>
      ) : null}

      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 13,
          letterSpacing: 2,
          color: '#D4A017',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        HIRE DIRECT
      </div>
      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, color: '#8a9aaa', marginBottom: 14 }}>
        Local workers who replaced corporate gigs
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 1,
              padding: '5px 10px',
              borderRadius: 999,
              border: filter === f.key ? '1px solid #D4A017' : '1px solid #344d62',
              background: filter === f.key ? 'rgba(212,160,23,0.12)' : 'transparent',
              color: filter === f.key ? '#D4A017' : '#6a8a9a',
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!hasGeo ? (
        <p style={{ color: '#6a8a9a', fontSize: 14, margin: 0 }}>Enable location or set your city to see workers.</p>
      ) : loading ? (
        <p style={{ color: '#6a8a9a', fontSize: 12, margin: 0 }}>Loading…</p>
      ) : workers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <p style={{ color: '#6a8a9a', fontSize: 13, margin: '0 0 10px' }}>No workers in this filter yet.</p>
          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            style={{
              background: 'transparent',
              border: '1px solid #D4A017',
              color: '#D4A017',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Register as a local worker ›
          </button>
        </div>
      ) : (
        workers.map((raw) => {
          const w = /** @type {Record<string, unknown>} */ (raw);
          const slug = String(w.slug || '');
          const cat = String(w.category || '');
          const dist =
            typeof w.distance_miles === 'number' && Number.isFinite(w.distance_miles) ? w.distance_miles : null;
          const alts = Array.isArray(w.corporate_alternatives) ? w.corporate_alternatives : [];
          return (
            <div
              key={String(w.id)}
              style={{
                background: 'rgba(212,160,23,0.06)',
                border: '1px solid rgba(212,160,23,0.2)',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => slug && onWorkerProfile(slug)}
                onKeyDown={(e) => e.key === 'Enter' && slug && onWorkerProfile(slug)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#E0E0E0', fontWeight: 600 }}>
                      {String(w.display_name || '')}
                    </div>
                    <div style={{ fontSize: 10, color: '#7a9aaa', marginTop: 3 }}>
                      {String(w.city || '')}, {String(w.state_code || '')}
                      {dist != null ? ` · ${dist.toFixed(1)} mi` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: 1,
                        color: '#D4A017',
                        border: '1px solid rgba(212,160,23,0.4)',
                        borderRadius: 999,
                        padding: '2px 8px',
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      {hireDirectCategoryLabel(cat).toUpperCase()}
                    </span>
                    {w.is_civic_verified ? (
                      <span style={{ fontSize: 9, color: '#D4A017', letterSpacing: 1 }}>CIVIC ✓</span>
                    ) : null}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#A8C4D8', marginTop: 6, fontStyle: 'italic' }}>
                  {String(w.tagline || '')}
                </div>
                {alts.length > 0 ? (
                  <div style={{ fontSize: 10, color: '#5a7a8a', marginTop: 4 }}>
                    Left:{' '}
                    {alts
                      .map((a) =>
                        a && typeof a === 'object' ? String(/** @type {{brand_name?:string}} */ (a).brand_name || '') : ''
                      )
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setMessageWorker(w)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  background: '#D4A017',
                  color: '#0A1F3D',
                  borderRadius: 6,
                  padding: '7px',
                  fontSize: 12,
                  fontWeight: 800,
                  border: 'none',
                  marginTop: 8,
                  cursor: 'pointer',
                }}
              >
                HIRE DIRECT ›
              </button>
            </div>
          );
        })
      )}

      {messageWorker ? (
        <HireDirectMessageModal worker={messageWorker} onClose={() => setMessageWorker(null)} />
      ) : null}
      {registerOpen ? <WorkerRegistrationModal onClose={() => setRegisterOpen(false)} origin={site} /> : null}
    </div>
  );
}
