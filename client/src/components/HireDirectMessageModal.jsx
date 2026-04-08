import { useCallback, useState } from 'react';
import { getEaSessionId } from '../utils/eaSessionId.js';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {{
 *   worker: Record<string, unknown> | null;
 *   onClose: () => void;
 * }} props
 */
export default function HireDirectMessageModal({ worker, onClose }) {
  const [step, setStep] = useState(/** @type {'compose' | 'sending' | 'done'} */ ('compose'));
  const [message, setMessage] = useState('');
  const [senderCity, setSenderCity] = useState('');
  const [err, setErr] = useState(/** @type {string | null} */ (null));
  const [contact, setContact] = useState(/** @type {{ method: string; value: string } | null} */ (null));

  const submit = useCallback(async () => {
    if (!worker?.id) return;
    const sid = getEaSessionId();
    if (!sid) {
      setErr('Could not create session. Check browser storage.');
      return;
    }
    const txt = message.trim();
    if (!txt) {
      setErr('Add a short message first.');
      return;
    }
    setErr(null);
    setStep('sending');
    await sleep(800);
    try {
      const base = apiPrefix();
      const url = base ? `${base}/api/workers/${worker.id}/message` : `/api/workers/${worker.id}/message`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: txt,
          sender_session: sid,
          sender_city: senderCity.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      setContact(data.worker_contact || null);
      setStep('done');
    } catch (e) {
      setStep('compose');
      setErr(e instanceof Error ? e.message : 'Send failed');
    }
  }, [worker, message, senderCity]);

  if (!worker) return null;

  const name = String(worker.display_name || 'this worker');

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 10, 18, 0.88)',
        zIndex: 400,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-bottom))',
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hire-direct-msg-title"
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#121a28',
          border: '1px solid rgba(212,160,23,0.35)',
          borderRadius: 8,
          padding: 20,
          marginBottom: 8,
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="hire-direct-msg-title" style={{ margin: '0 0 12px', fontSize: 16, color: '#E0E0E0' }}>
          HIRE DIRECT — {name}
        </h2>

        {step === 'compose' ? (
          <>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you need? When? Any details."
              rows={4}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: 6,
                padding: 10,
                fontFamily: "'Crimson Pro', serif",
                resize: 'vertical',
              }}
            />
            <input
              type="text"
              value={senderCity}
              onChange={(e) => setSenderCity(e.target.value)}
              placeholder="Your city (optional)"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginTop: 10,
                borderRadius: 6,
                padding: '10px 12px',
                fontFamily: "'Crimson Pro', serif",
              }}
            />
            {err ? (
              <p style={{ color: '#ff6b6b', fontSize: 13, margin: '10px 0 0' }}>{err}</p>
            ) : null}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: '1px solid #6a8a9a',
                  color: '#a8c4d8',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#D4A017',
                  border: 'none',
                  color: '#0A1F3D',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                SEND
              </button>
            </div>
          </>
        ) : null}

        {step === 'sending' ? (
          <div style={{ textAlign: 'center', padding: '24px 8px', color: '#D4A017' }} aria-busy="true">
            Sending…
          </div>
        ) : null}

        {step === 'done' && contact ? (
          <div>
            <p style={{ color: '#E0E0E0', fontSize: 14, lineHeight: 1.5, margin: '0 0 12px' }}>
              Message sent. Here is how to reach <strong>{name}</strong> directly:
            </p>
            <div
              style={{
                background: 'rgba(212,160,23,0.12)',
                border: '1px solid rgba(212,160,23,0.4)',
                borderRadius: 6,
                padding: 14,
                color: '#D4A017',
                fontSize: 15,
                fontWeight: 700,
                wordBreak: 'break-word',
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                {contact.method}
              </div>
              {contact.value}
            </div>
            <p style={{ color: '#6A8A9A', fontSize: 12, lineHeight: 1.5, marginTop: 12 }}>
              This conversation continues off-platform. {name} keeps 100% of what they earn.
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '10px',
                background: '#2a3f52',
                border: 'none',
                color: '#e0e0e0',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Close
            </button>
          </div>
        ) : null}

        <p style={{ color: '#5a6a78', fontSize: 10, lineHeight: 1.45, margin: '16px 0 0' }}>
          EthicalAlt does not process payments, provide insurance, or guarantee services. This is a direct
          connection between neighbors.
        </p>
      </div>
    </div>
  );
}
