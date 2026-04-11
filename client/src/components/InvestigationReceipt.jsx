import { useCallback, useEffect, useState } from 'react';

const RECEIPT_RULE = '━━━━━━━━━━━━━━━━━━━━━━━━━';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function formatSigPreview(sig) {
  const s = String(sig || '');
  const m = s.match(/^ed25519:(.+)$/);
  const body = m ? m[1] : s;
  if (body.length <= 16) return s || '—';
  return `ed25519:${body.slice(0, 8)}…${body.slice(-8)}`;
}

/**
 * @param {{
 *   investigation: Record<string, unknown> | null | undefined;
 * }} props
 */
export default function InvestigationReceipt({ investigation }) {
  const inv = investigation || {};
  const brandSlug =
    typeof inv.brand_slug === 'string' && inv.brand_slug.trim() ? inv.brand_slug.trim().toLowerCase() : '';
  const brandName = typeof inv.brand === 'string' && inv.brand.trim() ? inv.brand.trim() : brandSlug;
  const lastDeep =
    typeof inv.last_deep_researched === 'string' && inv.last_deep_researched.trim()
      ? inv.last_deep_researched.trim()
      : '';
  const dataSource =
    typeof inv.data_source === 'string' && inv.data_source.trim() ? inv.data_source.trim() : null;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(/** @type {string | null} */ (null));
  const [payload, setPayload] = useState(/** @type {Record<string, unknown> | null} */ (null));

  useEffect(() => {
    if (!brandSlug || !lastDeep) {
      setPayload(null);
      setErr(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErr(null);

    const base = apiPrefix();
    const url = base ? `${base}/api/receipt/generate` : '/api/receipt/generate';

    (async () => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: brandSlug,
            data_source: dataSource || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          const msg =
            data?.error === 'signing_key_unconfigured'
              ? 'Receipt signing is not configured on this server.'
              : data?.error === 'no_deep_research'
                ? 'No deep research snapshot for this profile yet.'
                : data?.error === 'profile_not_found'
                  ? 'Profile not found.'
                  : 'Could not generate receipt.';
          setErr(msg);
          setPayload(null);
          return;
        }
        setPayload(data);
        setErr(null);
      } catch {
        if (!cancelled) {
          setErr('Network error generating receipt.');
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [brandSlug, lastDeep, dataSource]);

  const onVerify = useCallback(() => {
    const u = payload && typeof payload.verify_url === 'string' ? payload.verify_url : '';
    if (u) window.open(u, '_blank', 'noopener,noreferrer');
  }, [payload]);

  const onDownloadJson = useCallback(() => {
    if (!payload) return;
    const bundle = {
      receipt_id: payload.receipt_id,
      signed_receipt: payload.signed_receipt,
      signature: payload.signature,
      public_key: payload.public_key,
      verify_url: payload.verify_url,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    const dateStr = d.toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `ethicalalt-receipt-${brandSlug || 'report'}-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [payload, brandSlug]);

  const onShare = useCallback(async () => {
    if (!payload) return;
    const receiptId = typeof payload.receipt_id === 'string' ? payload.receipt_id : '';
    const verifyUrl = typeof payload.verify_url === 'string' ? payload.verify_url : '';
    const base = apiPrefix();
    const pdfUrl = base
      ? `${base}/api/receipt/${encodeURIComponent(receiptId)}/pdf`
      : `/api/receipt/${encodeURIComponent(receiptId)}/pdf`;

    const title = `EthicalAlt Receipt: ${brandName}`;
    const text = `Investigation receipt for ${brandName} — signed by EthicalAlt. Verify: ${verifyUrl}`;

    try {
      const pdfRes = await fetch(pdfUrl);
      if (!pdfRes.ok) throw new Error('pdf');
      const pdfBlob = await pdfRes.blob();
      const pdfFile = new File([pdfBlob], `ethicalalt-receipt-${brandSlug}-${receiptId.slice(0, 8)}.pdf`, {
        type: 'application/pdf',
      });

      const jsonBundle = {
        receipt_id: payload.receipt_id,
        signed_receipt: payload.signed_receipt,
        signature: payload.signature,
        public_key: payload.public_key,
        verify_url: payload.verify_url,
      };
      const jsonBlob = new Blob([JSON.stringify(jsonBundle, null, 2)], { type: 'application/json' });
      const jsonFile = new File([jsonBlob], `ethicalalt-receipt-${brandSlug}-${receiptId.slice(0, 8)}.json`, {
        type: 'application/json',
      });

      const shareData = { title, text, url: verifyUrl };
      if (navigator.share && navigator.canShare) {
        const withPdfJson = { ...shareData, files: [pdfFile, jsonFile] };
        if (navigator.canShare(withPdfJson)) {
          await navigator.share(withPdfJson);
          return;
        }
        const withPdfOnly = { ...shareData, files: [pdfFile] };
        if (navigator.canShare(withPdfOnly)) {
          await navigator.share(withPdfOnly);
          return;
        }
      }
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* fall through */
    }

    try {
      if (verifyUrl) window.open(verifyUrl, '_blank', 'noopener,noreferrer');
    } catch {
      /* ignore */
    }
  }, [payload, brandName, brandSlug]);

  if (!brandSlug || !lastDeep) return null;

  const receipt = payload && payload.signed_receipt && typeof payload.signed_receipt === 'object' ? payload.signed_receipt : null;
  const incidentCount =
    receipt && typeof receipt.incident_count === 'number' && Number.isFinite(receipt.incident_count)
      ? receipt.incident_count
      : '—';
  const sourceCount =
    receipt && typeof receipt.source_count === 'number' && Number.isFinite(receipt.source_count)
      ? receipt.source_count
      : '—';
  const investigated =
    receipt && typeof receipt.investigated_at === 'string'
      ? new Date(receipt.investigated_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '—';

  return (
    <div
      className="investigation-receipt"
      style={{
        marginTop: 28,
        padding: '20px 18px',
        maxWidth: 420,
        marginLeft: 'auto',
        marginRight: 'auto',
        fontFamily: "'Space Mono', ui-monospace, monospace",
        fontSize: 11,
        color: '#f0a820',
        background: 'linear-gradient(180deg, rgba(15,21,32,0.95) 0%, rgba(12,18,28,0.98) 100%)',
        borderTop: '2px dashed rgba(240,168,32,0.45)',
        borderBottom: '2px dashed rgba(240,168,32,0.45)',
        borderLeft: '1px solid rgba(240,168,32,0.2)',
        borderRight: '1px solid rgba(240,168,32,0.2)',
        borderRadius: 2,
      }}
    >
      <div style={{ letterSpacing: 2, textAlign: 'center', marginBottom: 10, fontSize: 10 }}>{RECEIPT_RULE}</div>
      <div style={{ letterSpacing: 3, textAlign: 'center', fontWeight: 700, marginBottom: 4 }}>
        ETHICALALT INVESTIGATION RECEIPT
      </div>
      <div style={{ letterSpacing: 2, textAlign: 'center', marginBottom: 14, fontSize: 10, opacity: 0.85 }}>
        {RECEIPT_RULE}
      </div>

      {loading ? (
        <p style={{ color: '#a8c4d8', textAlign: 'center', margin: '12px 0' }}>Preparing receipt…</p>
      ) : null}
      {err ? (
        <p style={{ color: '#d4a574', textAlign: 'center', margin: '12px 0', lineHeight: 1.5 }}>{err}</p>
      ) : null}

      {!loading && !err && receipt ? (
        <>
          <div style={{ color: '#e8dcc8', lineHeight: 1.7 }}>
            <div>
              <span style={{ color: '#8a9aac' }}>Subject:</span> {brandName}
            </div>
            <div>
              <span style={{ color: '#8a9aac' }}>Investigated:</span> {investigated}
            </div>
            <div>
              <span style={{ color: '#8a9aac' }}>Sources:</span> {sourceCount} verified
            </div>
            <div>
              <span style={{ color: '#8a9aac' }}>Incidents:</span> {incidentCount} documented
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{ color: '#8a9aac' }}>Signature:</span>{' '}
              {formatSigPreview(/** @type {string} */ (payload?.signature))}
            </div>
          </div>
          <div style={{ letterSpacing: 2, textAlign: 'center', margin: '14px 0 10px', fontSize: 10, opacity: 0.75 }}>
            {RECEIPT_RULE}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              justifyContent: 'center',
              marginTop: 8,
            }}
          >
            <button
              type="button"
              className="app__btn app__btn--ghost"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 1.5,
                borderColor: 'rgba(240,168,32,0.5)',
                color: '#f0a820',
              }}
              onClick={onVerify}
            >
              VERIFY →
            </button>
            <button
              type="button"
              className="app__btn app__btn--ghost"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 1.5,
                borderColor: 'rgba(240,168,32,0.5)',
                color: '#f0a820',
              }}
              onClick={() => void onShare()}
            >
              SHARE RECEIPT ↑
            </button>
            <button
              type="button"
              className="app__btn app__btn--ghost"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 1.5,
                borderColor: 'rgba(240,168,32,0.5)',
                color: '#f0a820',
              }}
              onClick={onDownloadJson}
            >
              DOWNLOAD JSON
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
