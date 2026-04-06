import { useCallback, useEffect, useState } from 'react';
import { getImpactFetchHeaders, getImpactConsentOutcome } from '../lib/impactConsent.js';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

/**
 * Quiet self-reported outcome (opt-in via consent header only).
 * @param {{ tapKey: number; onDone: () => void }} props
 */
export default function ImpactOutcomePrompt({ tapKey, onDone }) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getImpactConsentOutcome()) onDone();
  }, [onDone]);

  const send = useCallback(
    async (outcome) => {
      if (!getImpactConsentOutcome()) {
        onDone();
        return;
      }
      setBusy(true);
      try {
        const base = apiPrefix();
        const url = base ? `${base}/api/impact/outcome` : '/api/impact/outcome';
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
          body: JSON.stringify({ outcome }),
        });
      } catch {
        /* non-blocking */
      } finally {
        try {
          sessionStorage.setItem(`ea_outcome_done_${tapKey}`, '1');
        } catch {
          /* ignore */
        }
        setBusy(false);
        onDone();
      }
    },
    [tapKey, onDone]
  );

  if (!getImpactConsentOutcome()) return null;

  const btnBase = {
    fontFamily: "'Space Mono', monospace",
    fontSize: 10,
    letterSpacing: 0.5,
    padding: '8px 10px',
    borderRadius: 2,
    border: '1px solid #2a3f52',
    cursor: busy ? 'default' : 'pointer',
    background: '#162030',
    color: '#d8d0b8',
    flex: '1 1 120px',
  };

  return (
    <div
      role="dialog"
      aria-label="Purchase outcome"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 4500,
        padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0))',
        background: 'linear-gradient(180deg, rgba(15,21,32,0.2) 0%, rgba(15,21,32,0.97) 24%, #0f1520 100%)',
        borderTop: '1px solid #2a3f52',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.45)',
      }}
    >
      <p
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 16,
          color: '#f0e8d0',
          margin: '0 0 10px',
          textAlign: 'center',
        }}
      >
        Did this change what you bought?
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
        }}
      >
        <button type="button" disabled={busy} style={btnBase} onClick={() => send('yes_switched')}>
          Yes — switched
        </button>
        <button type="button" disabled={busy} style={btnBase} onClick={() => send('no_same')}>
          No — same as usual
        </button>
        <button type="button" disabled={busy} style={btnBase} onClick={() => send('no_already_avoided')}>
          Already avoided
        </button>
        <button
          type="button"
          disabled={busy}
          style={{ ...btnBase, flex: '1 1 100%', borderColor: '#4a5a68', color: '#8a9a9a' }}
          onClick={() => send('skipped')}
        >
          Skip
        </button>
      </div>
      <p
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9,
          color: '#5a6a78',
          margin: '10px 0 0',
          textAlign: 'center',
        }}
      >
        Anonymous aggregate — you opted in under Privacy.
      </p>
    </div>
  );
}
