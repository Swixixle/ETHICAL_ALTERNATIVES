import { useCallback, useEffect, useState } from 'react';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

const CONCERN_COLORS = {
  significant: { bg: '#8b1a1a', text: '#ffd4d4', label: 'SIGNIFICANT CONCERN' },
  moderate: { bg: '#7a5500', text: '#ffe9a0', label: 'MODERATE CONCERN' },
  minor: { bg: '#1a4a2a', text: '#a8f0c0', label: 'MINOR CONCERN' },
  clean: { bg: '#1a3a6a', text: '#a0c8ff', label: 'CLEAN RECORD' },
  unknown: { bg: '#2a3f52', text: '#8fa8bc', label: 'RECORD' },
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
          fontSize: 9,
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
            fontSize: 10,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#e8a020',
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
          color: '#e8dfc8',
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
              fontSize: 8,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#8fa8bc',
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
            borderLeft: '4px solid #e8a020',
            background: 'rgba(232, 160, 32, 0.06)',
            fontFamily: "'Crimson Pro', serif",
            fontSize: 17,
            lineHeight: 1.55,
            color: '#e8dfc8',
            fontStyle: 'italic',
          }}
        >
          {pq.text}
          {pq.source_url ? (
            <footer
              style={{
                marginTop: 10,
                fontFamily: "'Space Mono', monospace",
                fontSize: 8,
                letterSpacing: 1,
                fontStyle: 'normal',
                color: '#4a6478',
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
            fontSize: 8,
            letterSpacing: 1,
            color: '#4a6478',
            marginBottom: 12,
          }}
        >
          {cardData.source_count} PRIMARY SOURCE{cardData.source_count !== 1 ? 'S' : ''} · PUBLIC RECORD
        </div>
      ) : null}

      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 8,
          letterSpacing: 2,
          color: '#e8a020',
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

function platformLabel(key) {
  const m = {
    twitter_url: 'X / Twitter',
    instagram_url: 'Instagram',
    facebook_url: 'Facebook',
    tiktok_url: 'TikTok',
    youtube_url: 'YouTube',
  };
  return m[key] || key.replace(/_url$/, '').replace(/^./, (c) => c.toUpperCase());
}

function RegulatorRow({ regulator, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(regulator)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        background: 'rgba(255, 107, 107, 0.05)',
        border: '1px solid rgba(255, 107, 107, 0.2)',
        borderLeft: '3px solid #ff6b6b',
        borderRadius: '0 4px 4px 0',
        padding: '12px 16px',
        marginBottom: 8,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#ff6b6b',
            marginBottom: 3,
          }}
        >
          {regulator.agency} — copy report and open form ↗
        </div>
        <div
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 13,
            color: '#4a6478',
            lineHeight: 1.4,
          }}
        >
          {regulator.description}
        </div>
      </div>
    </button>
  );
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
  const [copied, setCopied] = useState(null);
  const [mode, setMode] = useState('share');

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

  async function copyText(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  function tweetUrl(text) {
    return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  }

  async function tryNativeShare(text, title) {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text });
      } catch {
        /* user cancelled or unsupported */
      }
    }
  }

  async function copyAndOpenInstagram(caption) {
    await copyText(caption, 'instagram');
    const u = 'instagram://app';
    window.location.href = u;
  }

  async function copyAndOpenTikTok(caption) {
    await copyText(caption, 'tiktok');
    window.open('https://www.tiktok.com/', '_blank', 'noopener,noreferrer');
  }

  async function openRegulator(regulator) {
    if (shareData?.share_texts?.regulator_pack) {
      await copyText(shareData.share_texts.regulator_pack, `reg-${regulator.agency}`);
    }
    window.open(regulator.url, '_blank', 'noopener,noreferrer');
  }

  if (!investigation || !identification) return null;

  const brandLabel = shareData?.brand_name || String(identification.brand || identification.object || 'Company');

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
      aria-label="Share the record"
    >
      <div
        style={{
          maxWidth: 520,
          margin: '0 auto',
        }}
      >
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
              color: '#e8dfc8',
            }}
          >
            Share the Record
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              color: '#4a6478',
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
              fontSize: 9,
              color: '#4a6478',
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

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'share', label: 'Share to your network' },
            { id: 'company', label: 'Tag the company' },
            { id: 'regulators', label: 'Report to regulators' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              style={{
                flex: '1 1 140px',
                fontFamily: "'Space Mono', monospace",
                fontSize: 8,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                padding: '8px 10px',
                borderRadius: 2,
                border: mode === tab.id ? '1px solid #e8a020' : '1px solid #2a3f52',
                background: mode === tab.id ? 'rgba(232,160,32,0.1)' : 'transparent',
                color: mode === tab.id ? '#e8a020' : '#4a6478',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === 'share' && shareData ? (
          <div>
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 15,
                color: '#8fa8bc',
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              Share this investigation with your network. On mobile, use your system share sheet for any
              app (iMessage, WhatsApp, email). Use the buttons below for X, or copy captions for Instagram
              and TikTok, then post your screenshot with the pasted text.
            </p>

            {typeof navigator !== 'undefined' && navigator.share ? (
              <button
                type="button"
                onClick={() => tryNativeShare(shareData.share_texts.general, 'EthicalAlt — public record')}
                style={{
                  width: '100%',
                  marginBottom: 16,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: '#0f1520',
                  background: '#e8a020',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Share to your network (system sheet)
              </button>
            ) : null}

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#4a6478',
                  marginBottom: 8,
                }}
              >
                X / Twitter
              </div>
              <div
                style={{
                  background: '#162030',
                  border: '1px solid #2a3f52',
                  borderRadius: 4,
                  padding: '12px 14px',
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 15,
                  color: '#8fa8bc',
                  lineHeight: 1.5,
                  marginBottom: 8,
                  whiteSpace: 'pre-line',
                }}
              >
                {shareData.share_texts.twitter}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={tweetUrl(shareData.share_texts.twitter)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: '#0f1520',
                    background: '#e8a020',
                    padding: '8px 16px',
                    borderRadius: 2,
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  Post to X ↗
                </a>
                <button
                  type="button"
                  onClick={() => copyText(shareData.share_texts.twitter, 'twitter')}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: copied === 'twitter' ? '#6aaa8a' : '#4a6478',
                    background: 'transparent',
                    border: '1px solid #2a3f52',
                    padding: '8px 16px',
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                >
                  {copied === 'twitter' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#4a6478',
                  marginBottom: 8,
                }}
              >
                Instagram — copy caption, then open app
              </div>
              <div
                style={{
                  background: '#162030',
                  border: '1px solid #2a3f52',
                  borderRadius: 4,
                  padding: '12px 14px',
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 14,
                  color: '#8fa8bc',
                  lineHeight: 1.5,
                  marginBottom: 8,
                  whiteSpace: 'pre-line',
                }}
              >
                {shareData.share_texts.instagram}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => copyText(shareData.share_texts.instagram, 'instagram')}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: copied === 'instagram' ? '#6aaa8a' : '#4a6478',
                    background: 'transparent',
                    border: '1px solid #2a3f52',
                    padding: '8px 16px',
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                >
                  {copied === 'instagram' ? 'Copied ✓' : 'Copy caption'}
                </button>
                <button
                  type="button"
                  onClick={() => copyAndOpenInstagram(shareData.share_texts.instagram)}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: '#0f1520',
                    background: '#e8a020',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Copy &amp; open Instagram
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#4a6478',
                  marginBottom: 8,
                }}
              >
                TikTok — copy caption, then open TikTok
              </div>
              <div
                style={{
                  background: '#162030',
                  border: '1px solid #2a3f52',
                  borderRadius: 4,
                  padding: '12px 14px',
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 14,
                  color: '#8fa8bc',
                  lineHeight: 1.5,
                  marginBottom: 8,
                  whiteSpace: 'pre-line',
                }}
              >
                {shareData.share_texts.instagram}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => copyText(shareData.share_texts.instagram, 'tiktok-cap')}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: copied === 'tiktok-cap' ? '#6aaa8a' : '#4a6478',
                    background: 'transparent',
                    border: '1px solid #2a3f52',
                    padding: '8px 16px',
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                >
                  {copied === 'tiktok-cap' ? 'Copied ✓' : 'Copy caption'}
                </button>
                <button
                  type="button"
                  onClick={() => copyAndOpenTikTok(shareData.share_texts.instagram)}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: '#0f1520',
                    background: '#e8a020',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Copy &amp; open TikTok
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => copyText(shareData.share_texts.general, 'general')}
              style={{
                width: '100%',
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: copied === 'general' ? '#6aaa8a' : '#4a6478',
                background: 'transparent',
                border: '1px solid #2a3f52',
                padding: '10px',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              {copied === 'general' ? 'Copied ✓' : 'Copy for Facebook / LinkedIn / anywhere'}
            </button>
          </div>
        ) : null}

        {mode === 'company' && shareData ? (
          <div>
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 15,
                color: '#8fa8bc',
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              Deliver the record to {brandLabel}. One post tags their official account with only sourced,
              factual language from the investigation — the receipt lands in their mentions.
            </p>

            {shareData.company_accounts ? (
              <>
                <div
                  style={{
                    background: '#162030',
                    border: '1px solid #2a3f52',
                    borderRadius: 4,
                    padding: '12px 14px',
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: 15,
                    color: '#8fa8bc',
                    lineHeight: 1.5,
                    marginBottom: 12,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {shareData.share_texts.twitter_company}
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  <a
                    href={tweetUrl(shareData.share_texts.twitter_company)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 9,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: '#0f1520',
                      background: '#e8a020',
                      padding: '8px 16px',
                      borderRadius: 2,
                      textDecoration: 'none',
                      fontWeight: 700,
                    }}
                  >
                    Post on X with tag ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText(shareData.share_texts.twitter_company, 'company')}
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 9,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: copied === 'company' ? '#6aaa8a' : '#4a6478',
                      background: 'transparent',
                      border: '1px solid #2a3f52',
                      padding: '8px 16px',
                      borderRadius: 2,
                      cursor: 'pointer',
                    }}
                  >
                    {copied === 'company' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: '#4a6478',
                    marginBottom: 10,
                  }}
                >
                  Official accounts
                </div>
                {Object.entries(shareData.company_accounts)
                  .filter(([k]) => k.endsWith('_url'))
                  .map(([k, url]) => {
                    const base = k.replace(/_url$/, '');
                    const handle = shareData.company_accounts[base];
                    return (
                      <a
                        key={k}
                        href={String(url)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: '#162030',
                          border: '1px solid #2a3f52',
                          borderRadius: 4,
                          padding: '10px 14px',
                          marginBottom: 6,
                          textDecoration: 'none',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 10,
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                            color: '#e8dfc8',
                          }}
                        >
                          {platformLabel(k)}
                        </span>
                        <span
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 9,
                            color: '#e8a020',
                          }}
                        >
                          {handle ? String(handle) : 'Open'} ↗
                        </span>
                      </a>
                    );
                  })}
              </>
            ) : (
              <p
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 15,
                  color: '#4a6478',
                  lineHeight: 1.6,
                  padding: '20px 0',
                }}
              >
                We don&apos;t have verified social handles for this company in our database yet. Search for{' '}
                {brandLabel} on X or Instagram and paste the copied record with your screenshot.
              </p>
            )}
          </div>
        ) : null}

        {mode === 'regulators' && shareData ? (
          <div>
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 15,
                color: '#8fa8bc',
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              These agencies match documented concerns in this record. Each button copies the same factual
              summary (with source URLs) and opens the agency&apos;s official intake — paste and submit.
            </p>

            <div
              style={{
                background: '#162030',
                border: '1px solid #2a3f52',
                borderRadius: 4,
                padding: '12px 14px',
                fontFamily: "'Crimson Pro', serif",
                fontSize: 14,
                color: '#8fa8bc',
                lineHeight: 1.6,
                marginBottom: 12,
                whiteSpace: 'pre-line',
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {shareData.share_texts.regulator_pack}
            </div>
            <button
              type="button"
              onClick={() => copyText(shareData.share_texts.regulator_pack, 'regulator')}
              style={{
                width: '100%',
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: copied === 'regulator' ? '#6aaa8a' : '#4a6478',
                background: 'transparent',
                border: '1px solid #2a3f52',
                padding: '10px',
                borderRadius: 2,
                cursor: 'pointer',
                marginBottom: 20,
              }}
            >
              {copied === 'regulator' ? 'Copied ✓' : 'Copy report text only'}
            </button>

            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#4a6478',
                marginBottom: 10,
              }}
            >
              Relevant agencies
            </div>
            {shareData.relevant_regulators.map((reg, i) => (
              <RegulatorRow key={`${reg.agency}-${i}`} regulator={reg} onOpen={openRegulator} />
            ))}
          </div>
        ) : null}

        <footer
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: '1px solid #2a3f52',
            fontFamily: "'Crimson Pro', serif",
            fontSize: 13,
            fontStyle: 'italic',
            color: '#4a6478',
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
