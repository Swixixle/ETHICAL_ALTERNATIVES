/**
 * @param {{ data: { who_benefited?: { group: string; how: string }[]; who_paid?: { group: string; how: string }[]; the_gap?: string | null } | null | undefined }} props
 */
export default function CostAbsorption({ data }) {
  if (!data) return null;
  const benefited = Array.isArray(data.who_benefited) ? data.who_benefited : [];
  const paid = Array.isArray(data.who_paid) ? data.who_paid : [];
  const gap = typeof data.the_gap === 'string' && data.the_gap.trim() ? data.the_gap.trim() : '';
  if (!benefited.length && !paid.length && !gap) return null;

  return (
    <div
      style={{
        background: '#162030',
        border: 'none',
        borderLeft: '3px solid #d4a017',
        padding: '20px 24px',
        margin: '24px 0',
      }}
    >
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: '#a8c4d8',
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        Who absorbs the cost
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#6aaa8a',
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            Who benefited
          </div>
          {benefited.map((item, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: '#f0e8d0',
                  marginBottom: 3,
                  textTransform: 'none',
                }}
              >
                {item.group}
              </div>
              <div
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 14,
                  color: '#e0e0e0',
                  lineHeight: 1.65,
                }}
              >
                {item.how}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#ff6b6b',
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            Who paid
          </div>
          {paid.map((item, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: '#f0e8d0',
                  marginBottom: 3,
                  textTransform: 'none',
                }}
              >
                {item.group}
              </div>
              <div
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 14,
                  color: '#e0e0e0',
                  lineHeight: 1.65,
                }}
              >
                {item.how}
              </div>
            </div>
          ))}
        </div>
      </div>

      {gap ? (
        <div
          style={{
            borderTop: 'none',
            borderLeft: '3px solid #d4a017',
            padding: '14px 0 0 14px',
            marginTop: 14,
            fontFamily: "'Crimson Pro', serif",
            fontSize: 15,
            fontStyle: 'italic',
            color: '#e0e0e0',
            lineHeight: 1.65,
          }}
        >
          {gap}
        </div>
      ) : null}
    </div>
  );
}
