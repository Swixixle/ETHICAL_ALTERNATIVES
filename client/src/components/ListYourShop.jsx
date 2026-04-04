import { useState } from 'react';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
function sellersPostUrl() {
  return apiBase ? `${apiBase}/api/sellers` : '/api/sellers';
}

const CATEGORIES = [
  { value: 'clothing', label: 'Clothing & Fashion' },
  { value: 'coffee', label: 'Coffee & Tea' },
  { value: 'food', label: 'Food & Pantry' },
  { value: 'ceramics', label: 'Ceramics & Pottery' },
  { value: 'personal_care', label: 'Personal Care & Beauty' },
  { value: 'candles', label: 'Candles & Fragrance' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'art', label: 'Art & Prints' },
  { value: 'books', label: 'Books & Zines' },
  { value: 'plants', label: 'Plants & Garden' },
  { value: 'furniture', label: 'Furniture & Woodworking' },
  { value: 'textiles', label: 'Textiles & Fiber Arts' },
  { value: 'vintage', label: 'Vintage & Secondhand' },
  { value: 'handmade', label: 'Handmade (general)' },
  { value: 'outdoor', label: 'Outdoor & Gear' },
  { value: 'electronics', label: 'Electronics & Repair' },
  { value: 'other', label: 'Other' },
];

function labelStyle(required) {
  return {
    fontFamily: "'Space Mono', monospace",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: required ? '#e8a020' : '#4a6478',
    display: 'block',
    marginBottom: 4,
    marginTop: 16,
  };
}

const input = {
  width: '100%',
  background: '#0f1520',
  border: '1px solid #2a3f52',
  borderRadius: 2,
  padding: '8px 12px',
  fontFamily: "'Crimson Pro', serif",
  fontSize: 16,
  color: '#e8dfc8',
  boxSizing: 'border-box',
  outline: 'none',
};

export default function ListYourShop() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    seller_name: '',
    tagline: '',
    product_description: '',
    website_url: '',
    etsy_url: '',
    instagram_url: '',
    city: '',
    state_province: '',
    categories: [],
    keywords: '',
    ships_nationally: false,
    ships_worldwide: false,
    in_person_only: false,
    is_worker_owned: false,
    is_bcorp: false,
    is_fair_trade: false,
  });

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleCategory(val) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(val) ? f.categories.filter((c) => c !== val) : [...f.categories, val],
    }));
  }

  async function handleSubmit() {
    if (!form.seller_name.trim()) {
      setError('Shop name is required.');
      return;
    }
    if (!form.categories.length) {
      setError('Select at least one category.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body = {
        ...form,
        keywords: form.keywords
          ? form.keywords.split(',').map((k) => k.trim()).filter(Boolean)
          : [],
        submission_method: 'app',
      };

      const res = await fetch(sellersPostUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          background: 'rgba(106, 170, 138, 0.1)',
          border: '1px solid #6aaa8a',
          borderLeft: '3px solid #6aaa8a',
          padding: '16px 20px',
          marginTop: 20,
        }}
      >
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 22,
            color: '#6aaa8a',
            letterSpacing: 2,
            marginBottom: 6,
          }}
        >
          You&apos;re in.
        </div>
        <p
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 16,
            color: '#8fa8bc',
            margin: 0,
          }}
        >
          Appears within 48 hours. No account, no fees — we review every listing.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#e8a020',
          background: 'transparent',
          border: '1px solid #e8a020',
          borderRadius: 2,
          padding: '8px 18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        + List Your Shop — Free
      </button>

      {open ? (
        <div
          style={{
            background: '#162030',
            border: '1px solid #2a3f52',
            borderTop: '2px solid #e8a020',
            padding: '24px',
            marginTop: 12,
            borderRadius: '0 0 4px 4px',
          }}
        >
          <p
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontSize: 15,
              color: '#8fa8bc',
              margin: '0 0 20px',
              lineHeight: 1.6,
            }}
          >
            Independent maker, local shop, artisan, farmer, repair person? List free — no account. Shows up when
            someone taps something you&apos;re an ethical alternative to.
          </p>

          <span style={labelStyle(true)}>Shop / maker name *</span>
          <input
            style={input}
            value={form.seller_name}
            onChange={(e) => set('seller_name', e.target.value)}
            placeholder="e.g. Wrenfield Ceramics"
          />

          <span style={labelStyle(false)}>One-line description</span>
          <input
            style={input}
            value={form.tagline}
            onChange={(e) => set('tagline', e.target.value)}
            placeholder="e.g. Handthrown stoneware from Indianapolis"
          />

          <span style={labelStyle(false)}>What you make or sell</span>
          <textarea
            style={{ ...input, height: 80, resize: 'vertical' }}
            value={form.product_description}
            onChange={(e) => set('product_description', e.target.value)}
            placeholder="Materials, style, what makes it yours"
          />

          <span style={labelStyle(true)}>Categories * (tap all that apply)</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {CATEGORIES.map((cat) => {
              const selected = form.categories.includes(cat.value);
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    padding: '5px 10px',
                    borderRadius: 999,
                    border: selected ? '1px solid #e8a020' : '1px solid #2a3f52',
                    background: selected ? 'rgba(232,160,32,0.12)' : 'transparent',
                    color: selected ? '#e8a020' : '#4a6478',
                    cursor: 'pointer',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <span style={labelStyle(false)}>Keywords (comma-separated)</span>
          <input
            style={input}
            value={form.keywords}
            onChange={(e) => set('keywords', e.target.value)}
            placeholder="e.g. raw denim, natural dye, handknit, Cowichan"
          />

          <span style={labelStyle(false)}>Website</span>
          <input
            style={input}
            value={form.website_url}
            onChange={(e) => set('website_url', e.target.value)}
            placeholder="https://"
          />

          <span style={labelStyle(false)}>Etsy shop URL</span>
          <input
            style={input}
            value={form.etsy_url}
            onChange={(e) => set('etsy_url', e.target.value)}
            placeholder="https://etsy.com/shop/…"
          />

          <span style={labelStyle(false)}>Instagram</span>
          <input
            style={input}
            value={form.instagram_url}
            onChange={(e) => set('instagram_url', e.target.value)}
            placeholder="https://instagram.com/…"
          />

          <span style={labelStyle(false)}>City / state</span>
          <div style={{ display: 'flex', gap: '4%', flexWrap: 'wrap' }}>
            <input
              style={{ ...input, width: '48%', flex: '1 1 120px' }}
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="Indianapolis"
            />
            <input
              style={{ ...input, width: '48%', flex: '1 1 80px' }}
              value={form.state_province}
              onChange={(e) => set('state_province', e.target.value)}
              placeholder="IN"
            />
          </div>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['ships_nationally', 'Ships nationally'],
              ['ships_worldwide', 'Ships worldwide'],
              ['in_person_only', 'In-person / local pickup only'],
              ['is_worker_owned', 'Worker-owned or cooperative'],
              ['is_bcorp', 'B-Corp certified'],
              ['is_fair_trade', 'Fair Trade certified'],
            ].map(([key, label]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: '#4a6478',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(e) => set(key, e.target.checked)}
                  style={{ accentColor: '#e8a020' }}
                />
                {label}
              </label>
            ))}
          </div>

          {error ? (
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                color: '#ff6b6b',
                marginTop: 12,
              }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              marginTop: 20,
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              background: '#e8a020',
              color: '#0f1520',
              border: 'none',
              padding: '10px 24px',
              borderRadius: 2,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Submitting…' : 'Submit listing →'}
          </button>

          <p
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontSize: 13,
              color: '#4a6478',
              marginTop: 10,
              marginBottom: 0,
            }}
          >
            Free listing. We review submissions — independent businesses only.
          </p>
        </div>
      ) : null}
    </div>
  );
}
