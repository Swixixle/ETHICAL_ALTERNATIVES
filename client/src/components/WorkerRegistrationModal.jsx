import { useCallback, useState } from 'react';
import { WORKER_CATEGORY_OPTIONS } from '../constants/hireDirect.js';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

const CONTACT_OPTS = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'signal', label: 'Signal' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

/**
 * @param {{ onClose: () => void; origin?: string }} props
 */
export default function WorkerRegistrationModal({ onClose, origin }) {
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [category, setCategory] = useState('delivery');
  const [tagline, setTagline] = useState('');
  const [rate, setRate] = useState('');
  const [availability, setAvailability] = useState('');
  const [bio, setBio] = useState('');
  const [contactMethod, setContactMethod] = useState('phone');
  const [contactValue, setContactValue] = useState('');
  const [union, setUnion] = useState('');
  const [altRows, setAltRows] = useState(() => [
    { brand_name: '', left_year: '', reason: '' },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(/** @type {string | null} */ (null));
  const [registerDone, setRegisterDone] = useState(false);
  const [createdSlug, setCreatedSlug] = useState(/** @type {string | null} */ (null));

  const site =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    'https://ethicalalt-client.onrender.com';

  const addAltRow = useCallback(() => {
    setAltRows((r) => (r.length >= 5 ? r : [...r, { brand_name: '', left_year: '', reason: '' }]));
  }, []);

  const submit = useCallback(async () => {
    setErr(null);
    if (!displayName.trim() || !city.trim() || !stateCode.trim() || !tagline.trim()) {
      setErr('Name, city, state, and tagline are required.');
      return;
    }
    if (stateCode.trim().length !== 2) {
      setErr('Use a two-letter state code (e.g. OH).');
      return;
    }
    if (!contactValue.trim()) {
      setErr('Add how customers should reach you.');
      return;
    }

    const corporate_alternatives = altRows
      .map((row) => ({
        brand_name: row.brand_name.trim(),
        brand_slug: row.brand_name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-'),
        left_year: row.left_year ? parseInt(row.left_year, 10) : null,
        reason: row.reason.trim() || null,
      }))
      .filter((r) => r.brand_name);

    setBusy(true);
    try {
      const base = apiPrefix();
      const url = base ? `${base}/api/workers/register` : `/api/workers/register`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          city: city.trim(),
          state_code: stateCode.trim().toUpperCase(),
          category,
          tagline: tagline.trim().slice(0, 80),
          bio: bio.trim() || null,
          rate: rate.trim() || null,
          availability: availability.trim() || 'available',
          contact_method: contactMethod,
          contact_value: contactValue.trim(),
          corporate_alternatives,
          union_affiliation: union.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      const slug = typeof data.slug === 'string' ? data.slug : '';
      try {
        if (slug) sessionStorage.setItem('ea_worker_slug', slug);
      } catch {
        /* ignore */
      }
      setCreatedSlug(slug || null);
      setRegisterDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }, [
    displayName,
    city,
    stateCode,
    category,
    tagline,
    rate,
    availability,
    bio,
    contactMethod,
    contactValue,
    union,
    altRows,
  ]);

  if (registerDone) {
    const link = createdSlug ? `${site}/workers/${createdSlug}` : site;
    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 10, 18, 0.9)',
          zIndex: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            background: '#121a28',
            border: '1px solid rgba(212,160,23,0.35)',
            borderRadius: 8,
            padding: 22,
            boxSizing: 'border-box',
          }}
        >
          <p style={{ color: '#E0E0E0', fontSize: 16, lineHeight: 1.55, margin: '0 0 12px' }}>
            You are on the Hire Direct ledger. Local customers investigating corporations will find you.
          </p>
          {createdSlug ? (
            <>
              <p style={{ color: '#a8c4d8', fontSize: 13, margin: '0 0 8px' }}>Share your profile:</p>
              <code
                style={{
                  display: 'block',
                  background: '#0f1520',
                  padding: 10,
                  borderRadius: 6,
                  color: '#D4A017',
                  fontSize: 12,
                  wordBreak: 'break-all',
                }}
              >
                {link}
              </code>
            </>
          ) : (
            <p style={{ color: '#a8c4d8', fontSize: 13 }}>
              Registration succeeded — open the Local tab to view your profile when available.
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: 18,
              width: '100%',
              padding: '11px',
              background: '#D4A017',
              border: 'none',
              color: '#0A1F3D',
              borderRadius: 6,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const field = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#0f1520',
    border: '1px solid #2a3f52',
    borderRadius: 6,
    color: '#f0e8d0',
    padding: '10px 12px',
    fontFamily: "'Crimson Pro', serif",
    fontSize: 16,
  };

  const sectionTitle = (t) => (
    <div
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 10,
        letterSpacing: 2,
        color: '#D4A017',
        margin: '18px 0 10px',
        textTransform: 'uppercase',
      }}
    >
      {t}
    </div>
  );

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 10, 18, 0.88)',
        zIndex: 400,
        overflowY: 'auto',
        padding: 'max(16px, env(safe-area-inset-top)) 16px 32px',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: 480,
          margin: '0 auto',
          background: '#121a28',
          border: '1px solid rgba(212,160,23,0.35)',
          borderRadius: 8,
          padding: 20,
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#E0E0E0' }}>Join Hire Direct</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a8a9a', cursor: 'pointer', fontSize: 20 }}>
            ×
          </button>
        </div>

        {sectionTitle('Who you are')}
        <input style={field} placeholder="Display name *" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input style={{ ...field, flex: 2 }} placeholder="City *" value={city} onChange={(e) => setCity(e.target.value)} />
          <input
            style={{ ...field, flex: 1, maxWidth: 88 }}
            placeholder="ST *"
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value.toUpperCase().slice(0, 2))}
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ ...field, marginTop: 10, cursor: 'pointer' }}
        >
          {WORKER_CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          style={{ ...field, marginTop: 10 }}
          placeholder="Tagline — one line what you do * (max 80)"
          maxLength={80}
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
        />

        {sectionTitle('Your rate & availability')}
        <input style={{ ...field, marginTop: 0 }} placeholder="Rate (e.g. $25/hr, negotiable)" value={rate} onChange={(e) => setRate(e.target.value)} />
        <input
          style={{ ...field, marginTop: 10 }}
          placeholder="Availability (e.g. weekends, evenings)"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
        />
        <textarea
          style={{ ...field, marginTop: 10, minHeight: 72, resize: 'vertical' }}
          placeholder="Bio (optional, max 280)"
          maxLength={280}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        {sectionTitle('Corporate alternatives')}
        <p style={{ color: '#6A8A9A', fontSize: 12, margin: '0 0 10px', lineHeight: 1.45 }}>
          What corporations do you replace or refuse to work with? This tells customers why you work direct and
          builds trust.
        </p>
        {altRows.map((row, i) => (
          <div key={i} style={{ marginBottom: 10, padding: 10, border: '1px solid #283648', borderRadius: 6 }}>
            <input
              style={{ ...field, marginBottom: 8 }}
              placeholder="Brand name"
              value={row.brand_name}
              onChange={(e) => {
                const v = e.target.value;
                setAltRows((rows) => rows.map((r, j) => (j === i ? { ...r, brand_name: v } : r)));
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...field, maxWidth: 100 }}
                placeholder="Left year"
                value={row.left_year}
                onChange={(e) => {
                  const v = e.target.value;
                  setAltRows((rows) => rows.map((r, j) => (j === i ? { ...r, left_year: v } : r)));
                }}
              />
              <input
                style={{ ...field, flex: 1 }}
                placeholder="Reason (optional)"
                value={row.reason}
                onChange={(e) => {
                  const v = e.target.value;
                  setAltRows((rows) => rows.map((r, j) => (j === i ? { ...r, reason: v } : r)));
                }}
              />
            </div>
          </div>
        ))}
        {altRows.length < 5 ? (
          <button
            type="button"
            onClick={addAltRow}
            style={{
              background: 'transparent',
              border: '1px dashed #6a8a9a',
              color: '#a8c4d8',
              borderRadius: 6,
              padding: '8px 12px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            + Add corporation
          </button>
        ) : null}

        {sectionTitle('How to reach you')}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 0 }}>
          {CONTACT_OPTS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setContactMethod(o.value)}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                padding: '6px 10px',
                borderRadius: 999,
                border: contactMethod === o.value ? '1px solid #D4A017' : '1px solid #344d62',
                background: contactMethod === o.value ? 'rgba(212,160,23,0.15)' : 'transparent',
                color: contactMethod === o.value ? '#D4A017' : '#8a9aaa',
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        <input
          style={{ ...field, marginTop: 10 }}
          placeholder="Phone, email, or handle"
          value={contactValue}
          onChange={(e) => setContactValue(e.target.value)}
        />
        <p style={{ color: '#5a6a78', fontSize: 11, margin: '8px 0 0' }}>
          Only shared when someone sends you a message. Never displayed publicly.
        </p>
        <input
          style={{ ...field, marginTop: 12 }}
          placeholder="Union affiliation (optional)"
          value={union}
          onChange={(e) => setUnion(e.target.value)}
        />

        {err ? <p style={{ color: '#ff6b6b', fontSize: 13, marginTop: 12 }}>{err}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          style={{
            marginTop: 18,
            width: '100%',
            padding: '12px',
            background: '#D4A017',
            border: 'none',
            color: '#0A1F3D',
            borderRadius: 6,
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 1,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          JOIN HIRE DIRECT ›
        </button>
      </div>
    </div>
  );
}
