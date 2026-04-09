import { useEffect, useState } from 'react';
import {
  getImpactConsentOutcome,
  getImpactConsentUsage,
  setImpactConsentOutcome,
  setImpactConsentUsage,
  clearAllImpactConsents,
} from '../lib/impactConsent.js';

const labelStyle = {
  fontFamily: "'Crimson Pro', serif",
  fontSize: 16,
  color: '#e8e0c8',
  lineHeight: 1.45,
};

const hintStyle = {
  fontFamily: "'Space Mono', monospace",
  fontSize: 13,
  letterSpacing: 0.5,
  color: '#6a8a9a',
  marginTop: 4,
  lineHeight: 1.4,
};

/**
 * @param {{ variant?: 'compact' | 'full'; showReset?: boolean }} props
 */
export default function PrivacyConsentPanel({ variant = 'full', showReset = true }) {
  const [usage, setUsage] = useState(() => getImpactConsentUsage());
  const [outcome, setOutcome] = useState(() => getImpactConsentOutcome());

  useEffect(() => {
    setUsage(getImpactConsentUsage());
    setOutcome(getImpactConsentOutcome());
  }, []);

  const rowGap = variant === 'compact' ? 14 : 18;
  const titleSize = 14;

  return (
    <div style={{ textAlign: 'left', maxWidth: 420, margin: '0 auto' }}>
      <h3
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: titleSize,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#f0a820',
          margin: '0 0 12px',
        }}
      >
        Optional metrics
      </h3>
      <p
        style={{
          ...hintStyle,
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        All off by default. Nothing here identifies you. You can change this anytime in Local home →
        Privacy.
      </p>

      <label
        className="ea-onb-press"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          marginBottom: rowGap,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={usage}
          onChange={(e) => {
            const on = e.target.checked;
            setUsage(on);
            setImpactConsentUsage(on);
          }}
          style={{ marginTop: 4 }}
        />
        <span>
          <span style={labelStyle}>Anonymous usage stats</span>
          <div style={hintStyle}>Aggregate scan and alternative-view counts; optional per-brand monthly totals.</div>
        </span>
      </label>

      <label
        className="ea-onb-press"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          marginBottom: rowGap,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={outcome}
          onChange={(e) => {
            const on = e.target.checked;
            setOutcome(on);
            setImpactConsentOutcome(on);
          }}
          style={{ marginTop: 4 }}
        />
        <span>
          <span style={labelStyle}>Outcome sharing</span>
          <div style={hintStyle}>
            Lets you submit optional “did this change what you bought?” replies — no account, stored as
            anonymous counts only.
          </div>
        </span>
      </label>

      {showReset ? (
        <button
          type="button"
          className="ea-onb-press"
          onClick={() => {
            clearAllImpactConsents();
            setUsage(false);
            setOutcome(false);
          }}
          style={{
            marginTop: 8,
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 1,
            textTransform: 'uppercase',
            background: 'transparent',
            border: '1px solid #6a8a9a',
            color: '#a8c4d8',
            padding: '8px 14px',
            borderRadius: 2,
            cursor: 'pointer',
          }}
        >
          Clear all choices
        </button>
      ) : null}
    </div>
  );
}
