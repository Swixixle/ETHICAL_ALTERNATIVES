import { getGoogleMapsUrl } from '../utils/localBusinessMaps.js';
import {
  filterLocalRetailPlaces,
  filterOnlineSellerRows,
  sortLocalPlacesByDistanceAsc,
} from '../utils/alternativesFilters.js';

const directionsLinkStyle = {
  fontFamily: "'Space Mono', monospace",
  fontSize: 9,
  color: '#f0a820',
  textDecoration: 'none',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 700,
  padding: 0,
  whiteSpace: 'nowrap',
};

/**
 * @param {{
 *   registryResults?: Array<Record<string, unknown>>;
 *   localResults?: Array<Record<string, unknown>>;
 * }} props
 */
export default function QuickAlternatives({ registryResults, localResults }) {
  const reg = filterOnlineSellerRows(Array.isArray(registryResults) ? registryResults : []);
  const loc = sortLocalPlacesByDistanceAsc(
    filterLocalRetailPlaces(Array.isArray(localResults) ? localResults : [])
  );
  /** @type {Array<Record<string, unknown>>} */
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
    const addrParts = [s.address, s.city, s.state_province].filter(Boolean).map(String);
    const mapsPlace = {
      name,
      lat: s.lat,
      lng: s.lng,
      address: addrParts.length ? addrParts.join(', ') : null,
      street_address_line: s.street_address_line ? String(s.street_address_line) : null,
    };
    picks.push({ name, href, dist, kind: 'registry', mapsPlace });
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
    picks.push({ name, href, dist, kind: 'local', mapsPlace: p });
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
          marginBottom: 6,
        }}
      >
        Alternatives near you
      </div>
      <div
        style={{
          border: '1px solid var(--color-border, #2a3f52)',
          borderRadius: 4,
          background: 'var(--color-panel-bg, #121a24)',
          overflow: 'hidden',
        }}
      >
        {picks.map((item, idx) => {
          const mapsHref = getGoogleMapsUrl(item.mapsPlace);
          return (
            <div
              key={`${item.kind}-${idx}-${item.name}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                borderBottom: idx < picks.length - 1 ? '1px solid #283648' : 'none',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 17,
                    letterSpacing: 1,
                    color: 'var(--color-text, #f0e8d0)',
                    lineHeight: 1.15,
                  }}
                >
                  {item.name}
                </div>
                {item.dist ? (
                  <div
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                      color: '#6a8a9a',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      marginTop: 4,
                    }}
                  >
                    {item.dist}
                  </div>
                ) : null}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
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
                      padding: '8px 14px',
                      borderRadius: 2,
                      textDecoration: 'none',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    Visit ↗
                  </a>
                ) : null}
                {mapsHref ? (
                  <a href={mapsHref} target="_blank" rel="noreferrer" style={directionsLinkStyle}>
                    GET DIRECTIONS ↗
                  </a>
                ) : null}
                {!item.href && !mapsHref ? (
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                      color: 'var(--color-text-muted, #6a8a9a)',
                      flexShrink: 0,
                    }}
                  >
                    —
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
