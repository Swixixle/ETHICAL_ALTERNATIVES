import { useCallback, useState } from 'react';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function tapUrl() {
  return apiBase ? `${apiBase}/api/tap` : '/api/tap';
}

export function useTapAnalysis() {
  const [image, setImage] = useState(null);
  const [tapPosition, setTapPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [geo, setGeo] = useState(null);
  const [tapSession, setTapSession] = useState(0);

  const captureGeoOnce = useCallback(() => {
    if (geo !== null || typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => setGeo(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  }, [geo]);

  const analyzeTap = useCallback(
    async (tapX, tapY) => {
      if (!image) {
        setError('No image loaded');
        return;
      }

      setTapPosition({ x: tapX, y: tapY });
      setLoading(true);
      setError(null);
      setResult(null);

      const body = {
        image_base64: image,
        tap_x: tapX,
        tap_y: tapY,
      };

      if (geo && typeof geo === 'object' && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
        body.user_lat = geo.lat;
        body.user_lng = geo.lng;
      }

      try {
        const res = await fetch(tapUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(data.error || `Request failed (${res.status})`);
          return;
        }

        setResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      } finally {
        setLoading(false);
      }
    },
    [image, geo]
  );

  const reset = useCallback(() => {
    setImage(null);
    setTapPosition(null);
    setLoading(false);
    setResult(null);
    setError(null);
    setGeo(null);
    setTapSession((s) => s + 1);
  }, []);

  /** Same photo: clear API result so user can tap again */
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setTapPosition(null);
    setTapSession((s) => s + 1);
  }, []);

  return {
    image,
    tapPosition,
    loading,
    result,
    error,
    setImage,
    analyzeTap,
    reset,
    clearResult,
    captureGeoOnce,
    tapSession,
  };
}
