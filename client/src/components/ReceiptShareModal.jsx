import { useEffect } from 'react';
import InvestigationReceipt from './InvestigationReceipt.jsx';

/**
 * Receipt-based share entry point (replaces legacy ShareCard + /api/share-card).
 *
 * @param {{
 *   investigation: Record<string, unknown> | null;
 *   onClose: () => void;
 * }} props
 */
export default function ReceiptShareModal({ investigation, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!investigation) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-share-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        background: 'rgba(5, 10, 18, 0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 'max(24px, env(safe-area-inset-top)) 16px max(32px, env(safe-area-inset-bottom))',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h2
          id="receipt-share-title"
          style={{
            margin: 0,
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#a8c4d8',
          }}
        >
          Share · Signed receipt
        </h2>
        <button
          type="button"
          data-no-disintegrate
          onClick={onClose}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            background: 'transparent',
            border: '1px solid #2a3f52',
            color: '#f0a820',
            padding: '8px 14px',
            borderRadius: 2,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Close
        </button>
      </div>
      <p
        style={{
          margin: '0 0 20px',
          maxWidth: 440,
          width: '100%',
          fontFamily: "'Crimson Pro', serif",
          fontSize: 15,
          color: '#6a8a9a',
          lineHeight: 1.55,
        }}
      >
        Use <strong style={{ color: '#a8c4d8' }}>SHARE RECEIPT</strong> for native share on mobile, or link copy on
        desktop. <strong style={{ color: '#a8c4d8' }}>VERIFY</strong> opens the public verification page.
      </p>
      <div style={{ width: '100%', maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <InvestigationReceipt investigation={investigation} />
      </div>
    </div>
  );
}
