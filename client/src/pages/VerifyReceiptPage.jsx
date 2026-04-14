import { useEffect, useState } from 'react';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

/**
 * @param {{ receiptId: string; onHome: () => void }} props
 */
export default function VerifyReceiptPage({ receiptId, onHome }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [err, setErr] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    const id = String(receiptId || '').trim();
    if (!id) {
      setLoading(false);
      setErr('Missing receipt ID.');
      return undefined;
    }

    let cancelled = false;
    const base = apiPrefix();
    const url = base
      ? `${base}/api/receipt/verify/${encodeURIComponent(id)}`
      : `/api/receipt/verify/${encodeURIComponent(id)}`;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setData(null);
          setErr(json?.error === 'not_found' ? 'Receipt not found.' : 'Could not verify receipt.');
          return;
        }
        setData(json);
        setErr(null);
      } catch {
        if (!cancelled) {
          setData(null);
          setErr('Network error.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  const valid = data && data.signature_verified === true;
  const receipt = data && data.receipt && typeof data.receipt === 'object' ? data.receipt : null;
  const subject = receipt?.subject && typeof receipt.subject === 'object' ? receipt.subject : null;
  const brandName =
    subject && typeof subject.brand_name === 'string' ? subject.brand_name : '—';

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 48px' }}>
      <button type="button" className="app__btn app__btn--ghost" onClick={onHome} style={{ marginBottom: 24 }}>
        ← Home
      </button>

      <h1
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 12,
          letterSpacing: 3,
          color: '#f0a820',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Receipt verification
      </h1>
      <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 16, color: '#a8c4d8', lineHeight: 1.6, marginTop: 0 }}>
        Independent check of the EthicalAlt cryptographic signature for this investigation receipt.
      </p>

      {loading ? (
        <p className="app__text-loader" role="status" aria-busy="true">
          Verifying…
        </p>
      ) : null}

      {err ? (
        <p style={{ color: '#d4a574', fontFamily: "'Crimson Pro', serif", fontSize: 16 }}>{err}</p>
      ) : null}

      {!loading && !err && data ? (
        <div
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 4,
            border: '1px solid rgba(240,168,32,0.25)',
            background: 'rgba(15,21,32,0.6)',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <span
              style={{
                display: 'inline-block',
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                padding: '6px 12px',
                borderRadius: 2,
                background: valid ? 'rgba(106,170,138,0.2)' : 'rgba(212,100,100,0.2)',
                color: valid ? '#8fcfad' : '#e8a0a0',
                border: `1px solid ${valid ? 'rgba(106,170,138,0.4)' : 'rgba(212,100,100,0.4)'}`,
              }}
            >
              {valid ? 'Signature valid' : 'Invalid or unverifiable'}
            </span>
          </div>

          <dl style={{
              margin: 0,
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: '#e8dcc8',
              lineHeight: 1.8,
            }}
          >
            <dt style={{ color: '#6a8a9a' }}>Receipt ID</dt>
            <dd style={{ margin: '0 0 12px' }}>{receiptId}</dd>
            <dt style={{ color: '#6a8a9a' }}>Subject</dt>
            <dd style={{ margin: '0 0 12px' }}>{brandName}</dd>
            <dt style={{ color: '#6a8a9a' }}>Verified at</dt>
            <dd style={{ margin: '0 0 12px' }}>
              {typeof data.verified_at === 'string' ? data.verified_at : '—'}
            </dd>
            <dt style={{ color: '#6a8a9a' }}>Signature</dt>
            <dd style={{ margin: '0 0 12px', wordBreak: 'break-all' }}>
              {typeof data.signature === 'string' ? data.signature : '—'}
            </dd>
            {receipt && typeof receipt.incident_count === 'number' ? (
              <>
                <dt
                  style={{ color: '#6a8a9a', cursor: 'help' }}
                  title="Incident count reflects the research snapshot at the time this receipt was signed. Live profiles may show a revised count after deduplication."
                >
                  Incident rows (signed bundle)
                </dt>
                <dd style={{ margin: '0 0 12px' }}>
                  {receipt.incident_count}
                  <span
                    role="note"
                    style={{ display: 'block', color: '#5a7a8a', fontSize: 10, marginTop: 4, lineHeight: 1.5 }}
                  >
                    Incident count reflects the research snapshot at the time this receipt was signed. Live profiles
                    may show a revised count after deduplication.
                  </span>
                </dd>
              </>
            ) : null}
            {receipt && typeof receipt.source_count === 'number' ? (
              <>
                <dt style={{ color: '#6a8a9a' }}>Source URLs</dt>
                <dd style={{ margin: 0 }}>{receipt.source_count}</dd>
              </>
            ) : null}
          </dl>

          {receipt && typeof receipt.disclaimer === 'string' ? (
            <p
              style={{
                marginTop: 20,
                fontFamily: "'Crimson Pro', serif",
                fontSize: 13,
                color: '#8a9aac',
                lineHeight: 1.6,
              }}
            >
              {receipt.disclaimer}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
