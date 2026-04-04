import { useCallback, useEffect, useState } from 'react';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

const CONCERN_COLORS = {
  significant: { bg: '#8b1a1a', text: '#ffd4d4', label: 'SIGNIFICANT CONCERN' },
  moderate: { bg: '#7a5500', text: '#ffe9a0', label: 'MODERATE CONCERN' },
  minor: { bg: '#1a4a2a', text: '#a8f0c0', label: 'MINOR CONCERN' },
  clean: { bg: '#1a3a6a', text: '#a0c8ff', label: 'CLEAN RECORD' },
  unknown: { bg: '#2a3f52', text: '#a8c4d8', label: 'RECORD' },
};

function ShareCardVisual({ cardData }) {
  if (!cardData) return null;
  const concern = CONCERN_COLORS[cardData.concern_level] || CONCERN_COLORS.unknown;
  const pq = cardData.pull_quote;

  return (
    <div
      style={{
        background: '#0f1520',
        border: `2px solid ${concern.bg}`,
        borderRadius: 8,
        padding: 24,
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: concern.bg,
          color: concern.text,
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          padding: '4px 12px',
          display: 'inline-block',
          borderRadius: 2,
          marginBottom: 12,
        }}
      >
        {concern.label}
      </div>

      {cardData.brand_name ? (
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#f0a820',
            marginBottom: 8,
          }}
        >
          {cardData.brand_name}
        </div>
      ) : null}

      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(32px, 8vw, 58px)',
          letterSpacing: 2,
          color: '#f0e8d0',
          lineHeight: 0.95,
          textTransform: 'uppercase',
          marginBottom: 18,
        }}
      >
        {cardData.headline}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {(cardData.top_tags || []).map((tag, i) => (
          <span
            key={i}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#a8c4d8',
              border: '1px solid #2a3f52',
              borderRadius: 999,
              padding: '3px 8px',
            }}
          >
            {String(tag).replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {pq?.text ? (
        <blockquote
          style={{
            margin: '0 0 16px',
            padding: '12px 14px 12px 16px',
            borderLeft: '4px solid #f0a820',
            background: 'rgba(240, 168, 32, 0.06)',
            fontFamily: "'Crimson Pro', serif",
            fontSize: 17,
            lineHeight: 1.55,
            color: '#f0e8d0',
            fontStyle: 'italic',
          }}
        >
          {pq.text}
          {pq.source_url ? (
            <footer
              style={{
                marginTop: 10,
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 1,
                fontStyle: 'normal',
                color: '#6a8a9a',
                wordBreak: 'break-all',
              }}
            >
              Source: {pq.source_url}
            </footer>
          ) : null}
        </blockquote>
      ) : null}

      {cardData.source_count > 0 ? (
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1,
            color: '#6a8a9a',
            marginBottom: 12,
          }}
        >
          {cardData.source_count} PRIMARY SOURCE{cardData.source_count !== 1 ? 'S' : ''} · PUBLIC RECORD
        </div>
      ) : null}

      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          color: '#f0a820',
          textTransform: 'uppercase',
          borderTop: '1px solid #2a3f52',
          paddingTop: 10,
          marginTop: 4,
        }}
      >
        ETHICALALT · TAP ANYTHING · FIND INDEPENDENT ALTERNATIVES
      </div>
    </div>
  );
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
        {
          id: 'twitter_feed',
          primary: 'X / Twitter — Post to my feed',
          detail: 'Opens X with this record pre-filled as a post.',
        },
        {
          id: 'twitter_tag',
          primary: `X / Twitter — Tag the company (${shareData.company_tag})`,
          detail: 'Second post that tags the brand so the receipt lands in their mentions.',
        },
        {
          id: 'instagram',
          primary: 'Instagram — Copy caption to clipboard',
          detail: 'Copies the caption; paste it under your screenshot in Instagram.',
        },
        {
          id: 'tiktok',
          primary: 'TikTok — Copy caption to clipboard',
          detail: 'Copies the same caption for a TikTok post.',
        },
        {
          id: 'facebook',
          primary: 'Facebook — Share link',
          detail: 'Opens Facebook’s share dialog with the EthicalAlt link.',
        },
      ]
    : [];

  const regRows =
    shareData?.relevant_regulators?.map((reg) => ({
      id: `reg_${reg.agency}`,
      primary: checklistLabelForRegulator(reg),
      detail: reg.description || '',
    })) || [];

  const rowStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    width: '100%',
    padding: '14px 12px',
    marginBottom: 8,
    background: '#162030',
    border: '1px solid #2a3f52',
    borderRadius: 4,
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  };

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
      aria-label="Send this record"
    >
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 24,
              letterSpacing: 2,
              color: '#f0e8d0',
            }}
          >
            Send This Record
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: '#6a8a9a',
              background: 'transparent',
              border: '1px solid #2a3f52',
              padding: '6px 12px',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: 20,
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: '#6a8a9a',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Building share card...
          </div>
        ) : null}

        {err ? (
          <p style={{ color: '#ff6b6b', fontFamily: "'Crimson Pro', serif", marginBottom: 16 }}>{err}</p>
        ) : null}

        {shareData ? <ShareCardVisual cardData={shareData.card_data} /> : null}

        {shareData && !loading ? (
          <>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#6a8a9a',
                marginBottom: 12,
              }}
            >
              Send to all selected
            </p>
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 14,
                color: '#a8c4d8',
                lineHeight: 1.55,
                marginBottom: 18,
              }}
            >
              Uncheck anywhere you don&apos;t want this run. One tap fires every destination you leave on —
              social posts, clipboard captions, and regulator forms (only agencies that match this record&apos;s
              issue tags).
            </p>

            <div style={{ marginBottom: 24 }}>
              {[...staticRows, ...regRows].map((row) => (
                <label key={row.id} style={rowStyle}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected[row.id])}
                    onChange={() => toggle(row.id)}
                    style={{
                      width: 18,
                      height: 18,
                      marginTop: 2,
                      accentColor: '#f0a820',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 11,
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                        color: '#f0e8d0',
                        marginBottom: 4,
                        lineHeight: 1.35,
                      }}
                    >
                      {row.primary}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Crimson Pro', serif",
                        fontSize: 13,
                        color: '#6a8a9a',
                        lineHeight: 1.45,
                      }}
                    >
                      {row.detail}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {toast ? (
              <p
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 1,
                  color: '#6aaa8a',
                  textAlign: 'center',
                  marginBottom: 12,
                }}
              >
                {toast}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!anyChecked || sending}
              onClick={handleSendAll}
              style={{
                width: '100%',
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: !anyChecked || sending ? '#6a8a9a' : '#0f1520',
                background: !anyChecked || sending ? '#2a3f52' : '#f0a820',
                border: 'none',
                padding: '16px 20px',
                borderRadius: 3,
                cursor: !anyChecked || sending ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                marginBottom: 24,
              }}
            >
              {sending ? 'SENDING…' : 'SEND TO ALL SELECTED'}
            </button>
          </>
        ) : null}

        <footer
          style={{
            marginTop: 8,
            paddingTop: 18,
            borderTop: '1px solid #2a3f52',
            fontFamily: "'Crimson Pro', serif",
            fontSize: 13,
            fontStyle: 'italic',
            color: '#6a8a9a',
            lineHeight: 1.65,
          }}
        >
          {shareData?.disclaimer ||
            'All shared content uses only documented public record claims with primary source URLs. Nothing fabricated. The record speaks.'}
        </footer>
      </div>
    </div>
  );
}
