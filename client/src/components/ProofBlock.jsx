const SOURCE_KEYS = [
  'tax_sources',
  'legal_sources',
  'labor_sources',
  'environmental_sources',
  'political_sources',
  'product_health_sources',
  'executive_sources',
];

const GRADE_KEYS = [
  'tax_evidence_grade',
  'legal_evidence_grade',
  'labor_evidence_grade',
  'environmental_evidence_grade',
  'political_evidence_grade',
  'product_health_evidence_grade',
];

const GRADE_ORDER = {
  alleged: 5,
  limited: 4,
  moderate: 3,
  strong: 2,
  established: 1,
};

const GRADE_COLORS = {
  established: { bg: 'rgba(106,170,138,0.15)', text: '#6aaa8a', border: '#6aaa8a' },
  strong: { bg: 'rgba(240,168,32,0.1)', text: '#f0a820', border: '#f0a820' },
  moderate: { bg: 'rgba(168,196,216,0.12)', text: '#a8c4d8', border: '#6a8a9a' },
  limited: { bg: 'rgba(106,138,154,0.12)', text: '#6a8a9a', border: '#344d62' },
  alleged: { bg: 'rgba(255,107,107,0.1)', text: '#ff6b6b', border: '#ff6b6b' },
};

/** @param {Record<string, unknown> | null | undefined} inv */
function countSectionSources(inv) {
  if (!inv || typeof inv !== 'object') return 0;
  let n = 0;
  for (const k of SOURCE_KEYS) {
    const arr = inv[k];
    if (Array.isArray(arr)) n += arr.length;
  }
  return n;
}

/** @param {Record<string, unknown> | null | undefined} inv */
function worstEvidenceGrade(inv) {
  if (!inv || typeof inv !== 'object') return null;
  let best = null;
  let bestScore = 0;
  for (const k of GRADE_KEYS) {
    const g = inv[k];
    if (!g || typeof g !== 'object') continue;
    const raw = typeof g.level === 'string' ? g.level.toLowerCase() : '';
    const score = GRADE_ORDER[raw] || 0;
    if (score > bestScore) {
      bestScore = score;
      best = g;
    }
  }
  return best;
}

/** @param {Record<string, unknown> | null | undefined} id */
function matchMethodLabel(id) {
  if (!id || typeof id !== 'object') return 'Match pending';
  const m = id.identification_method;
  if (m === 'text_search') return 'Text Search';
  if (m === 'direct_logo') return 'Logo Confirmed';
  if (m === 'partial_logo') return 'Logo Inferred';
  if (m === 'product_recognition') return 'Logo Inferred';
  if (m === 'scene_inference') return 'Scene Context';
  return 'Uncertain — verify';
}

function profileTypeLabel(inv) {
  const p = String(inv?.profile_type || '').toLowerCase();
  if (p === 'database') return 'Verified Profile';
  if (p === 'realtime_search' || p === 'limited') return 'Live Research';
  return 'Live Research';
}

/**
 * @param {{
 *   investigation: Record<string, unknown>;
 *   identification?: Record<string, unknown> | null;
 *   result?: Record<string, unknown> | null;
 * }} props
 */
export default function ProofBlock({ investigation, identification, result }) {
  if (!investigation) return null;

  const inv = investigation;
  const id = identification || {};
  const srcCount = countSectionSources(inv);
  const extraSearch = Array.isArray(result?.searched_sources) ? result.searched_sources.length : 0;
  const totalSources = srcCount + extraSearch;

  const grade = worstEvidenceGrade(inv);
  const gradeLevel = grade && typeof grade.level === 'string' ? grade.level.toLowerCase() : '';
  const gColors = GRADE_COLORS[gradeLevel] || GRADE_COLORS.limited;

  return (
    <div
      style={{
        margin: '0 0 1rem',
        padding: '14px 16px',
        background: 'var(--color-panel-bg, #121a24)',
        border: '1px solid var(--color-border, #2a3f52)',
        borderRadius: 4,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '14px 24px' }}>
        <div>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(2.25rem, 6vw, 3rem)',
              letterSpacing: 2,
              color: '#f0a820',
              lineHeight: 1,
            }}
          >
            {totalSources}
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: 'var(--color-text-muted, #6a8a9a)',
              marginTop: 6,
            }}
          >
            Sources indexed
          </div>
        </div>

        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          {gradeLevel ? (
            <div
              title={typeof grade.note === 'string' ? grade.note : undefined}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                padding: '6px 12px',
                borderRadius: 999,
                border: `1px solid ${gColors.border}`,
                background: gColors.bg,
                color: gColors.text,
                display: 'inline-block',
                marginBottom: 8,
              }}
            >
              Evidence · {gradeLevel}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1,
              color: 'var(--color-text-dim, #a8c4d8)',
              lineHeight: 1.5,
            }}
          >
            <strong>Profile:</strong> {profileTypeLabel(inv)}
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1,
              color: 'var(--color-text-dim, #a8c4d8)',
              lineHeight: 1.5,
              marginTop: 4,
            }}
          >
            <strong>Match:</strong> {matchMethodLabel(id)}
          </div>
        </div>
      </div>

      {typeof result?.response_ms === 'number' || extraSearch > 0 ? (
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: 'var(--color-text-muted, #6a8a9a)',
            margin: '12px 0 0',
            letterSpacing: 0.5,
          }}
        >
          {typeof result?.response_ms === 'number' ? `${result.response_ms} ms` : ''}
          {typeof result?.response_ms === 'number' && Array.isArray(result?.searched_sources) ? ' · ' : ''}
          {Array.isArray(result?.searched_sources)
            ? `Coverage: ${result.searched_sources.join(', ')}`
            : null}
        </p>
      ) : null}
    </div>
  );
}
