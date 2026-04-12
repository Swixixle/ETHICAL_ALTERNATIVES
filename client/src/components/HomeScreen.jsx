import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  locationFromManualCity,
  persistLocation,
  readCachedLocation,
  reverseGeocode,
} from '../services/location.js';
import { getCityIdentity } from '../services/cityIdentity.js';
import { utcDateKey } from '../utils/dailyShuffle.js';
import { sortLocalBusinessesByProximity } from '../utils/geoDistance.js';
import LocalCommercial from './LocalCommercial.jsx';
import TrustStrip from './TrustStrip.jsx';
import EventsFeed from './EventsFeed.jsx';
import TerritoryCard from './TerritoryCard.jsx';
import {
  lookupCurrentTerritory,
  primeTravelTracker,
  resetTravelTracker,
  startTravelTracking,
  stopTravelTracking,
} from '../services/travelTracker.js';
import { getGoogleMapsUrl, getStreetAddressLine } from '../utils/localBusinessMaps.js';
import PrivacyConsentPanel from './PrivacyConsentPanel.jsx';
import OnboardingDeck from './OnboardingDeck.jsx';

const ONBOARD_KEY = 'ea_geo_onboard';

/** @param {GeolocationPositionError | Error} err */
function geolocationFailureHint(err) {
  const code = err && 'code' in err ? err.code : undefined;
  if (code === 1) {
    return {
      message:
        'Location access was denied. Enable it in your browser settings, or enter your city below.',
    };
  }
  if (code === 2) {
    return {
      message:
        'Location unavailable — your device could not determine position. Enter your city below.',
    };
  }
  if (code === 3) {
    return {
      message:
        'Location timed out after 10 seconds. Enter your city below, or try again with a clearer sky or Wi‑Fi.',
    };
  }
  const base =
    typeof err?.message === 'string' && err.message.trim()
      ? err.message.trim()
      : 'Location unavailable';
  return {
    message: `${base} — enter your city below to see local independents.`,
  };
}

/** @param {{ onSearch: (q: string) => void; onStartSnap: () => void; onLocalStory?: () => void }} props */
function SearchBar({ onSearch, onStartSnap, onLocalStory }) {
  const [query, setQuery] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }

  const inputStyle = {
    width: '100%',
    minHeight: 48,
    boxSizing: 'border-box',
    borderRadius: 2,
    padding: '0 16px',
    fontFamily: "'Crimson Pro', serif",
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
          flexWrap: 'wrap',
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
          style={{ ...inputStyle, flex: '1 1 220px', minWidth: 0 }}
        />
        <button
          type="button"
          onClick={() => onStartSnap()}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 13,
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
        <button
          type="button"
          onClick={() => onLocalStory?.()}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            background: 'transparent',
            color: '#f0a820',
            border: '1px solid #f0a820',
            minHeight: 48,
            padding: '0 16px',
            borderRadius: 2,
            cursor: 'pointer',
            fontWeight: 700,
            flexShrink: 0,
            boxSizing: 'border-box',
          }}
        >
          ▶ Local Story
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
  { value: 'tonight', label: 'Tonight' },
  /** Lodging: same `/api/local-feed` + Overpass `stay` path as other categories (registry + OSM independents). */
  { value: 'stay', label: 'Stay' },
];

/** Tab icon for Stay — bed/house motif, matches monospace tab color. */
function StayCategoryIcon({ active }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden
      style={{
        display: 'inline-block',
        verticalAlign: '-0.2em',
        marginRight: 6,
        flexShrink: 0,
        opacity: active ? 1 : 0.75,
      }}
    >
      <path
        fill="currentColor"
        d="M2 17v3h2v-2h16v2h2v-3H2zm18-9h-4V5H8v3H4l-2 5v3h20v-3l-2-5zM8 7h8v2H8V7z"
      />
    </svg>
  );
}

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
  if (typeof window === 'undefined') return 'onboarding';
  if (sessionStorage.getItem(ONBOARD_KEY) === 'skipped') return 'skipped';
  // Once GPS or manual city succeeded, never show the location prompt again this session.
  if (sessionStorage.getItem(ONBOARD_KEY) === 'granted') return 'loading';
  return 'onboarding';
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
  const [buttonState, setButtonState] = useState(/** @type {'idle' | 'waiting' | 'granted'} */ ('idle'));

  function handleShareLocationClick() {
    if (buttonState !== 'idle') return;
    setButtonState('waiting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setButtonState('granted');
        geoShare.success(position);
      },
      (err) => {
        console.error('[geolocation] failed:', err?.code, err?.message);
        setButtonState('idle');
        geoShare.error(err);
      },
      geoShare.options
    );
  }

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
      <style>
        {`
          @keyframes ea-location-pulse {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 0.85; }
          }
          .ea-location-btn--waiting {
            animation: ea-location-pulse 1s ease-in-out infinite;
          }
        `}
      </style>
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
        className={buttonState === 'waiting' ? 'ea-location-btn--waiting' : undefined}
        data-no-disintegrate=""
        onClick={handleShareLocationClick}
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          background:
            buttonState === 'waiting'
              ? '#2a3f52'
              : buttonState === 'granted'
                ? '#1a6b3a'
                : '#f0a820',
          color:
            buttonState === 'waiting'
              ? '#6a8a9a'
              : buttonState === 'granted'
                ? '#a8f0c0'
                : '#0f1520',
          border:
            buttonState === 'waiting' ? '1px solid #6a8a9a' : buttonState === 'granted' ? 'none' : 'none',
          padding: '14px 32px',
          borderRadius: 2,
          cursor: buttonState === 'idle' ? 'pointer' : 'default',
          fontWeight: 700,
          marginBottom: 12,
          width: '100%',
          maxWidth: 320,
          pointerEvents: buttonState === 'idle' ? 'auto' : 'none',
          opacity: buttonState === 'waiting' ? 0.7 : 1,
        }}
      >
        {buttonState === 'waiting'
          ? 'WAITING FOR PERMISSION...'
          : buttonState === 'granted'
            ? '✓ LOCATION FOUND — LOADING →'
            : 'SHARE MY LOCATION'}
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
              fontSize: 13,
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
              padding: '12px 14px',
              borderRadius: 2,
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

      <div style={{ marginTop: 36, width: '100%', maxWidth: 400 }}>
        <PrivacyConsentPanel variant="compact" showReset={false} />
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

function FeedCard({ business, chainFootnote = false }) {
  const website = business.website;
  const hasBadges = business.ethics_badges?.length > 0;
  const visitHref =
    website && (website.startsWith('http') ? website : `https://${website}`);
  const streetLine = getStreetAddressLine(business);
  const mapsHref = getGoogleMapsUrl(business);

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

  const cardStyle = chainFootnote
    ? {
        background: '#121820',
        border: '1px solid #2a3f52',
        borderRadius: 4,
        padding: '14px 16px',
        margin: '0 16px 10px',
        opacity: 0.5,
      }
    : {
        background: '#162030',
        border: '1px solid #2a3f52',
        borderRadius: 4,
        padding: '14px 16px',
        margin: '0 16px 10px',
      };

  const trustTier = business.trust_tier ? String(business.trust_tier) : 'local';
  const provenance =
    typeof business.provenance_label === 'string' && business.provenance_label.trim()
      ? business.provenance_label.trim()
      : undefined;

  return (
    <div style={cardStyle}>
      <TrustStrip
        trustTier={trustTier}
        chainFootnote={chainFootnote}
        customLabel={provenance}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 22,
              letterSpacing: 1.5,
              color: chainFootnote ? '#6b7a88' : '#f0e8d0',
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
                color: chainFootnote ? '#6a8a9a' : '#a8c4d8',
                lineHeight: 1.4,
                marginBottom: 6,
              }}
            >
              {business.tagline}
            </div>
          ) : null}

          {business.distance_mi != null && Number.isFinite(Number(business.distance_mi)) ? (
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: chainFootnote ? '#6a8a9a' : '#f0a820',
                marginBottom: streetLine || hasBadges ? 8 : 0,
              }}
            >
              {Number(business.distance_mi).toFixed(1)} mi away
            </div>
          ) : null}

          {streetLine ? (
            <div
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 14,
                color: chainFootnote ? '#6a8a9a' : '#a8c4d8',
                lineHeight: 1.45,
                marginBottom: hasBadges ? 8 : 0,
              }}
            >
              {streetLine}
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

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexShrink: 0,
            marginLeft: 12,
            alignSelf: 'flex-start',
          }}
        >
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
              }}
            >
              Visit ↗
            </a>
          ) : null}
          {mapsHref && !chainFootnote ? (
            <a href={mapsHref} target="_blank" rel="noreferrer" style={directionsLinkStyle}>
              GET DIRECTIONS ↗
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
              }}
            >
              Call
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{ onStartSnap: () => void; onOpenDirectory?: () => void; onOpenLibrary?: () => void; onOpenImpact?: () => void }} props
 */
export default function HomeScreen({
  onStartSnap,
  onSearchInvestigate,
  onOpenHistory,
  onOpenDirectory,
  onOpenLibrary,
  onOpenImpact,
}) {
  const [phase, setPhase] = useState(() => initialPhase());
  const [location, setLocation] = useState(() => readCachedLocation());
  const [identity, setIdentity] = useState(null);
  const [feed, setFeed] = useState([]);
  const [chainResults, setChainResults] = useState([]);
  const [showAllChains, setShowAllChains] = useState(false);
  const [category, setCategory] = useState('all');
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [geoHint, setGeoHint] = useState(null);
  const [manualCityVisible, setManualCityVisible] = useState(false);
  const [manualCityBusy, setManualCityBusy] = useState(false);
  const [territoryData, setTerritoryData] = useState(null);
  const [territoryOverlayOpen, setTerritoryOverlayOpen] = useState(false);
  const [travelStayActive, setTravelStayActive] = useState(false);
  const [travelStayFeed, setTravelStayFeed] = useState([]);
  const [travelStayChain, setTravelStayChain] = useState([]);
  const [eventsPayload, setEventsPayload] = useState(null);
  const [localCommercialOpen, setLocalCommercialOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
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
      };
    } catch {
      return { feed: [], chain_results: [] };
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
        setFeed(sortLocalBusinessesByProximity(pack.feed, loc.lat, loc.lng));
        setChainResults(sortLocalBusinessesByProximity(pack.chain_results, loc.lat, loc.lng));
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
    if (category === 'stay' || category === 'tonight') return;
    if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) return;
    let cancelled = false;
    (async () => {
      const pack = await fetchFeed(location.lat, location.lng, 'stay', { silent: true });
      if (cancelled) return;
      setTravelStayFeed(sortLocalBusinessesByProximity(pack.feed, location.lat, location.lng));
      setTravelStayChain(
        sortLocalBusinessesByProximity(pack.chain_results, location.lat, location.lng)
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [travelStayActive, phase, category, location?.lat, location?.lng, location?.city, location?.state, fetchFeed]);

  const geoShare = useMemo(
    () => ({
      options: { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
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
        console.error('[geolocation] failed:', err?.code, err?.message);
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
    if (cat === 'tonight') {
      setEventsPayload(null);
      setLoadingFeed(true);
      try {
        const p = new URLSearchParams({
          lat: String(location.lat),
          lng: String(location.lng),
          date: utcDateKey(),
          city: location.city || '',
          state: location.state || '',
        });
        const res = await fetch(`${apiPrefix()}/api/events?${p}`);
        setEventsPayload(await res.json());
      } catch {
        setEventsPayload({
          mode: 'links',
          curated_links: [],
          fetch_error: true,
        });
      } finally {
        setLoadingFeed(false);
      }
      return;
    }
    setEventsPayload(null);
    const pack = await fetchFeed(location.lat, location.lng, cat);
    setFeed(sortLocalBusinessesByProximity(pack.feed, location.lat, location.lng));
    setChainResults(sortLocalBusinessesByProximity(pack.chain_results, location.lat, location.lng));
  }

  if (phase === 'onboarding') {
    return (
      <OnboardingDeck
        onComplete={() => setPhase('prompt')}
        onSkip={() => {
          sessionStorage.setItem(ONBOARD_KEY, 'skipped');
          setPhase('skipped');
        }}
        onRequestLocation={() => {
          if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setGeoHint('Location is not available in this browser. Enter your city below.');
            setManualCityVisible(true);
            setPhase('prompt');
            return;
          }
          navigator.geolocation.getCurrentPosition(
            geoShare.success,
            geoShare.error,
            geoShare.options
          );
        }}
      />
    );
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
        <div style={{ marginTop: 36, width: '100%', maxWidth: 400 }}>
          <PrivacyConsentPanel variant="compact" showReset={false} />
        </div>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {typeof onOpenHistory === 'function' ? (
            <button
              type="button"
              onClick={() => onOpenHistory()}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                background: 'transparent',
                border: '1px solid #f0a820',
                color: '#f0a820',
                padding: '6px 12px',
                borderRadius: 2,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              History
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPrivacyModalOpen(true)}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              background: 'transparent',
              border: '1px solid #6a8a9a',
              color: '#a8c4d8',
              padding: '6px 12px',
              borderRadius: 2,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Privacy
          </button>
        </div>
      </div>

      {privacyModalOpen ? (
        <div
          role="dialog"
          aria-modal
          aria-label="Privacy choices"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 5000,
            background: 'rgba(8,12,18,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#121a24',
              border: '1px solid #2a3f52',
              borderRadius: 4,
              padding: '24px 20px 20px',
              maxWidth: 440,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <PrivacyConsentPanel variant="full" showReset />
            {typeof onOpenImpact === 'function' ? (
              <button
                type="button"
                onClick={() => {
                  setPrivacyModalOpen(false);
                  onOpenImpact();
                }}
                style={{
                  marginTop: 20,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 13,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  background: 'transparent',
                  border: '1px solid #6aaa8a',
                  color: '#6aaa8a',
                  padding: '10px 16px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Public impact numbers
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPrivacyModalOpen(false)}
              style={{
                marginTop: 12,
                fontFamily: "'Space Mono', monospace",
                fontSize: 13,
                letterSpacing: 1,
                textTransform: 'uppercase',
                background: '#2a3f52',
                border: 'none',
                color: '#e8e0c8',
                padding: '10px 16px',
                borderRadius: 2,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <CityCard identity={identity} city={location?.city} state={location?.state} />

      {typeof onSearchInvestigate === 'function' ? (
        <SearchBar
          onSearch={onSearchInvestigate}
          onStartSnap={onStartSnap}
          onLocalStory={() => setLocalCommercialOpen(true)}
        />
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
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {cat.value === 'stay' ? <StayCategoryIcon active={category === cat.value} /> : null}
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
        {phase === 'ready' &&
        travelStayActive &&
        category !== 'stay' &&
        category !== 'tonight' ? (
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
            {!loadingFeed && travelStayFeed.length === 0 && travelStayChain.length === 0 ? (
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

        {category === 'tonight' ? (
          <>
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
                Loading what&apos;s on…
              </div>
            ) : (
              <EventsFeed payload={eventsPayload} location={location} />
            )}
          </>
        ) : (
          <>
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

            {!loadingFeed && feed.length === 0 && chainResults.length === 0 ? (
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
                No independent listings in this filter. Below are nearby chain locations for
                reference only — not recommendations.
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
                {(() => {
                  const visibleChains = showAllChains ? chainResults : chainResults.slice(0, 12);
                  return (
                    <>
                      {visibleChains.map((business) => (
                        <FeedCard key={`chain-${business.id}`} business={business} chainFootnote />
                      ))}
                      {chainResults.length > 12 && !showAllChains ? (
                        <button
                          type="button"
                          onClick={() => setShowAllChains(true)}
                          style={{
                            display: 'block',
                            margin: '8px 16px 16px',
                            width: 'calc(100% - 32px)',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 10,
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                            background: 'transparent',
                            border: '1px solid #2a3f52',
                            color: '#6a8a9a',
                            padding: '10px',
                            borderRadius: 2,
                            cursor: 'pointer',
                          }}
                        >
                          Show {chainResults.length - 12} more nearby chains ↓
                        </button>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            ) : null}

            {!loadingFeed && phase === 'ready' && category === 'stay' ? (
              <BookIndependentStayLinks city={location?.city} state={location?.state} />
            ) : null}
          </>
        )}

        {typeof onOpenDirectory === 'function' || typeof onOpenLibrary === 'function' ? (
          <div
            style={{
              margin: '24px 16px 0',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '12px 20px',
            }}
          >
            {typeof onOpenLibrary === 'function' ? (
              <button
                type="button"
                onClick={() => onOpenLibrary()}
                style={{
                  fontSize: 12,
                  color: 'inherit',
                  opacity: 0.5,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: '0.06em',
                  textDecoration: 'underline',
                  padding: '8px 4px',
                }}
              >
                Black Book
              </button>
            ) : null}
            {typeof onOpenDirectory === 'function' ? (
              <button
                type="button"
                onClick={() => onOpenDirectory()}
                style={{
                  fontSize: 12,
                  color: 'inherit',
                  opacity: 0.5,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: '0.06em',
                  textDecoration: 'underline',
                  padding: '8px 4px',
                }}
              >
                Investigation Index
              </button>
            ) : null}
          </div>
        ) : null}

        <div style={{ paddingBottom: 56 }} aria-hidden />
      </div>

      {localCommercialOpen ? (
        <LocalCommercial
          city={location?.city}
          state={location?.state ?? null}
          lat={typeof location?.lat === 'number' ? location.lat : null}
          lng={typeof location?.lng === 'number' ? location.lng : null}
          onClose={() => setLocalCommercialOpen(false)}
          onExploreCity={() => setLocalCommercialOpen(false)}
        />
      ) : null}
    </div>
  );
}
