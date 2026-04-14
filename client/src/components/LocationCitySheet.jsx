import { useState } from 'react';
import { locationFromManualCity, persistLocation, reverseGeocode } from '../services/location.js';

const NAVY = '#0A1F3D';
const AMBER = '#D4A017';

/** Minimal bottom sheet: city entry + geocode; persists via locationFromManualCity (ea_user_* keys). */
export default function LocationCitySheet({ onResolved }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function handleContinue(e) {
    e.preventDefault();
    const q = value.trim();
    if (!q) {
      setErr('Enter a city to continue.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await locationFromManualCity(q);
      onResolved?.();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not look up that city.');
    } finally {
      setBusy(false);
    }
  }

  function handlePreciseLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErr('Location is not available in this browser. Enter a city above.');
      return;
    }
    setBusy(true);
    setErr(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          let loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy_m: position.coords.accuracy,
          };
          const geo = await reverseGeocode(loc.lat, loc.lng);
          loc = { ...loc, ...geo };
          persistLocation(loc);
          onResolved?.();
        } catch (e2) {
          setErr(e2 instanceof Error ? e2.message : 'Could not save that location.');
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        console.error('[LocationCitySheet] geolocation', err?.code, err?.message);
        setErr(
          err && 'code' in err && err.code === 1
            ? 'Location access was denied. You can enter your city above instead.'
            : 'Could not read your location. Enter your city above.'
        );
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ea-city-prompt-label"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 20,
        zIndex: 5000,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <form
        onSubmit={handleContinue}
        style={{
          pointerEvents: 'auto',
          width: 'min(420px, calc(100% - 32px))',
          background: NAVY,
          border: `1px solid rgba(212, 160, 23, 0.35)`,
          borderRadius: 8,
          padding: '16px 18px 18px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        }}
      >
        <p
          id="ea-city-prompt-label"
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 13,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: AMBER,
            margin: '0 0 10px',
          }}
        >
          Help us find local context near you
        </p>
        <input
          type="text"
          name="city"
          autoComplete="address-level2"
          placeholder="What city are you in?"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            minHeight: 44,
            padding: '0 12px',
            borderRadius: 4,
            fontFamily: "'Crimson Text', serif",
            marginBottom: 12,
          }}
        />
        {err ? (
          <p style={{ color: '#c98a7e', fontSize: 13, margin: '0 0 10px' }}>{err}</p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={handlePreciseLocation}
          style={{
            width: '100%',
            minHeight: 44,
            marginBottom: 10,
            border: `1px solid rgba(212, 160, 23, 0.65)`,
            borderRadius: 4,
            background: 'transparent',
            color: AMBER,
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            cursor: busy ? 'wait' : 'pointer',
            fontWeight: 700,
          }}
        >
          Use precise location
        </button>
        <button
          type="submit"
          disabled={busy}
          style={{
            width: '100%',
            minHeight: 44,
            border: 'none',
            borderRadius: 4,
            background: AMBER,
            color: '#1a1203',
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            cursor: busy ? 'wait' : 'pointer',
            fontWeight: 700,
          }}
        >
          {busy ? 'Looking up…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
