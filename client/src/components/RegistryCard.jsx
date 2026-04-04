function EthicsBadge({ label }) {
  return (
    <span
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 8,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 999,
        background: 'rgba(106, 170, 138, 0.15)',
        border: '1px solid #6aaa8a',
        color: '#6aaa8a',
        marginRight: 4,
      }}
    >
      {label}
    </span>
  );
}

/**
 * @param {{ seller: Record<string, unknown> }} props
 */
export default function RegistryCard({ seller }) {
  const {
    seller_name,
    tagline,
    product_description,
    city,
    state_province,
    distance_miles,
    website_url,
    etsy_url,
    instagram_url,
    other_url,
    other_url_label,
    ships_nationally,
    ships_worldwide,
    in_person_only,
    verified,
    is_worker_owned,
    is_bcorp,
    is_fair_trade,
  } = seller;

  const primaryUrl = website_url || etsy_url || instagram_url || other_url;
  const primaryLabel = website_url
    ? 'Visit Shop'
    : etsy_url
      ? 'Etsy Shop'
      : instagram_url
        ? 'Instagram'
        : other_url_label || 'View';

  const locationStr = [city, state_province].filter(Boolean).join(', ');
  const distNum = distance_miles != null ? Number(distance_miles) : null;
  const distanceStr =
    distNum != null && Number.isFinite(distNum)
      ? `${distNum} mi away`
      : ships_worldwide
        ? 'Ships worldwide'
        : ships_nationally
          ? 'Ships nationally'
          : in_person_only && locationStr
            ? `${locationStr} · Local pickup`
            : locationStr || null;

  return (
    <div
      style={{
        background: '#162030',
        border: '1px solid #2a3f52',
        borderRadius: 4,
        padding: '16px 20px',
        marginBottom: 12,
        position: 'relative',
      }}
    >
      {verified ? (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            fontFamily: "'Space Mono', monospace",
            fontSize: 8,
            letterSpacing: 1,
            color: '#e8a020',
            textTransform: 'uppercase',
          }}
        >
          ✓ Verified
        </div>
      ) : null}

      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 20,
          letterSpacing: 1.5,
          color: '#e8dfc8',
          marginBottom: 2,
        }}
      >
        {seller_name}
      </div>

      {(tagline || product_description) ? (
        <div
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 15,
            color: '#8fa8bc',
            lineHeight: 1.5,
            marginBottom: 8,
          }}
        >
          {tagline || product_description}
        </div>
      ) : null}

      {distanceStr ? (
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
            letterSpacing: 1.5,
            color: '#e8a020',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {distanceStr}
        </div>
      ) : null}

      {is_worker_owned || is_bcorp || is_fair_trade ? (
        <div style={{ marginBottom: 10 }}>
          {is_worker_owned ? <EthicsBadge label="Worker-Owned" /> : null}
          {is_bcorp ? <EthicsBadge label="B-Corp" /> : null}
          {is_fair_trade ? <EthicsBadge label="Fair Trade" /> : null}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {primaryUrl ? (
          <a
            href={String(primaryUrl)}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#0f1520',
              background: '#e8a020',
              padding: '6px 14px',
              borderRadius: 2,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            {primaryLabel} ↗
          </a>
        ) : null}
        {etsy_url && String(etsy_url) !== String(primaryUrl) ? (
          <a
            href={String(etsy_url)}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#8fa8bc',
              border: '1px solid #2a3f52',
              padding: '6px 14px',
              borderRadius: 2,
              textDecoration: 'none',
            }}
          >
            Etsy ↗
          </a>
        ) : null}
        {instagram_url && String(instagram_url) !== String(primaryUrl) ? (
          <a
            href={String(instagram_url)}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#8fa8bc',
              border: '1px solid #2a3f52',
              padding: '6px 14px',
              borderRadius: 2,
              textDecoration: 'none',
            }}
          >
            Instagram ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
