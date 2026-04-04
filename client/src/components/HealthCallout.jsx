import { hasDocumentedHealthConcerns } from '../utils/investigationHealth.js';

/**
 * @param {{ investigation?: Record<string, unknown> | null }} props
 */
export default function HealthCallout({ investigation }) {
  if (!hasDocumentedHealthConcerns(investigation)) return null;

  return (
    <aside
      style={{
        marginBottom: 20,
        padding: '12px 16px',
        background: 'rgba(255, 107, 107, 0.06)',
        border: '1px solid rgba(255, 107, 107, 0.25)',
        borderLeft: '4px solid #ff6b6b',
        borderRadius: '0 4px 4px 0',
      }}
    >
      <p
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 15,
          color: '#e8dfc8',
          lineHeight: 1.65,
          margin: '0 0 10px 0',
        }}
      >
        This investigation documents health-related concerns for this product or company. Before you
        buy or use similar items, check ingredients and product safety references.
      </p>
      <a
        href="https://www.ewg.org/skindeep/"
        target="_blank"
        rel="noreferrer"
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: '#e8a020',
          textDecoration: 'none',
        }}
      >
        EWG Skin Deep — ingredient checker ↗
      </a>
    </aside>
  );
}
