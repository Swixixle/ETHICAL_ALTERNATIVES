import { useCallback, useState } from 'react';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function tapUrl() {
  return apiBase ? `${apiBase}/api/tap` : '/api/tap';
}

function investigateUrl() {
  return apiBase ? `${apiBase}/api/investigate` : '/api/investigate';
}

const CONFIRM_THRESHOLD = 0.75;

export function useTapAnalysis() {
  const [image, setImage] = useState(null);
  const [tapPosition, setTapPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [geo, setGeo] = useState(null);
  const [tapSession, setTapSession] = useState(0);
  /** @type {null | { identification: object, identification_tier: string, response_ms?: number }} */
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [regionSelectActive, setRegionSelectActive] = useState(false);

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

  const buildBody = useCallback(
    (tapX, tapY, { preview_only = false } = {}) => {
      const body = {
        image_base64: image,
        tap_x: tapX,
        tap_y: tapY,
        preview_only,
      };
      if (geo && typeof geo === 'object' && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
        body.user_lat = geo.lat;
        body.user_lng = geo.lng;
      }
      return body;
    },
    [image, geo]
  );

  const fetchTap = useCallback(async (tapX, tapY, options) => {
    const res = await fetch(tapUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(tapX, tapY, options)),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  }, [buildBody]);

  const runFullPipeline = useCallback(
    async (tapX, tapY) => {
      const { ok, data } = await fetchTap(tapX, tapY, { preview_only: false });
      if (!ok) {
        setError(data.error || `Request failed`);
        return;
      }
      setResult(data);
      setPendingConfirmation(null);
    },
    [fetchTap]
  );

  /** Single tap: preview first; high confidence runs full pipeline immediately (second request). */
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
      setPendingConfirmation(null);
      setRegionSelectActive(false);

      try {
        const preview = await fetchTap(tapX, tapY, { preview_only: true });
        if (!preview.ok) {
          setError(preview.data.error || `Request failed (${preview.status})`);
          return;
        }

        const idRaw = preview.data.identification || {};
        const conf = typeof idRaw?.confidence === 'number' ? idRaw.confidence : 0;

        if (conf >= CONFIRM_THRESHOLD) {
          await runFullPipeline(tapX, tapY);
          return;
        }

        const crop =
          (typeof idRaw.crop_base64 === 'string' && idRaw.crop_base64) ||
          (typeof preview.data.crop_base64 === 'string' && preview.data.crop_base64) ||
          null;
        setPendingConfirmation({
          identification: crop ? { ...idRaw, crop_base64: crop } : { ...idRaw },
          identification_tier: preview.data.identification_tier,
          response_ms: preview.data.response_ms,
          scene_inventory: Array.isArray(preview.data.scene_inventory)
            ? preview.data.scene_inventory
            : null,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      } finally {
        setLoading(false);
      }
    },
    [image, fetchTap, runFullPipeline]
  );

  const confirmPendingIdentification = useCallback(async () => {
    if (!image || !tapPosition) return;
    setLoading(true);
    setError(null);
    try {
      await runFullPipeline(tapPosition.x, tapPosition.y);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [image, tapPosition, runFullPipeline]);

  const cancelPendingConfirmation = useCallback(() => {
    setPendingConfirmation(null);
    setTapPosition(null);
    setTapSession((s) => s + 1);
  }, []);

  const startBackgroundReselect = useCallback(() => {
    setPendingConfirmation(null);
    setRegionSelectActive(true);
  }, []);

  const completeRegionSelect = useCallback(
    async (cx, cy) => {
      setRegionSelectActive(false);
      setTapPosition({ x: cx, y: cy });
      setTapSession((s) => s + 1);
      await analyzeTap(cx, cy);
    },
    [analyzeTap]
  );

  const cancelRegionSelect = useCallback(() => {
    setRegionSelectActive(false);
    setTapPosition(null);
    setTapSession((s) => s + 1);
  }, []);

  const investigateByBrand = useCallback(async (brand) => {
    const q = String(brand || '').trim();
    if (!q) {
      setError('Enter a company or brand name');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setImage(null);
    setTapPosition(null);
    setPendingConfirmation(null);
    setRegionSelectActive(false);
    setTapSession((s) => s + 1);
    try {
      const res = await fetch(investigateUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: q }),
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
  }, []);

  const reset = useCallback(() => {
    setImage(null);
    setTapPosition(null);
    setLoading(false);
    setResult(null);
    setError(null);
    setGeo(null);
    setTapSession((s) => s + 1);
    setPendingConfirmation(null);
    setRegionSelectActive(false);
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setTapPosition(null);
    setPendingConfirmation(null);
    setRegionSelectActive(false);
    setTapSession((s) => s + 1);
  }, []);

  const selectAlternativeBrand = useCallback(
    (item) => {
      const xp = Number(item?.approximate_x_percent);
      const yp = Number(item?.approximate_y_percent);
      if (!Number.isFinite(xp) || !Number.isFinite(yp)) return;
      analyzeTap(xp / 100, yp / 100);
    },
    [analyzeTap]
  );

  return {
    image,
    tapPosition,
    loading,
    result,
    error,
    setImage,
    analyzeTap,
    confirmPendingIdentification,
    cancelPendingConfirmation,
    pendingConfirmation,
    regionSelectActive,
    startBackgroundReselect,
    completeRegionSelect,
    cancelRegionSelect,
    reset,
    clearResult,
    captureGeoOnce,
    tapSession,
    selectAlternativeBrand,
    investigateByBrand,
  };
}
