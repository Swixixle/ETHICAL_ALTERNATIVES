import { useCallback, useState } from 'react';
import { exportShare } from '../../lib/api.js';
import { methodologyPageUrl } from '../../lib/methodologyUrl.js';

const CHANNEL_ROWS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'x', label: 'X (Twitter)' },
  { id: 'email', label: 'Email' },
  { id: 'image_download', label: 'Download as image' },
  { id: 'copy_caption', label: 'Copy caption' },
];

const btnStyle = {
  width: '100%',
  textAlign: 'left',
  fontFamily: "'Space Mono', monospace",
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase',
  padding: '12px 14px',
  borderRadius: 4,
  border: '1px solid #2a3f52',
  background: '#162030',
  color: '#e8e0c8',
  cursor: 'pointer',
  marginBottom: 8,
};

/**
 * System-style share sheet: Web Share API on capable mobile browsers;
 * clipboard + mailto + PNG download on desktop fallbacks.
 *
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   investigation: Record<string, unknown> | null;
 *   identification: Record<string, unknown> | null;
 * }} props
 */
export default function ShareSheet({ open, onClose, investigation, identification }) {
  const [busy, setBusy] = useState(/** @type {string | null} */ (null));
  const [msg, setMsg] = useState(/** @type {string | null} */ (null));

  const downloadShareImage = useCallback(async (text, title, fileSlug) => {
    const canvas = document.createElement('canvas');
    const w = 720;
    const pad = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const font = '14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.font = font;
    const maxW = w - pad * 2;
    /** @param {string} line */
    const wrap = (line) => {
      const words = String(line).split(/\s+/).filter(Boolean);
      const out = [];
      let cur = '';
      for (const word of words) {
        const t = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(t).width > maxW && cur) {
          out.push(cur);
          cur = word;
        } else cur = t;
      }
      if (cur) out.push(cur);
      return out.length ? out : [''];
    };

    const lines = [];
    for (const raw of String(title).split('\n')) {
      lines.push(...wrap(raw));
    }
    lines.push('');
    for (const block of String(text).split('\n')) {
      if (!block.trim()) {
        lines.push('');
        continue;
      }
      lines.push(...wrap(block));
      lines.push('');
    }

    const lineHeight = 20;
    const h = Math.min(Math.max(pad * 2 + lines.length * lineHeight + 24, 320), 6000);
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = '#0f1520';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f0e8d0';
    ctx.font = font;
    let y = pad + 14;
    for (const ln of lines) {
      ctx.fillText(ln, pad, y);
      y += lineHeight;
    }

    const blob = await new Promise((res) => canvas.toBlob((b) => res(b), 'image/png'));
    if (!blob) return;
    const safeSlug = String(fileSlug || 'share')
      .replace(/[^a-z0-9-]+/gi, '-')
      .slice(0, 48);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ethicalalt-card-${safeSlug}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const handleChannel = useCallback(
    async (channel) => {
      if (!investigation) return;
      setBusy(channel);
      setMsg(null);
      const { ok, data } = await exportShare(investigation, channel, identification);
      setBusy(null);

      if (!ok) {
        setMsg(typeof data?.message === 'string' ? data.message : 'Share request failed.');
        return;
      }

      if (data.blocked) {
        setMsg(typeof data.reason === 'string' ? data.reason : 'This export is blocked.');
        return;
      }

      const title = typeof data.title === 'string' ? data.title : 'EthicalAlt';
      const text = typeof data.text === 'string' ? data.text : '';
      const url = typeof data.url === 'string' ? data.url : '';

      if (channel === 'email' && typeof data.mailto === 'string') {
        window.location.href = data.mailto;
        return;
      }

      if (channel === 'copy_caption') {
        try {
          await navigator.clipboard.writeText(text);
          setMsg('Caption copied to clipboard.');
        } catch {
          setMsg('Could not copy to clipboard.');
        }
        return;
      }

      if (channel === 'image_download') {
        const slug =
          (investigation && typeof investigation.brand_slug === 'string' && investigation.brand_slug) ||
          'share';
        await downloadShareImage(text, title, slug);
        setMsg('Image downloaded.');
        return;
      }

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title,
            text: `${text}${url ? `\n\n${url}` : ''}`,
            url: url || undefined,
          });
          return;
        } catch (e) {
          const err = /** @type {{ name?: string }} */ (e);
          if (err?.name === 'AbortError') return;
        }
      }

      try {
        await navigator.clipboard.writeText(`${title}\n\n${text}${url ? `\n\n${url}` : ''}`);
        setMsg('Copied to clipboard — paste into your app.');
      } catch {
        setMsg('Could not share or copy on this device.');
      }
    },
    [investigation, identification, downloadShareImage]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share via"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5000,
        background: 'rgba(8, 12, 18, 0.92)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 12px calc(12px + env(safe-area-inset-bottom, 0))',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#121a24',
          border: '1px solid #2a3f52',
          borderRadius: '12px 12px 0 0',
          padding: '16px 16px 20px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 22,
              letterSpacing: 2,
              color: '#f0e8d0',
            }}
          >
            Share
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: '#6a8a9a',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
        <p
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 13,
            color: '#8a9aa8',
            margin: '0 0 14px',
            lineHeight: 1.5,
          }}
        >
          Uses your device share menu when available. Your camera photo is never included — only this
          public-record summary text.
        </p>
        <p
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 12,
            color: '#6a8a9a',
            margin: '0 0 14px',
            lineHeight: 1.55,
          }}
        >
          <a href={methodologyPageUrl()} target="_blank" rel="noopener noreferrer" style={{ color: '#a8c4d8' }}>
            How investigations work
          </a>
          {' — '}methodology and limits.
        </p>
        {CHANNEL_ROWS.map((row) => (
          <button
            key={row.id}
            type="button"
            disabled={Boolean(busy) || !investigation}
            style={{ ...btnStyle, opacity: busy && busy !== row.id ? 0.45 : 1 }}
            onClick={() => void handleChannel(/** @type {any} */ (row.id))}
          >
            {busy === row.id ? '…' : row.label}
          </button>
        ))}
        {msg ? (
          <p
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontSize: 14,
              color: '#d4a574',
              margin: '12px 0 0',
              lineHeight: 1.45,
            }}
          >
            {msg}
          </p>
        ) : null}
      </div>
    </div>
  );
}
