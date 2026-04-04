import { useCallback, useEffect, useState } from 'react';
import { getUserLocation, readCachedLocation } from '../services/location.js';
import { getCityIdentity } from '../services/cityIdentity.js';
import ListYourShop from './ListYourShop.jsx';

const ONBOARD_KEY = 'ea_geo_onboard';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'repair', label: 'Repair' },
  { value: 'art', label: 'Art' },
];

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function initialPhase() {
  if (typeof window === 'undefined') return 'prompt';
  if (sessionStorage.getItem(ONBOARD_KEY) === 'skipped') return 'skipped';
  if (sessionStorage.getItem(ONBOARD_KEY) === 'granted') {
    const c = readCachedLocation();
    if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) return 'loading';
  }
  return 'prompt';
}

function LocationPrompt({ onAllow, onSkip }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f1520',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(36px, 7vw, 64px)',
          letterSpacing: 3,
          color: '#e8dfc8',
          lineHeight: 0.95,
          marginBottom: 24,
        }}
      >
        ETHICALALT
      </div>

      <div
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 20,
          color: '#8fa8bc',
          lineHeight: 1.7,
          maxWidth: 380,
          marginBottom: 32,
        }}
      >
        To show you independent businesses near you, we need your location. We don&apos;t store it.
        We don&apos;t sell it. It&apos;s used only to find what&apos;s close.
      </div>

      <button
        type="button"
        onClick={onAllow}
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          background: '#e8a020',
          color: '#0f1520',
          border: 'none',
          padding: '14px 32px',
          borderRadius: 2,
          cursor: 'pointer',
          fontWeight: 700,
          marginBottom: 12,
          width: '100%',
          maxWidth: 320,
        }}
      >
        Share My Location
      </button>

      <button
        type="button"
        onClick={onSkip}
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          background: 'transparent',
          color: '#8fa8bc',
          border: '1px solid #2a3f52',
          padding: '10px 24px',
          borderRadius: 2,
          cursor: 'pointer',
          width: '100%',
          maxWidth: 320,
        }}
      >
        Skip
      </button>

      <div
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 13,
          color: '#4a6478',
          marginTop: 20,
          maxWidth: 360,
          lineHeight: 1.5,
        }}
      >
        Location is used only for finding nearby independents. Never stored. Never sold.
      </div>
    </div>
  );
}

function CityCard({ identity, city, state }) {
  if (!identity) return null;

  return (
    <div
      style={{
        padding: '32px 24px 24px',
        borderBottom: '1px solid #2a3f52',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: '#e8a020',
          marginBottom: 8,
        }}
      >
        {[city, state].filter(Boolean).join(', ')}
      </div>

      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(32px, 6vw, 56px)',
          letterSpacing: 2,
          color: '#e8dfc8',
          lineHeight: 0.95,
          marginBottom: 16,
          textTransform: 'uppercase',
        }}
      >
        {identity.headline}
      </div>

      <p
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 17,
          color: '#8fa8bc',
          lineHeight: 1.7,
          margin: '0 0 16px',
        }}
      >
        {identity.scene_description}
      </p>

      {identity.known_for?.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {identity.known_for.map((item, i) => (
            <span
              key={i}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: '#e8a020',
                border: '1px solid rgba(232,160,32,0.3)',
                borderRadius: 999,
                padding: '3px 10px',
                background: 'rgba(232,160,32,0.07)',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {identity.neighborhood_note ? (
        <p
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 14,
            fontStyle: 'italic',
            color: '#4a6478',
            margin: 0,
          }}
        >
          {identity.neighborhood_note}
        </p>
      ) : null}
    </div>
  );
}

function FeedCard({ business }) {
  const website = business.website;
  const hasBadges = business.ethics_badges?.length > 0;
  const visitHref =
    website && (website.startsWith('http') ? website : `https://${website}`);

  const mapQuery = [business.name, business.address, business.city].filter(Boolean).join(' ');

  return (
    <div
      style={{
        background: '#162030',
        border: '1px solid #2a3f52',
        borderRadius: 4,
        padding: '14px 16px',
        margin: '0 16px 10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 20,
              letterSpacing: 1.5,
              color: '#e8dfc8',
              marginBottom: 2,
            }}
          >
            {business.name}
          </div>

          {business.tagline ? (
            <div
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 14,
                color: '#8fa8bc',
                lineHeight: 1.4,
                marginBottom: 6,
              }}
            >
              {business.tagline}
            </div>
          ) : null}

          {business.distance_mi != null ? (
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: '#e8a020',
                marginBottom: hasBadges ? 8 : 0,
              }}
            >
              {business.distance_mi} mi away
              {business.address ? ` · ${business.address}` : ''}
            </div>
          ) : null}

          {hasBadges ? (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {business.ethics_badges.map((badge, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 7,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: '#6aaa8a',
                    border: '1px solid rgba(106,170,138,0.3)',
                    borderRadius: 999,
                    padding: '2px 6px',
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {website ? (
          <a
            href={visitHref}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#0f1520',
              background: '#e8a020',
              padding: '6px 12px',
              borderRadius: 2,
              textDecoration: 'none',
              fontWeight: 700,
              flexShrink: 0,
              marginLeft: 12,
              alignSelf: 'flex-start',
            }}
          >
            Visit ↗
          </a>
        ) : null}
        {!website && business.phone ? (
          <a
            href={`tel:${business.phone}`}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#8fa8bc',
              border: '1px solid #2a3f52',
              padding: '6px 12px',
              borderRadius: 2,
              textDecoration: 'none',
              flexShrink: 0,
              marginLeft: 12,
            }}
          >
            Call
          </a>
        ) : null}
        {!website && !business.phone ? (
          <a
            href={`https://www.google.com/maps/search/${encodeURIComponent(mapQuery || business.name)}`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#4a6478',
              border: '1px solid #2a3f52',
              padding: '6px 12px',
              borderRadius: 2,
              textDecoration: 'none',
              flexShrink: 0,
              marginLeft: 12,
            }}
          >
            Map ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}

/**
 * @param {{ onStartSnap: () => void }} props
 */
export default function HomeScreen({ onStartSnap }) {
  const [phase, setPhase] = useState(initialPhase);
  const [location, setLocation] = useState(() => readCachedLocation());
  const [identity, setIdentity] = useState(null);
  const [feed, setFeed] = useState([]);
  const [category, setCategory] = useState('all');
  const [loadingFeed, setLoadingFeed] = useState(false);

  const fetchFeed = useCallback(async (lat, lng, cat) => {
    setLoadingFeed(true);
    try {
      const p = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        category: cat,
        radius: '25',
      });
      const res = await fetch(`${apiPrefix()}/api/local-feed?${p}`);
      const data = await res.json();
      return Array.isArray(data.feed) ? data.feed : [];
    } catch {
      return [];
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;
    if (!location?.lat || !location?.lng) {
      setPhase('prompt');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [identityData, feedData] = await Promise.all([
          getCityIdentity(location.city, location.state, location.country),
          fetchFeed(location.lat, location.lng, 'all'),
        ]);
        if (cancelled) return;
        setIdentity(identityData);
        setFeed(feedData);
        setCategory('all');
        setPhase('ready');
      } catch {
        if (!cancelled) setPhase('prompt');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, location, fetchFeed]);

  async function handleAllow() {
    setPhase('loading');
    try {
      const loc = await getUserLocation();
      setLocation(loc);
      sessionStorage.setItem(ONBOARD_KEY, 'granted');
    } catch {
      setPhase('prompt');
    }
  }

  function handleSkip() {
    sessionStorage.setItem(ONBOARD_KEY, 'skipped');
    setPhase('skipped');
  }

  async function handleCategoryChange(cat) {
    setCategory(cat);
    if (!location?.lat || !location?.lng) return;
    const rows = await fetchFeed(location.lat, location.lng, cat);
    setFeed(rows);
  }

  if (phase === 'prompt') {
    return <LocationPrompt onAllow={handleAllow} onSkip={handleSkip} />;
  }

  if (phase === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0f1520',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#e8a020',
          }}
        >
          Finding your independents...
        </div>
      </div>
    );
  }

  if (phase === 'skipped') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0f1520',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(40px, 8vw, 80px)',
            letterSpacing: 3,
            color: '#e8dfc8',
            lineHeight: 0.9,
            marginBottom: 24,
            textTransform: 'uppercase',
          }}
        >
          ETHICALALT
        </div>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#4a6478',
            marginBottom: 32,
          }}
        >
          Tap anything · Find independent alternatives
        </div>
        <button
          type="button"
          onClick={onStartSnap}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            background: '#e8a020',
            color: '#0f1520',
            border: 'none',
            padding: '14px 32px',
            borderRadius: 2,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Snap
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f1520', minHeight: '100vh' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#0f1520',
          borderBottom: '1px solid #2a3f52',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
        }}
      >
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 22,
            letterSpacing: 2,
            color: '#e8dfc8',
          }}
        >
          ETHICALALT
        </div>
        <button
          type="button"
          onClick={onStartSnap}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            background: '#e8a020',
            color: '#0f1520',
            border: 'none',
            padding: '8px 18px',
            borderRadius: 2,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Snap
        </button>
      </div>

      <CityCard identity={identity} city={location?.city} state={location?.state} />

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '16px 24px',
          overflowX: 'auto',
          borderBottom: '1px solid #2a3f52',
          position: 'sticky',
          top: 57,
          background: '#0f1520',
          zIndex: 99,
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => handleCategoryChange(cat.value)}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              padding: '6px 14px',
              borderRadius: 999,
              border: category === cat.value ? '1px solid #e8a020' : '1px solid #2a3f52',
              background: category === cat.value ? 'rgba(232,160,32,0.12)' : 'transparent',
              color: category === cat.value ? '#e8a020' : '#4a6478',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 16, paddingBottom: 80 }}>
        {loadingFeed ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 24px',
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: 2,
              color: '#4a6478',
              textTransform: 'uppercase',
            }}
          >
            Loading local independents...
          </div>
        ) : feed.length === 0 ? (
          <div
            style={{
              padding: '32px 24px',
              fontFamily: "'Crimson Pro', serif",
              fontSize: 17,
              color: '#4a6478',
              lineHeight: 1.7,
              textAlign: 'center',
            }}
          >
            No independent businesses found in this category near you yet.
            <br />
            <br />
            Know one that should be here?
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
              <ListYourShop />
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 8,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#4a6478',
                padding: '0 24px 12px',
              }}
            >
              {feed.length} near you
            </div>
            {feed.map((business) => (
              <FeedCard key={business.id} business={business} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
