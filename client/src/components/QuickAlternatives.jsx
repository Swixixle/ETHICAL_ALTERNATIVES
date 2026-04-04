/**
 * @param {{
 *   registryResults?: Array<Record<string, unknown>>;
 *   localResults?: Array<Record<string, unknown>>;
 * }} props
 */
export default function QuickAlternatives({ registryResults, localResults }) {
  const reg = Array.isArray(registryResults) ? registryResults : [];
  const loc = Array.isArray(localResults) ? localResults : [];
  const picks = [];

  for (const s of reg) {
    if (picks.length >= 3) break;
    const name = s.seller_name ? String(s.seller_name) : 'Seller';
    const url =
      s.website_url || s.etsy_url || s.instagram_url || s.other_url
        ? String(s.website_url || s.etsy_url || s.instagram_url || s.other_url)
        : null;
    const href = url && !url.startsWith('http') ? `https://${url}` : url;
    const dist =
      s.distance_miles != null && Number.isFinite(Number(s.distance_miles))
        ? `${Number(s.distance_miles).toFixed(1)} mi`
        : null;
    picks.push({ name, href, dist, kind: 'registry' });
  }

  for (const p of loc) {
    if (picks.length >= 3) break;
    const name = p.name ? String(p.name) : 'Local';
    const website = p.website ? String(p.website) : null;
    const href = website ? (website.startsWith('http') ? website : `https://${website}`) : null;
    const dist =
      p.distance_miles != null && Number.isFinite(Number(p.distance_miles))
        ? `${Number(p.distance_miles).toFixed(1)} mi`
        : null;
    picks.push({ name, href, dist, kind: 'local' });
  }

  if (!picks.length) return null;

  return (
    <div style={{ margin: '0 0 1.1rem' }}>
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'var(--color-text-muted, #6a8a9a)',
          marginBottom: 10,
        }}
      >
        Alternatives near you
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 4,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {picks.map((item, idx) => (
          <div
            key={`${item.kind}-${idx}-${item.name}`}
            style={{
              flex: '0 0 min(200px, 42vw)',
              background: 'var(--color-panel-bg, #162030)',
              border: '1px solid var(--color-border, #2a3f52)',
              borderRadius: 4,
              padding: '12px 14px',
              minHeight: 88,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 18,
                letterSpacing: 1,
                color: 'var(--color-text, #f0e8d0)',
                lineHeight: 1.1,
              }}
            >
              {item.name}
            </div>
            {item.dist ? (
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: 'var(--color-accent, #f0a820)',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginTop: 6,
                }}
              >
                {item.dist}
              </div>
            ) : (
              <div style={{ marginTop: 6 }} />
            )}
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: '#0f1520',
                  background: '#f0a820',
                  padding: '5px 10px',
                  borderRadius: 2,
                  textDecoration: 'none',
                  fontWeight: 700,
                  marginTop: 10,
                  alignSelf: 'flex-start',
                }}
              >
                Open ↗
              </a>
            ) : (
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: 'var(--color-text-muted, #6a8a9a)',
                  marginTop: 10,
                }}
              >
                Maps search only
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
