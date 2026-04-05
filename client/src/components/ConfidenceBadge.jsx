import { useEffect, useRef, useState } from 'react';
import { getConfidenceBadgePresentation } from '../utils/investigationConfidence.js';

/** @param {{ presentation: ReturnType<typeof getConfidenceBadgePresentation>; compact?: boolean }} props */
export default function ConfidenceBadge({ presentation, compact = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const el = rootRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDoc, true);
    return () => document.removeEventListener('click', onDoc, true);
  }, [open]);

  const { key, label, tooltip } = presentation;

  const icon = (() => {
    switch (key) {
      case 'verified_record':
        return (
          <span aria-hidden style={{ fontSize: compact ? 12 : 13, lineHeight: 1 }}>
            🛡
          </span>
        );
      case 'partial_record':
        return (
          <span aria-hidden style={{ fontSize: compact ? 12 : 13, lineHeight: 1, opacity: 0.9 }}>
            🛡
          </span>
        );
      case 'inferred':
        return (
          <span aria-hidden style={{ fontSize: compact ? 12 : 13, lineHeight: 1 }}>
            ?
          </span>
        );
      case 'limited_profile':
        return (
          <span aria-hidden style={{ fontSize: compact ? 12 : 13, lineHeight: 1 }}>
            ⏱
          </span>
        );
      default:
        return (
          <span aria-hidden style={{ fontSize: compact ? 11 : 12, lineHeight: 1 }}>
            ○
          </span>
        );
    }
  })();

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: "'Space Mono', monospace",
    fontSize: compact ? 9 : 10,
    letterSpacing: 1.2,
    fontWeight: 700,
    borderRadius: 4,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'opacity 200ms ease',
  };

  const style = (() => {
    switch (key) {
      case 'verified_record':
        return {
          ...base,
          background: '#D4A017',
          color: '#0A1F3D',
          border: 'none',
          padding: compact ? '4px 8px calc(4px + env(safe-area-inset-bottom, 0px))' : '6px 10px',
        };
      case 'partial_record':
        return {
          ...base,
          background: 'transparent',
          color: '#D4A017',
          border: '1px solid #D4A017',
          padding: compact ? '3px 8px' : '5px 10px',
        };
      case 'inferred':
        return {
          ...base,
          background: 'transparent',
          color: '#6A8A9A',
          border: '1px dashed #6A8A9A',
          padding: compact ? '3px 8px' : '5px 10px',
        };
      case 'limited_profile':
        return {
          ...base,
          background: 'rgba(106, 138, 154, 0.3)',
          color: '#a8c4d8',
          border: 'none',
          padding: compact ? '4px 8px' : '6px 10px',
        };
      default:
        return {
          ...base,
          background: '#121a24',
          color: '#6A8A9A',
          border: '1px solid #2a3f52',
          padding: compact ? '4px 8px' : '6px 10px',
        };
    }
  })();

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-expanded={open}
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {icon}
        {label}
      </button>
      {open ? (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 80,
            top: '100%',
            left: 0,
            marginTop: 8,
            maxWidth: 280,
            padding: '12px 14px',
            background: '#1c2a3a',
            border: '1px solid #344d62',
            borderRadius: 4,
            fontFamily: "'Crimson Pro', serif",
            fontSize: 13,
            lineHeight: 1.5,
            color: '#E0E0E0',
            fontWeight: 400,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            animation: 'eaTooltipIn 200ms ease-out forwards',
          }}
        >
          {tooltip}
        </div>
      ) : null}
    </span>
  );
}
