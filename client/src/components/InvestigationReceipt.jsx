import { useCallback, useEffect, useMemo, useState } from 'react';
import { countIndexedSources } from '../utils/investigationSources.js';
import { computeIncidentIndexCounts } from '../utils/incidentIndexCounts.js';

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
  const [shareToast, setShareToast] = useState(/** @type {string | null} */ (null));

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

  /** Same-origin SPA route `/verify/:id` (avoids server VERIFY_BASE pointing at production when testing locally). */
  const verifyPageUrl = useMemo(() => {
    const rid = payload && typeof payload.receipt_id === 'string' ? payload.receipt_id.trim() : '';
    if (!rid || typeof window === 'undefined') return '';
    return `${window.location.origin}/verify/${encodeURIComponent(rid)}`;
  }, [payload]);

  const onVerify = useCallback(() => {
    if (verifyPageUrl) window.open(verifyPageUrl, '_blank', 'noopener,noreferrer');
  }, [verifyPageUrl]);

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

  const copyVerifyLinkWithToast = useCallback(async () => {
    if (!verifyPageUrl) return;
    try {
      await navigator.clipboard.writeText(verifyPageUrl);
      setShareToast('Link copied!');
      window.setTimeout(() => setShareToast(null), 2500);
    } catch {
      window.open(verifyPageUrl, '_blank', 'noopener,noreferrer');
    }
  }, [verifyPageUrl]);

  const onShare = useCallback(async () => {
    if (!payload) return;
    const receiptId = typeof payload.receipt_id === 'string' ? payload.receipt_id.trim() : '';
    if (!receiptId || typeof window === 'undefined') return;

    const verifyUrl = verifyPageUrl || `${window.location.origin}/verify/${encodeURIComponent(receiptId)}`;
    const title = `EthicalAlt Receipt: ${brandName}`;
    const text = `Investigation receipt for ${brandName} — signed by EthicalAlt. Verify: ${verifyUrl}`;

    if (typeof navigator.share !== 'function') {
      await copyVerifyLinkWithToast();
      return;
    }

    const base = apiPrefix();
    const pdfUrl = base
      ? `${base}/api/receipt/${encodeURIComponent(receiptId)}/pdf`
      : `/api/receipt/${encodeURIComponent(receiptId)}/pdf`;

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
        verify_url: verifyUrl,
      };
      const jsonBlob = new Blob([JSON.stringify(jsonBundle, null, 2)], { type: 'application/json' });
      const jsonFile = new File([jsonBlob], `ethicalalt-receipt-${brandSlug}-${receiptId.slice(0, 8)}.json`, {
        type: 'application/json',
      });

      const shareData = { title, text, url: verifyUrl };
      const canShare = typeof navigator.canShare === 'function';
      if (canShare) {
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
      await navigator.share(shareData);
    } catch {
      await copyVerifyLinkWithToast();
    }
  }, [payload, brandName, brandSlug, copyVerifyLinkWithToast, verifyPageUrl]);

  if (!brandSlug || !lastDeep) return null;

  const receipt = payload && payload.signed_receipt && typeof payload.signed_receipt === 'object' ? payload.signed_receipt : null;
  const categoryPlacementsTotal = receipt
    ? Array.isArray(receipt.category_summary)
      ? receipt.category_summary.reduce((s, row) => {
          if (
            row &&
            typeof row === 'object' &&
            typeof /** @type {Record<string, unknown>} */ (row).count === 'number' &&
            Number.isFinite(/** @type {Record<string, unknown>} */ (row).count)
          ) {
            return s + Math.floor(/** @type {Record<string, unknown>} */ (row).count);
          }
          return s;
        }, 0)
      : computeIncidentIndexCounts(inv).category_placement_count
    : '—';
  const signedIncidentCount =
    receipt && typeof receipt.incident_count === 'number' && Number.isFinite(receipt.incident_count)
      ? Math.floor(receipt.incident_count)
      : '—';
  const sourcesIndexed = countIndexedSources(inv, null);
  const verifiedSources =
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
              <span style={{ color: '#8a9aac' }}>Category placements (tab totals):</span> {categoryPlacementsTotal}
            </div>
            <div>
              <span style={{ color: '#8a9aac' }}>Verified enforcement matters (signed):</span> {signedIncidentCount}
            </div>
            <div>
              <span style={{ color: '#8a9aac' }}>Sources indexed:</span> {sourcesIndexed}
            </div>
            <div>
              <span style={{ color: '#8a9aac' }}>Verified sources:</span> {verifiedSources}
            </div>
            <details
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px dashed rgba(138,154,172,0.25)',
                color: '#a8c4d8',
                fontSize: 10,
                lineHeight: 1.55,
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  color: '#c9b896',
                  letterSpacing: 0.5,
                  listStyle: 'none',
                }}
              >
                What do these numbers mean?
              </summary>
              <ul style={{ margin: '10px 0 4px', paddingLeft: 18, listStyle: 'disc' }}>
                <li style={{ marginBottom: 6 }}>
                  <strong style={{ color: '#d4c4a8' }}>Category placements (tab totals)</strong> — Rows indexed
                  per deep-research tab; sums exceed the signed count when the same matter appears under multiple
                  categories.
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong style={{ color: '#d4c4a8' }}>Verified enforcement matters (signed)</strong> — The{' '}
                  <code style={{ fontSize: 9 }}>incident_count</code> field in the signed receipt body (rollup size
                  when present, otherwise summed tab totals). This is what cryptography covers.
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong style={{ color: '#d4c4a8' }}>Sources indexed</strong> — Full HTTP source universe
                  this profile touched (summaries, citations, and related fields).
                </li>
                <li style={{ marginBottom: 2 }}>
                  <strong style={{ color: '#d4c4a8' }}>Verified sources</strong> — Curated subset with direct
                  links on cited incident rows in the signed deep-research snapshot.
                </li>
              </ul>
            </details>
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
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            {shareToast ? (
              <p
                role="status"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  margin: '0 0 4px',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 1,
                  color: '#6aaa8a',
                }}
              >
                {shareToast}
              </p>
            ) : null}
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
              disabled={!verifyPageUrl}
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
