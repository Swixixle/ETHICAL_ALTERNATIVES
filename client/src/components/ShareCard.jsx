import { useCallback, useEffect, useState } from 'react';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function tweetUrl(text) {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

function facebookShareUrl(pageUrl) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

const REGULATOR_CHECKLIST_ACTION = {
  FTC: 'Open complaint form',
  SEC: 'Open tips portal',
  IRS: 'Open whistleblower information',
  NLRB: 'Open complaint form',
  OSHA: 'Open complaint form',
  EPA: 'Open report form',
};

function checklistLabelForRegulator(reg) {
  const action = REGULATOR_CHECKLIST_ACTION[reg.agency] || 'Open form';
  return `${reg.agency} — ${action}`;
}

/**
 * @param {{
 *   investigation: Record<string, unknown> | null;
 *   identification: Record<string, unknown> | null;
 *   onClose: () => void;
 * }} props
 */
export default function ShareCard({ investigation, identification, onClose }) {
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState({});
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [showSentConfirm, setShowSentConfirm] = useState(false);
  const [sentItems, setSentItems] = useState([]);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const loadShareData = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiPrefix()}/api/share-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigation,
          identification,
        }),
      });
      if (!res.ok) throw new Error('share_card_http');
      const data = await res.json();
      setShareData(data);
    } catch {
      setErr('Could not load share data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [investigation, identification]);

  useEffect(() => {
    loadShareData();
  }, [loadShareData]);

  useEffect(() => {
    if (!shareData) return;
    const next = {
      twitter_feed: true,
      twitter_tag: true,
      instagram: true,
      tiktok: true,
      facebook: true,
    };
    for (const reg of shareData.relevant_regulators || []) {
      next[`reg_${reg.agency}`] = true;
    }
    setSelected(next);
    setShowSentConfirm(false);
    setSentItems([]);
  }, [shareData]);

  const toggle = (id) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const anyChecked = shareData
    ? (() => {
        const s = selected;
        if (s.twitter_feed || s.twitter_tag || s.instagram || s.tiktok || s.facebook) return true;
        for (const reg of shareData.relevant_regulators || []) {
          if (s[`reg_${reg.agency}`]) return true;
        }
        return false;
      })()
    : false;

  const handleSendAll = async () => {
    if (!shareData || sending || !anyChecked) return;
    setSending(true);
    setToast(null);
    const completed = [];
    const sel = selected;
    const s = shareData;
    const site = typeof s.share_url === 'string' && s.share_url ? s.share_url : 'https://ethicalalt-client.onrender.com';

    try {
      if (sel.twitter_feed) {
        window.open(tweetUrl(s.share_texts.twitter), '_blank', 'noopener,noreferrer');
        completed.push({ id: 'twitter_feed', label: 'X / Twitter — Post to my feed' });
      }
      if (sel.twitter_tag) {
        await sleep(sel.twitter_feed ? 500 : 0);
        window.open(tweetUrl(s.share_texts.twitter_company), '_blank', 'noopener,noreferrer');
        completed.push({
          id: 'twitter_tag',
          label: `X / Twitter — Tag the company (${s.company_tag})`,
        });
      }

      if (sel.instagram && sel.tiktok) {
        await navigator.clipboard.writeText(s.share_texts.instagram);
        setToast('Caption copied — paste in Instagram and TikTok');
        completed.push({ id: 'instagram', label: 'Instagram — Copy caption to clipboard' });
        completed.push({ id: 'tiktok', label: 'TikTok — Copy caption to clipboard' });
      } else if (sel.instagram) {
        await navigator.clipboard.writeText(s.share_texts.instagram);
        setToast('Instagram caption copied');
        completed.push({ id: 'instagram', label: 'Instagram — Copy caption to clipboard' });
      } else if (sel.tiktok) {
        await navigator.clipboard.writeText(s.share_texts.instagram);
        setToast('TikTok caption copied');
        completed.push({ id: 'tiktok', label: 'TikTok — Copy caption to clipboard' });
      }

      if (sel.instagram || sel.tiktok) {
        await sleep(600);
      }
      setToast(null);

      if (sel.facebook) {
        window.open(facebookShareUrl(site), '_blank', 'noopener,noreferrer');
        completed.push({ id: 'facebook', label: 'Facebook — Share link' });
      }

      const regs = (s.relevant_regulators || []).filter((r) => sel[`reg_${r.agency}`]);
      if (regs.length) {
        try {
          await navigator.clipboard.writeText(s.share_texts.regulator_pack);
        } catch {
          /* clipboard may fail; forms still open */
        }
        for (let i = 0; i < regs.length; i++) {
          const reg = regs[i];
          window.open(reg.url, '_blank', 'noopener,noreferrer');
          completed.push({
            id: `reg_${reg.agency}`,
            label: checklistLabelForRegulator(reg),
          });
          if (i < regs.length - 1) await sleep(800);
        }
      }

      setSentItems(completed);
      setShowSentConfirm(true);
    } finally {
      setSending(false);
      setToast(null);
    }
  };

  if (!investigation || !identification) return null;

  const staticRows = shareData
    ? [
        { id: 'twitter_feed', primary: 'X / Twitter — Post to my feed' },
        {
          id: 'twitter_tag',
          primary: `X / Twitter — Tag the company (${shareData.company_tag})`,
        },
        { id: 'instagram', primary: 'Instagram — Copy caption to clipboard' },
        { id: 'tiktok', primary: 'TikTok — Copy caption to clipboard' },
        { id: 'facebook', primary: 'Facebook — Share link' },
      ]
    : [];

  const regRows =
    shareData?.relevant_regulators?.map((reg) => ({
      id: `reg_${reg.agency}`,
      primary: checklistLabelForRegulator(reg),
    })) || [];

  if (showSentConfirm) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 21, 32, 0.96)',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '24px 20px 48px',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Record sent"
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 36,
              letterSpacing: 3,
              color: '#6aaa8a',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            RECORD SENT
          </div>
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#6a8a9a',
              textAlign: 'center',
              marginBottom: 28,
            }}
          >
            This record was sent everywhere you selected
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px' }}>
            {sentItems.map((item) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 16,
                  color: '#f0e8d0',
                  lineHeight: 1.45,
                  marginBottom: 14,
                }}
              >
                <span style={{ color: '#6aaa8a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#0f1520',
              background: '#f0a820',
              border: 'none',
              padding: '14px 20px',
              borderRadius: 3,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '10px 0',
    margin: 0,
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  };

  const cd = shareData?.card_data;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 21, 32, 0.97)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100vh',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Send this record"
    >
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 18px 10px',
          minHeight: 44,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 20,
            letterSpacing: 1,
            color: '#f0e8d0',
          }}
        >
          Send
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            aria-label="About sending"
            onClick={() => setInfoModalOpen(true)}
            style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1,
              color: '#a8c4d8',
              background: 'transparent',
              border: 'none',
              width: 32,
              height: 32,
              borderRadius: 999,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ⓘ
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: '#6a8a9a',
              background: 'transparent',
              border: 'none',
              padding: '6px 10px',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {infoModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 15, 25, 0.85)',
            zIndex: 1002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          role="presentation"
          onClick={() => setInfoModalOpen(false)}
        >
          <div
            role="document"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 400,
              background: '#1c2a3a',
              border: '1px solid #344d62',
              borderRadius: 6,
              padding: '20px 22px',
            }}
          >
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 15,
                color: '#e0e0e0',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              When you send, EthicalAlt opens the platforms and regulators you selected. Some steps copy text to
              your clipboard to paste into Instagram or TikTok. Nothing is posted automatically — you confirm each
              destination in its own app or site.
            </p>
            <button
              type="button"
              onClick={() => setInfoModalOpen(false)}
              style={{
                marginTop: 16,
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                color: '#0a1f3d',
                background: '#d4a017',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      {cd && !loading ? (
        <div
          style={{
            flex: '0 0 120px',
            margin: '0 18px 12px',
            padding: '12px 14px',
            background: '#121a24',
            borderRadius: 4,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 17,
              letterSpacing: 0.5,
              color: '#fff',
              lineHeight: 1.1,
              maxHeight: 48,
              overflow: 'hidden',
            }}
          >
            {cd.headline}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {(cd.top_tags || []).slice(0, 3).map((tag, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 0.5,
                  color: '#d4a017',
                  background: 'rgba(212,160,23,0.12)',
                  borderRadius: 999,
                  padding: '3px 8px',
                  textTransform: 'none',
                }}
              >
                {String(tag).replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div
        style={{
          flex: '1 1 auto',
          overflowY: 'auto',
          padding: '0 18px 12px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: 24,
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: '#6a8a9a',
            }}
          >
            Building share card…
          </div>
        ) : null}

        {err ? (
          <p style={{ color: '#ff6b6b', fontFamily: "'Crimson Pro', serif", marginBottom: 16 }}>{err}</p>
        ) : null}

        {shareData && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...staticRows, ...regRows].map((row) => (
              <label key={row.id} style={rowStyle}>
                <input
                  type="checkbox"
                  checked={Boolean(selected[row.id])}
                  onChange={() => toggle(row.id)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: '#d4a017',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: 14,
                    color: '#e0e0e0',
                    lineHeight: 1.35,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {row.primary}
                </div>
                <span style={{ color: '#6a8a9a', fontSize: 14 }} aria-hidden>
                  ›
                </span>
              </label>
            ))}
          </div>
        ) : null}

        {toast ? (
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: '#6aaa8a',
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            {toast}
          </p>
        ) : null}
      </div>

      {shareData && !loading ? (
        <div
          style={{
            flex: '0 0 auto',
            padding: '12px 18px calc(12px + env(safe-area-inset-bottom, 0px))',
            background: 'linear-gradient(180deg, transparent 0%, #0f1520 18%)',
          }}
        >
          <button
            type="button"
            disabled={!anyChecked || sending}
            onClick={handleSendAll}
            style={{
              width: '100%',
              height: 52,
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: !anyChecked || sending ? '#6a8a9a' : '#0a1f3d',
              background: !anyChecked || sending ? '#2a3f52' : '#d4a017',
              border: 'none',
              borderRadius: 4,
              cursor: !anyChecked || sending ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
          >
            {sending ? 'Sending…' : 'Send to all selected'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
