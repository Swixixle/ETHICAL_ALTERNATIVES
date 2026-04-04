import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  locationFromManualCity,
  persistLocation,
  readCachedLocation,
  reverseGeocode,
} from '../services/location.js';
import { getCityIdentity } from '../services/cityIdentity.js';
import { dailyChainShuffle, dailyFeedShuffle, dailyNotVerifiedShuffle, utcDateKey } from '../utils/dailyShuffle.js';
import TrustStrip from './TrustStrip.jsx';
import ListYourShop from './ListYourShop.jsx';
import CommunityBoard from './CommunityBoard.jsx';
import TerritoryCard from './TerritoryCard.jsx';
import {
  lookupCurrentTerritory,
  primeTravelTracker,
  resetTravelTracker,
  startTravelTracking,
  stopTravelTracking,
} from '../services/travelTracker.js';

const ONBOARD_KEY = 'ea_geo_onboard';

/** @param {GeolocationPositionError | Error} err */
function geolocationFailureHint(err) {
  const code = err && 'code' in err ? err.code : undefined;
  if (code === 1) {
    return {
      message:
        'Location access was denied. You can enable it in your browser settings or enter your city below.',
    };
  }
  if (code === 3) {
    return {
      message: 'Location timed out — enter your city:',
    };
  }
  const base =
    typeof err?.message === 'string' && err.message.trim()
      ? err.message.trim()
      : 'Could not get your location.';
  return {
    message: `${base} Enter your city below to see the same home experience.`,
  };
}

/** @param {{ onSearch: (q: string) => void; onStartSnap: () => void }} props */
function SearchBar({ onSearch, onStartSnap }) {
  const [query, setQuery] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }

  const inputStyle = {
    width: '100%',
    minHeight: 48,
    boxSizing: 'border-box',
    background: '#162030',
    border: '1px solid #2a3f52',
    borderRadius: 2,
    padding: '0 16px',
    fontFamily: "'Crimson Pro', serif",
    fontSize: 17,
    color: '#f0e8d0',
    outline: 'none',
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '14px 16px 16px',
        borderBottom: '1px solid #2a3f52',
        background: '#0f1520',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'stretch',
          marginBottom: 10,
        }}
      >
        <input
          type="search"
          name="investigate"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any company, brand, or CEO..."
          enterKeyHint="search"
          style={{ ...inputStyle, flex: '1 1 auto', minWidth: 0 }}
        />
        <button
          type="button"
          onClick={() => onStartSnap()}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
            background: '#f0a820',
            color: '#0f1520',
            border: 'none',
            minHeight: 48,
            minWidth: 112,
            padding: '0 20px',
            borderRadius: 2,
            cursor: 'pointer',
            fontWeight: 800,
            flexShrink: 0,
            boxSizing: 'border-box',
            boxShadow: '0 0 0 1px rgba(240,168,32,0.35)',
          }}
        >
          📷 Snap
        </button>
      </div>
      <button
        type="submit"
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          width: '100%',
          minHeight: 48,
          boxSizing: 'border-box',
          background: '#121a28',
          color: '#f0a820',
          border: '1px solid #3d4f62',
          padding: '0 22px',
          borderRadius: 2,
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        Investigate
      </button>
    </form>
  );
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'repair', label: 'Repair' },
  { value: 'art', label: 'Art' },
  { value: 'stay', label: 'Stay' },
];

/** Below OSM/registry lodging: third-party tools biased toward small hosts. */
function BookIndependentStayLinks({ city, state }) {
  const place = [city, state].filter(Boolean).join(', ');
  const encPlace = encodeURIComponent(place || '');
  const airbnb = place
    ? `https://www.airbnb.com/s/${encodeURIComponent(place)}/homes`
    : 'https://www.airbnb.com';
  const vrbo = `https://www.vrbo.com/search?destination=${encPlace || encodeURIComponent('United States')}`;
  const hipcamp = `https://www.hipcamp.com/en-US/search?q=${encPlace}`;
  const harvestHosts = 'https://www.harvesthosts.com';
  const glampingHub = 'https://glampinghub.com';
  const hostelworld = place
    ? `https://www.hostelworld.com/hostels?search=${encodeURIComponent(place)}`
    : 'https://www.hostelworld.com';

  const items = [
    {
      href: airbnb,
      title: 'Airbnb — prefer individual hosts, not property managers',
      blurb: 'Whole-home and private-room stays; read host profiles and reviews before booking.',
    },
    {
      href: vrbo,
      title: 'VRBO — vacation rentals',
      blurb: 'Often entire homes; good for longer trips and multi-room groups.',
    },
    {
      href: hipcamp,
      title: 'Hipcamp — independent campgrounds and farm stays',
      blurb: 'Camping and glamping on private land and small campgrounds.',
    },
    {
      href: harvestHosts,
      title: 'Harvest Hosts — farm, winery, and brewery stays',
      blurb: 'RV overnight spots at small producers; membership required.',
    },
    {
      href: glampingHub,
      title: 'Glamping Hub — unique independent stays',
      blurb: 'Treehouses, yurts, and small-lot eco lodging from individual operators.',
    },
    {
      href: hostelworld,
      title: 'Hostelworld — independent hostels worldwide',
      blurb: 'Budget beds; many listings are owner-operated — check recent reviews.',
    },
  ];

  return (
    <div
      style={{
        padding: '20px 24px 24px',
        marginTop: 8,
        borderTop: '1px solid #283648',
        background: 'rgba(15,21,32,0.35)',
      }}
    >
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#f0a820',
          marginBottom: 16,
        }}
      >
        Book independent
      </div>
      {items.map((item) => (
        <div key={item.href} style={{ marginBottom: 16 }}>
          <a
            href={item.href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#f0a820',
              textDecoration: 'none',
              lineHeight: 1.35,
            }}
          >
            <span aria-hidden="true" style={{ flexShrink: 0 }}>→</span>
            <span>{item.title}</span>
          </a>
          <p
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontSize: 13,
              color: '#5a6a78',
              lineHeight: 1.45,
              margin: '6px 0 0 22px',
            }}
          >
            {item.blurb}
          </p>
        </div>
      ))}
      <p
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 13,
          color: '#5a6a78',
          lineHeight: 1.55,
          margin: '8px 0 0',
          paddingTop: 12,
          borderTop: '1px solid #1e3044',
        }}
      >
        On Airbnb and VRBO, choose entire homes hosted by individuals rather than property management
        companies to keep money with local owners. Links open in a new tab — we do not endorse any
        listing; always verify hosts and cancellation terms.
      </p>
      {place ? (
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1,
            color: '#4a5a68',
            margin: '10px 0 0',
            textTransform: 'uppercase',
          }}
        >
          Search hints use {place}
        </p>
      ) : null}
    </div>
  );
}

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function initialPhase() {
  if (typeof window === 'undefined') return 'prompt';
  if (sessionStorage.getItem(ONBOARD_KEY) === 'skipped') return 'skipped';
  // Once GPS or manual city succeeded, never show the location prompt again this session.
  if (sessionStorage.getItem(ONBOARD_KEY) === 'granted') return 'loading';
  return 'prompt';
}

function LocationPrompt({
  geoShare,
  onSkip,
  hint,
  manualVisible,
  onOpenManualEntry,
  onManualSubmit,
  manualBusy,
}) {
  const [manualCity, setManualCity] = useState('');

  async function submitManual(e) {
    e.preventDefault();
    const q = manualCity.trim();
    if (!q || manualBusy) return;
    await onManualSubmit(q);
  }

  const showManual = manualVisible || Boolean(hint);

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
          color: '#f0e8d0',
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
          color: '#a8c4d8',
          lineHeight: 1.7,
          maxWidth: 380,
          marginBottom: 32,
        }}
      >
        To show you independent businesses near you, we need your location. We don&apos;t store it.
        We don&apos;t sell it.         It&apos;s used only to find what&apos;s close.
      </div>

      {hint ? (
        <div
          style={{
            fontFamily: "'Crimson Pro', serif",
          fontSize: 18,
          color: '#d4a574',
            lineHeight: 1.6,
            maxWidth: 380,
            marginBottom: 20,
          }}
        >
          {hint}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() =>
          navigator.geolocation.getCurrentPosition(geoShare.success, geoShare.error, geoShare.options)
        }
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          background: '#f0a820',
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
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          background: 'transparent',
          color: '#a8c4d8',
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

      {showManual ? (
        <form
          onSubmit={submitManual}
          style={{
            width: '100%',
            maxWidth: 320,
            marginTop: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            textAlign: 'left',
          }}
        >
          <label
            htmlFor="ea-manual-city"
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#a8c4d8',
            }}
          >
            Your city
          </label>
          <input
            id="ea-manual-city"
            type="text"
            name="city"
            autoComplete="address-level2"
            enterKeyHint="go"
            value={manualCity}
            onChange={(e) => setManualCity(e.target.value)}
            placeholder="e.g. Indianapolis, IN"
            disabled={manualBusy}
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontSize: 18,
              padding: '12px 14px',
              borderRadius: 2,
              border: '1px solid #2a3f52',
              background: '#0a1018',
              color: '#f0e8d0',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={manualBusy || !manualCity.trim()}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              background: manualBusy || !manualCity.trim() ? '#3d4f62' : '#2a4a30',
              color: '#f0e8d0',
              border: '1px solid #3d5c44',
              padding: '12px 24px',
              borderRadius: 2,
              cursor: manualBusy || !manualCity.trim() ? 'default' : 'pointer',
              fontWeight: 700,
            }}
          >
            {manualBusy ? 'Looking up…' : 'Show my local feed'}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={onOpenManualEntry}
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 18,
            color: '#6b8aa3',
            background: 'none',
            border: 'none',
            marginTop: 20,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 4,
          }}
        >
          Enter my city instead
        </button>
      )}

      <div
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 16,
          color: '#6a8a9a',
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
  const [open, setOpen] = useState(false);
  if (!identity) return null;

  const cityPart = [city, state].filter(Boolean).join(', ');
  const headline = typeof identity.headline === 'string' ? identity.headline.trim() : '';
  const amberLine = [headline, cityPart].filter(Boolean).join(' · ');

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          padding: '12px 24px',
          border: 'none',
          borderBottom: '1px solid #2a3f52',
          background: '#0f1520',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1,
            color: '#f0a820',
            lineHeight: 1.45,
          }}
        >
          {amberLine || cityPart}
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        padding: '24px 24px 20px',
        borderBottom: '1px solid #2a3f52',
        marginBottom: 0,
        background: '#0f1520',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(false)}
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#6a8a9a',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 0 12px',
        }}
      >
        ← Collapse city story
      </button>
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 12,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: '#f0a820',
          marginBottom: 8,
        }}
      >
        {cityPart}
      </div>

      {identity.daily_rotation?.rotation_theme ? (
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#6a8a9a',
            marginBottom: 14,
            maxWidth: 420,
            lineHeight: 1.45,
          }}
        >
          Today — {identity.daily_rotation.rotation_theme}
        </div>
      ) : null}

      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(32px, 6vw, 56px)',
          letterSpacing: 2,
          color: '#f0e8d0',
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
          fontSize: 18,
          color: '#a8c4d8',
          lineHeight: 1.65,
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
                fontSize: 11,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: '#f0a820',
                border: '1px solid rgba(240,168,32,0.3)',
                borderRadius: 999,
                padding: '3px 10px',
                background: 'rgba(240,168,32,0.07)',
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
            fontSize: 17,
            fontStyle: 'italic',
            color: '#6a8a9a',
            margin: 0,
          }}
        >
          {identity.neighborhood_note}
        </p>
      ) : null}
    </div>
  );
}

function FeedCard({ business, chainFootnote = false, mutedSection = false }) {
  const website = business.website;
  const hasBadges = business.ethics_badges?.length > 0;
  const visitHref =
    website && (website.startsWith('http') ? website : `https://${website}`);

  const mapQuery = [business.name, business.address, business.city].filter(Boolean).join(' ');

  const cardStyle = chainFootnote
    ? {
        background: '#121820',
        border: '1px solid #2a3f52',
        borderRadius: 4,
        padding: '14px 16px',
        margin: '0 16px 10px',
        opacity: 0.5,
      }
    : mutedSection
      ? {
          background: '#101820',
          border: '1px solid #283648',
          borderRadius: 4,
          padding: '14px 16px',
          margin: '0 16px 10px',
          opacity: 0.72,
        }
      : {
          background: '#162030',
          border: '1px solid #2a3f52',
          borderRadius: 4,
          padding: '14px 16px',
          margin: '0 16px 10px',
        };

  const trustTier = business.trust_tier ? String(business.trust_tier) : 'local_unvetted';

  return (
    <div style={cardStyle}>
      <TrustStrip trustTier={trustTier} chainFootnote={chainFootnote} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 22,
              letterSpacing: 1.5,
              color: chainFootnote || mutedSection ? '#6b7a88' : '#f0e8d0',
              marginBottom: 2,
            }}
          >
            {business.name}
          </div>

          {business.tagline ? (
            <div
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 16,
                color: chainFootnote || mutedSection ? '#6a8a9a' : '#a8c4d8',
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
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: chainFootnote || mutedSection ? '#6a8a9a' : '#f0a820',
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
                    fontSize: 11,
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
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#0f1520',
              background: '#f0a820',
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
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#a8c4d8',
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
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#6a8a9a',
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
export default function HomeScreen({ onStartSnap, onSearchInvestigate }) {
  const [phase, setPhase] = useState(() => initialPhase());
  const [location, setLocation] = useState(() => readCachedLocation());
  const [identity, setIdentity] = useState(null);
  const [feed, setFeed] = useState([]);
  const [notVerifiedIndependent, setNotVerifiedIndependent] = useState([]);
  const [chainResults, setChainResults] = useState([]);
  const [category, setCategory] = useState('all');
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [geoHint, setGeoHint] = useState(null);
  const [manualCityVisible, setManualCityVisible] = useState(false);
  const [manualCityBusy, setManualCityBusy] = useState(false);
  const [territoryData, setTerritoryData] = useState(null);
  const [territoryOverlayOpen, setTerritoryOverlayOpen] = useState(false);
  const [communityBoardOpen, setCommunityBoardOpen] = useState(false);
  const [travelStayActive, setTravelStayActive] = useState(false);
  const [travelStayFeed, setTravelStayFeed] = useState([]);
  const [travelStayNotVerified, setTravelStayNotVerified] = useState([]);
  const [travelStayChain, setTravelStayChain] = useState([]);
  const lastTerritoryCountyRef = useRef(null);

  const fetchFeed = useCallback(async (lat, lng, cat, opts = {}) => {
    const silent = Boolean(opts.silent);
    if (!silent) setLoadingFeed(true);
    try {
      const p = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        category: cat,
        radius: '25',
      });
      const res = await fetch(`${apiPrefix()}/api/local-feed?${p}`);
      const data = await res.json();
      return {
        feed: Array.isArray(data.feed) ? data.feed : [],
        chain_results: Array.isArray(data.chain_results) ? data.chain_results : [],
        not_verified_independent: Array.isArray(data.not_verified_independent)
          ? data.not_verified_independent
          : [],
      };
    } catch {
      return { feed: [], chain_results: [], not_verified_independent: [] };
    } finally {
      if (!silent) setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;

    let loc = location;
    if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
      const cached = readCachedLocation();
      if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
        setLocation(cached);
        return;
      }
      if (sessionStorage.getItem(ONBOARD_KEY) === 'granted') {
        setPhase('ready');
        setIdentity(null);
        setFeed([]);
        setNotVerifiedIndependent([]);
        setChainResults([]);
        return;
      }
      setPhase('prompt');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [identityData, pack] = await Promise.all([
          getCityIdentity(loc.city, loc.state, loc.country),
          fetchFeed(loc.lat, loc.lng, 'all'),
        ]);
        if (cancelled) return;
        setIdentity(identityData);
        const dateKey = utcDateKey();
        const shuffleOpts = {
          dateKey,
          city: loc.city,
          state: loc.state,
        };
        setFeed(dailyFeedShuffle(pack.feed, shuffleOpts));
        setNotVerifiedIndependent(dailyNotVerifiedShuffle(pack.not_verified_independent, shuffleOpts));
        setChainResults(dailyChainShuffle(pack.chain_results, shuffleOpts));
        setCategory('all');
        sessionStorage.setItem(ONBOARD_KEY, 'granted');
        setPhase('ready');
      } catch (e) {
        if (!cancelled) {
          console.error('[home] identity/feed load failed', e);
          if (sessionStorage.getItem(ONBOARD_KEY) === 'granted') {
            setPhase('ready');
            setGeoHint(
              'Could not refresh your city feed. Check your connection — your location is still saved for this session.'
            );
          } else {
            setPhase('prompt');
            setGeoHint(
              'Could not load your city feed. Check your connection or try entering your city again.'
            );
            setManualCityVisible(true);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, location, fetchFeed]);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) return;

    const apiBase = apiPrefix();
    let cancelled = false;

    resetTravelTracker();
    primeTravelTracker(location.lat, location.lng, null);

    lookupCurrentTerritory(location.lat, location.lng, apiBase)
      .then((data) => {
        if (cancelled || !data?.history) return;
        setTerritoryData(data);
        const c = data.county ? String(data.county) : null;
        if (c) lastTerritoryCountyRef.current = c;
        primeTravelTracker(location.lat, location.lng, data.county || null);
      })
      .catch((err) => console.warn('[territory]', err?.message || err));

    startTravelTracking(apiBase, (newData) => {
      if (cancelled || !newData?.history) return;
      setTerritoryData(newData);
      const nc = newData.county ? String(newData.county) : null;
      if (nc && lastTerritoryCountyRef.current && nc !== lastTerritoryCountyRef.current) {
        setTravelStayActive(true);
      }
      if (nc) lastTerritoryCountyRef.current = nc;
    });

    return () => {
      cancelled = true;
      stopTravelTracking();
    };
  }, [phase, location?.lat, location?.lng]);

  useEffect(() => {
    if (!travelStayActive || phase !== 'ready') return;
    if (category === 'stay') return;
    if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) return;
    let cancelled = false;
    (async () => {
      const pack = await fetchFeed(location.lat, location.lng, 'stay', { silent: true });
      if (cancelled) return;
      const shuffleOpts = {
        dateKey: utcDateKey(),
        city: location.city,
        state: location.state,
      };
      setTravelStayFeed(dailyFeedShuffle(pack.feed, shuffleOpts));
      setTravelStayNotVerified(dailyNotVerifiedShuffle(pack.not_verified_independent, shuffleOpts));
      setTravelStayChain(dailyChainShuffle(pack.chain_results, shuffleOpts));
    })();
    return () => {
      cancelled = true;
    };
  }, [travelStayActive, phase, category, location?.lat, location?.lng, location?.city, location?.state, fetchFeed]);

  const geoShare = useMemo(
    () => ({
      options: { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      success: (position) => {
        setGeoHint(null);
        setManualCityVisible(false);
        setPhase('loading');
        let loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy_m: position.coords.accuracy,
        };
        void reverseGeocode(loc.lat, loc.lng)
          .then((geo) => {
            loc = { ...loc, ...geo };
            persistLocation(loc);
            setLocation(loc);
            sessionStorage.setItem(ONBOARD_KEY, 'granted');
          })
          .catch(() => {
            persistLocation(loc);
            setLocation(loc);
            sessionStorage.setItem(ONBOARD_KEY, 'granted');
          });
      },
      error: (err) => {
        const { message } = geolocationFailureHint(err);
        setGeoHint(message);
        setManualCityVisible(true);
        setPhase('prompt');
      },
    }),
    []
  );

  function handleOpenManualCity() {
    setGeoHint(
      (prev) =>
        prev ||
        'Enter your city to get the same home experience as GPS — local identity and feed.'
    );
    setManualCityVisible(true);
  }

  async function handleManualCitySubmit(cityText) {
    setManualCityBusy(true);
    setGeoHint(null);
    setPhase('loading');
    try {
      const loc = await locationFromManualCity(cityText);
      setLocation(loc);
      sessionStorage.setItem(ONBOARD_KEY, 'granted');
      setManualCityVisible(false);
      setGeoHint(null);
    } catch (err) {
      console.error('[home] manual city failed', err);
      setGeoHint(err.message || 'Could not find that city.');
      setManualCityVisible(true);
      setPhase('prompt');
    } finally {
      setManualCityBusy(false);
    }
  }

  function handleSkip() {
    sessionStorage.setItem(ONBOARD_KEY, 'skipped');
    setPhase('skipped');
  }

  async function handleCategoryChange(cat) {
    setCategory(cat);
    if (!location?.lat || !location?.lng) return;
    const pack = await fetchFeed(location.lat, location.lng, cat);
    const dateKey = utcDateKey();
    const shuffleOpts = { dateKey, city: location.city, state: location.state };
    setFeed(dailyFeedShuffle(pack.feed, shuffleOpts));
    setNotVerifiedIndependent(dailyNotVerifiedShuffle(pack.not_verified_independent, shuffleOpts));
    setChainResults(dailyChainShuffle(pack.chain_results, shuffleOpts));
  }

  if (phase === 'prompt') {
    return (
      <LocationPrompt
        geoShare={geoShare}
        onSkip={handleSkip}
        hint={geoHint}
        manualVisible={manualCityVisible}
        onOpenManualEntry={handleOpenManualCity}
        onManualSubmit={handleManualCitySubmit}
        manualBusy={manualCityBusy}
      />
    );
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
            fontSize: 11,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#f0a820',
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
            color: '#f0e8d0',
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
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#6a8a9a',
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
            background: '#f0a820',
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
          padding: '8px 24px',
          zIndex: 100,
        }}
      >
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28,
            letterSpacing: 2,
            color: '#f0e8d0',
            lineHeight: 1,
          }}
        >
          ETHICALALT
        </div>
      </div>

      <CityCard identity={identity} city={location?.city} state={location?.state} />

      {typeof onSearchInvestigate === 'function' ? (
        <SearchBar onSearch={onSearchInvestigate} onStartSnap={onStartSnap} />
      ) : null}

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 24px',
          overflowX: 'auto',
          borderBottom: '1px solid #2a3f52',
          position: 'sticky',
          top: 48,
          background: '#0f1520',
          zIndex: 99,
          alignItems: 'center',
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => handleCategoryChange(cat.value)}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              padding: '6px 14px',
              borderRadius: 999,
              border: category === cat.value ? '1px solid #f0a820' : '1px solid #2a3f52',
              background: category === cat.value ? 'rgba(240,168,32,0.12)' : 'transparent',
              color: category === cat.value ? '#f0a820' : '#6a8a9a',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {cat.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => territoryData?.history && setTerritoryOverlayOpen(true)}
          disabled={!territoryData?.history}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid #344d62',
            background: territoryData?.history ? 'rgba(168,196,216,0.08)' : 'transparent',
            color: territoryData?.history ? '#a8c4d8' : '#4a5a68',
            cursor: territoryData?.history ? 'pointer' : 'default',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginLeft: 4,
          }}
        >
          You are here →
        </button>
      </div>

      {territoryOverlayOpen && territoryData ? (
        <div
          role="presentation"
          tabIndex={-1}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 10, 18, 0.85)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 'max(24px, env(safe-area-inset-top)) 16px 32px',
            overflowY: 'auto',
          }}
          onClick={() => setTerritoryOverlayOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setTerritoryOverlayOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{ width: '100%', maxWidth: 520, marginTop: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <TerritoryCard
              data={territoryData}
              onDismiss={() => setTerritoryOverlayOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div style={{ paddingTop: 16, paddingBottom: 32 }}>
        {phase === 'ready' && travelStayActive && category !== 'stay' ? (
          <div
            style={{
              marginBottom: 8,
              paddingBottom: 20,
              borderBottom: '1px solid #283648',
            }}
          >
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#f0a820',
                padding: '0 24px 12px',
              }}
            >
              New county — independent stays nearby
            </div>
            {!loadingFeed && travelStayFeed.length > 0 ? (
              <>
                {travelStayFeed.map((business) => (
                  <FeedCard key={`travel-${business.id}`} business={business} />
                ))}
              </>
            ) : null}
            {!loadingFeed && travelStayNotVerified.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: '#6a8a9a',
                    padding: '0 24px 8px',
                  }}
                >
                  Also nearby · not verified (travel)
                </div>
                {travelStayNotVerified.map((business) => (
                  <FeedCard key={`travel-nv-${business.id}`} business={business} mutedSection />
                ))}
              </div>
            ) : null}
            {!loadingFeed && travelStayChain.length > 0 ? (
              <div style={{ marginTop: 16, opacity: 0.85 }}>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: '#6a8a9a',
                    padding: '0 24px 12px',
                  }}
                >
                  Chain hotels (reference only)
                </div>
                {travelStayChain.map((business) => (
                  <FeedCard key={`travel-ch-${business.id}`} business={business} chainFootnote />
                ))}
              </div>
            ) : null}
            {!loadingFeed &&
            travelStayFeed.length === 0 &&
            travelStayNotVerified.length === 0 &&
            travelStayChain.length === 0 ? (
              <p
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 16,
                  color: '#6a8a9a',
                  padding: '0 24px 16px',
                  margin: 0,
                }}
              >
                No mapped indie stays in radius yet — try Book independent below.
              </p>
            ) : null}
            <BookIndependentStayLinks city={location?.city} state={location?.state} />
          </div>
        ) : null}

        {loadingFeed ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 24px',
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 2,
              color: '#6a8a9a',
              textTransform: 'uppercase',
            }}
          >
            Loading local independents...
          </div>
        ) : null}

        {!loadingFeed &&
        feed.length === 0 &&
        chainResults.length === 0 &&
        notVerifiedIndependent.length === 0 ? (
          <div
            style={{
              padding: '32px 24px',
              fontFamily: "'Crimson Pro', serif",
              fontSize: 20,
              color: '#6a8a9a',
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
        ) : null}

        {!loadingFeed && feed.length > 0 ? (
          <>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#6a8a9a',
                padding: '0 24px 12px',
              }}
            >
              {feed.length} near you
            </div>
            {feed.map((business) => (
              <FeedCard key={business.id} business={business} />
            ))}
          </>
        ) : null}

        {!loadingFeed && notVerifiedIndependent.length > 0 ? (
          <div
            style={{
              marginTop: 28,
              paddingTop: 24,
              borderTop: '1px solid #1e3044',
            }}
          >
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#6a8a9a',
                padding: '0 24px 8px',
              }}
            >
              Also nearby — not verified independent
            </div>
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 14,
                color: '#5a6a78',
                lineHeight: 1.55,
                padding: '0 24px 14px',
                margin: 0,
              }}
            >
              These places passed our map filter but could not be confirmed independent (missing
              classification, low confidence, or ambiguous name). Shown for discovery only — not
              endorsed as local independents.
            </p>
            {notVerifiedIndependent.map((business) => (
              <FeedCard key={`nv-${business.id}`} business={business} mutedSection />
            ))}
          </div>
        ) : null}

        {!loadingFeed && feed.length === 0 && chainResults.length > 0 ? (
          <p
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontSize: 18,
              color: '#6a8a9a',
              lineHeight: 1.65,
              textAlign: 'center',
              padding: '8px 24px 20px',
              margin: 0,
            }}
          >
            No independent listings in this filter. Below are nearby chain locations for reference
            only — not recommendations.
          </p>
        ) : null}

        {!loadingFeed && chainResults.length > 0 ? (
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #1e3044' }}>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#6a8a9a',
                padding: '0 24px 12px',
              }}
            >
              Chain locations (reference only)
            </div>
            {chainResults.map((business) => (
              <FeedCard key={`chain-${business.id}`} business={business} chainFootnote />
            ))}
          </div>
        ) : null}

        {!loadingFeed && phase === 'ready' && category === 'stay' ? (
          <BookIndependentStayLinks city={location?.city} state={location?.state} />
        ) : null}

        {phase === 'ready' ? (
          <>
            <div
              style={{
                margin: '28px 16px 0',
                padding: 18,
                border: '1px solid #2a3f52',
                borderRadius: 4,
                background: '#121820',
              }}
            >
              <button
                type="button"
                onClick={() => setCommunityBoardOpen((o) => !o)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#f0a820',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                }}
              >
                <span>Community Board →</span>
                <span aria-hidden="true">{communityBoardOpen ? '▾' : '▸'}</span>
              </button>
            </div>
            {communityBoardOpen ? (
              <div style={{ margin: '16px 16px 0' }}>
                <CommunityBoard location={location} />
              </div>
            ) : null}
          </>
        ) : null}

        <div style={{ paddingBottom: 56 }} aria-hidden />
      </div>
    </div>
  );
}
