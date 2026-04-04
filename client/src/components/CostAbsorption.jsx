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
        border: '1px solid #2a3f52',
        borderTop: '2px solid #f0a820',
        padding: '20px 24px',
        margin: '32px 0',
      }}
    >
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 12,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: '#f0a820',
          marginBottom: 16,
        }}
      >
        Who Absorbs the Cost
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
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#6aaa8a',
              marginBottom: 10,
            }}
          >
            Who Benefited
          </div>
          {benefited.map((item, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: '#f0e8d0',
                  marginBottom: 3,
                }}
              >
                {item.group}
              </div>
              <div
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 18,
                  color: '#a8c4d8',
                  lineHeight: 1.5,
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
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#ff6b6b',
              marginBottom: 10,
            }}
          >
            Who Paid
          </div>
          {paid.map((item, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: '#f0e8d0',
                  marginBottom: 3,
                }}
              >
                {item.group}
              </div>
              <div
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 18,
                  color: '#a8c4d8',
                  lineHeight: 1.5,
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
            borderTop: '1px solid #2a3f52',
            paddingTop: 14,
            marginTop: 14,
            fontFamily: "'Crimson Pro', serif",
            fontSize: 18,
            fontStyle: 'italic',
            color: '#f0e8d0',
            lineHeight: 1.6,
          }}
        >
          {gap}
        </div>
      ) : null}
    </div>
  );
}
