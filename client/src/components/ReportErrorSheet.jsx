import { useState } from 'react';
import { getImpactFetchHeaders } from '../lib/impactConsent.js';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function reportErrorUrl() {
  return apiBase ? `${apiBase}/api/report-error` : '/api/report-error';
}

const FIELD_OPTIONS = [
  { value: '', label: 'Which part is wrong? (select)' },
  { value: 'settlement_amount', label: 'Settlement or fine amount' },
  { value: 'conviction_status', label: 'Conviction or legal status' },
  { value: 'executive_name_role', label: 'Named person or their role' },
  { value: 'date_year', label: 'Date or year of event' },
  { value: 'concern_level', label: 'Overall concern level' },
  { value: 'allegation_response', label: "Organization's documented response" },
  { value: 'other', label: 'Other factual error' },
];

/**
 * @param {{
 *   brandName: string;
 *   brandSlug: string | null;
 *   onClose: () => void;
 * }} props
 */
export default function ReportErrorSheet({ brandName, brandSlug, onClose }) {
  const [field, setField] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    Boolean(field) && description.trim().length >= 20 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await fetch(reportErrorUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
        body: JSON.stringify({
          brand_slug: brandSlug,
          brand_name: brandName,
          field,
          description: description.trim(),
          reported_at: new Date().toISOString(),
        }),
      });
    } catch {
      /* always show thank-you */
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-error-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          background: '#0f1520',
          borderTop: '1px solid #2a3f52',
          borderRadius: '4px 4px 0 0',
          padding: '32px 24px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {!submitted ? (
          <>
            <div
              id="report-error-title"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 14,
                letterSpacing: 2,
                color: '#f0a820',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              REPORT AN ERROR
            </div>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 13,
                color: '#6a8a9a',
                margin: '0 0 24px',
              }}
            >
              Help us maintain accuracy. All reports are reviewed.
            </p>
            <div
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 16,
                color: '#a8c4d8',
                marginBottom: 20,
              }}
            >
              {brandName}
            </div>
            <select
              value={field}
              onChange={(e) => setField(e.target.value)}
              style={{
                width: '100%',
                fontFamily: "'Space Mono', monospace",
                padding: '10px 12px',
                borderRadius: 2,
                marginBottom: 16,
              }}
            >
              {FIELD_OPTIONS.map((o) => (
                <option key={o.value || 'placeholder'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the error — what's wrong and what the correct information is, with a source if you have one."
              rows={5}
              style={{
                width: '100%',
                fontFamily: "'Crimson Pro', serif",
                padding: 12,
                borderRadius: 2,
                resize: 'vertical',
                marginBottom: 20,
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              data-no-disintegrate
              disabled={!canSubmit}
              onClick={() => void submit()}
              style={{
                width: '100%',
                background: '#f0a820',
                color: '#0f1520',
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                padding: 14,
                borderRadius: 2,
                fontWeight: 700,
                border: 'none',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: canSubmit ? 1 : 0.5,
              }}
            >
              SUBMIT REPORT
            </button>
            <button
              type="button"
              data-no-disintegrate
              onClick={onClose}
              style={{
                display: 'block',
                margin: '12px auto 0',
                fontFamily: "'Space Mono', monospace",
                fontSize: 13,
                color: '#6a8a9a',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              cancel
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 32,
                letterSpacing: 2,
                color: '#f0e8d0',
                marginBottom: 16,
              }}
            >
              THANK YOU
            </div>
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 18,
                color: '#a8c4d8',
                lineHeight: 1.7,
                margin: '0 0 24px',
              }}
            >
              Your report has been logged. We review all submissions and correct verified errors.
            </p>
            <button
              type="button"
              data-no-disintegrate
              onClick={onClose}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 13,
                color: '#6a8a9a',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
