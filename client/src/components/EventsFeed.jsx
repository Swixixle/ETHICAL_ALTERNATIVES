/**
 * Local “Tonight” tab: Eventbrite-backed cards or curated external search links.
 * @param {{
 *   payload: Record<string, unknown> | null;
 *   location?: { city?: string | null; state?: string | null } | null;
 * }} props
 */
export default function EventsFeed({ payload, location: loc }) {
  if (!payload) {
    return null;
  }

  const mode = String(payload.mode || '');
  const placeLabel = [loc?.city, loc?.state].filter(Boolean).join(', ');

  if (mode === 'links' || payload.fetch_error) {
    const links = Array.isArray(payload.curated_links) ? payload.curated_links : [];
    const apiFail = typeof payload.eventbrite_status === 'number';
    return (
      <div style={{ padding: '8px 16px 24px' }}>
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28,
            letterSpacing: 3,
            color: '#f0e8d0',
            textTransform: 'uppercase',
            marginBottom: 8,
            padding: '0 8px',
          }}
        >
          WHAT&apos;S ON TONIGHT
        </div>
        <p
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 16,
            color: '#a8c4d8',
            margin: '0 8px 20px',
            lineHeight: 1.5,
          }}
        >
          {apiFail
            ? 'Eventbrite returned an error — use the links below or check EVENTBRITE_API_KEY on the server.'
            : payload.fetch_error
              ? 'Could not reach the events API. Try these local search links:'
              : `Open listings on the web${placeLabel ? ` near ${placeLabel}` : ''}. Set EVENTBRITE_API_KEY on the server for live cards here.`}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {links.map((item) => {
            const href = typeof item.href === 'string' ? item.href : '#';
            const label = typeof item.label === 'string' ? item.label : 'Link';
            const hint = typeof item.hint === 'string' ? item.hint : '';
            return (
              <a
                key={href + label}
                href={href}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  background: '#162030',
                  border: '1px solid #2a3f52',
                  borderRadius: 4,
                  textDecoration: 'none',
                  color: '#f0a820',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 14,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  →
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: '#f0a820',
                      display: 'block',
                      lineHeight: 1.4,
                    }}
                  >
                    {label}
                  </span>
                  {hint ? (
                    <span
                      style={{
                        fontFamily: "'Crimson Pro', serif",
                        fontSize: 14,
                        color: '#6a8a9a',
                        display: 'block',
                        marginTop: 4,
                        lineHeight: 1.45,
                      }}
                    >
                      {hint}
                    </span>
                  ) : null}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  const events = Array.isArray(payload.events) ? payload.events : [];

  if (!events.length) {
    return (
      <div style={{ padding: '24px 24px 32px' }}>
        <p
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 18,
            color: '#6a8a9a',
            lineHeight: 1.65,
            textAlign: 'center',
            margin: 0,
          }}
        >
          No upcoming events in the next week from this search, or all hits were chain venues.
          Check Eventbrite filters or try the curated links with the API key unset.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 16px 24px' }}>
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#6a8a9a',
          padding: '0 8px 14px',
        }}
      >
        Tonight & this week · Eventbrite (25 mi)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {events.map((ev) => {
          const name = typeof ev.name === 'string' ? ev.name : 'Event';
          const venue = typeof ev.venue_name === 'string' ? ev.venue_name : '';
          const startIso = typeof ev.start_iso === 'string' ? ev.start_iso : '';
          const d = startIso ? new Date(startIso) : null;
          const dateStr =
            d && !Number.isNaN(d.getTime())
              ? d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
              : '';
          const timeStr =
            d && !Number.isNaN(d.getTime())
              ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
              : '';
          const priceLabel = typeof ev.price_label === 'string' ? ev.price_label : '—';
          const isFree = Boolean(ev.is_free);
          const tag = typeof ev.category_tag === 'string' ? ev.category_tag : 'COMMUNITY';
          const url = typeof ev.url === 'string' && ev.url ? ev.url : '#';

          return (
            <a
              key={String(ev.id)}
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                background: '#162030',
                border: '1px solid #2a3f52',
                borderRadius: 4,
                padding: '16px 18px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 20,
                  letterSpacing: 1,
                  color: '#f0e8d0',
                  lineHeight: 1.15,
                  marginBottom: 6,
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 1,
                  color: '#f0a820',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                {venue || 'Venue TBA'}
              </div>
              <div
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 15,
                  color: '#a8c4d8',
                  marginBottom: 10,
                }}
              >
                {dateStr}
                {dateStr && timeStr ? ' · ' : ''}
                {timeStr}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: isFree ? '#6aaa8a' : '#f0a820',
                    border: `1px solid ${isFree ? 'rgba(106,170,138,0.4)' : 'rgba(240,168,32,0.35)'}`,
                    borderRadius: 999,
                    padding: '3px 10px',
                  }}
                >
                  {isFree && priceLabel.toUpperCase() === 'FREE' ? 'FREE' : priceLabel}
                </span>
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: '#6a8a9a',
                    border: '1px solid #344d62',
                    borderRadius: 999,
                    padding: '3px 10px',
                  }}
                >
                  {tag}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: '#f0a820',
                  marginTop: 12,
                  letterSpacing: 1,
                }}
              >
                View event ↗
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
