import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '../utils/haptics.js';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function tapUrl() {
  return apiBase ? `${apiBase}/api/tap` : '/api/tap';
}

function tapSourcingUrl() {
  return apiBase ? `${apiBase}/api/tap/sourcing` : '/api/tap/sourcing';
}

function tapInvestigationUrl() {
  return apiBase ? `${apiBase}/api/tap/investigation` : '/api/tap/investigation';
}

function investigateUrl() {
  return apiBase ? `${apiBase}/api/investigate` : '/api/investigate';
}

function getSessionId() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    let id = sessionStorage.getItem('ea_session_id');
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `ea-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem('ea_session_id', id);
    }
    return id;
  } catch {
    return null;
  }
}

/** @param {unknown} a @param {unknown} b */
function mergeSources(a, b) {
  const s = new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]);
  return [...s];
}

/** Below this → confirm / disambiguation flow; 0.60–0.84 still loads the card with an on-card accuracy hint. */
const CONFIRM_THRESHOLD = 0.6;

export function useTapAnalysis() {
  const [image, setImage] = useState(null);
  const [tapPosition, setTapPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [geo, setGeo] = useState(null);
  const [tapSession, setTapSession] = useState(0);
  /** @type {null | { identification: object, identification_tier: string, response_ms?: number, scene_inventory?: unknown, db_preview?: unknown }} */
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [regionSelectActive, setRegionSelectActive] = useState(false);
  /** @type {React.MutableRefObject<{ x: number; y: number; width: number; height: number } | null>} */
  const selectionBoxRef = useRef(null);
  const [activeSelectionBox, setActiveSelectionBox] = useState(null);
  const errorHapticFired = useRef(false);

  useEffect(() => {
    if (error) {
      if (!errorHapticFired.current) {
        haptic('error');
        errorHapticFired.current = true;
      }
    } else {
      errorHapticFired.current = false;
    }
  }, [error]);

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
    (tapX, tapY, { preview_only = false, selection_box = null } = {}) => {
      const body = {
        image_base64: image,
        tap_x: tapX,
        tap_y: tapY,
        preview_only,
        session_id: getSessionId(),
      };
      if (selection_box && typeof selection_box === 'object') {
        body.selection_box = {
          x: selection_box.x,
          y: selection_box.y,
          width: selection_box.width,
          height: selection_box.height,
        };
      }
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

  const runResearchPhase = useCallback(
    (identification) => {
      const session_id = getSessionId();
      const sourcingBody = {
        identification,
        session_id,
      };
      if (geo && typeof geo === 'object' && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
        sourcingBody.user_lat = geo.lat;
        sourcingBody.user_lng = geo.lng;
      }
      const invBody = {
        identification,
        session_id,
        user_lat: sourcingBody.user_lat,
        user_lng: sourcingBody.user_lng,
      };

      void (async () => {
        try {
          const sRes = await fetch(tapSourcingUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sourcingBody),
          });
          const sData = await sRes.json().catch(() => ({}));
          if (sRes.ok) {
            setResult((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                results: Array.isArray(sData.results) ? sData.results : prev.results,
                registry_results: Array.isArray(sData.registry_results)
                  ? sData.registry_results
                  : prev.registry_results,
                local_results: Array.isArray(sData.local_results)
                  ? sData.local_results
                  : prev.local_results,
                empty_sources: sData.empty_sources ?? prev.empty_sources,
                searched_sources: mergeSources(prev.searched_sources, sData.searched_sources),
                sourcing_complete: true,
              };
            });
          }
        } catch (e) {
          console.error('[sourcing]', e);
        }
      })();

      void (async () => {
        try {
          if (!identification.brand && !identification.corporate_parent) {
            setResult((prev) => (prev ? { ...prev, research_loading: false } : prev));
            return;
          }
          const iRes = await fetch(tapInvestigationUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invBody),
          });
          const iData = await iRes.json().catch(() => ({}));
          if (iRes.ok) {
            setResult((prev) => {
              if (!prev) return prev;
              const inv = iData.investigation ?? null;
              return {
                ...prev,
                investigation: inv,
                research_loading: false,
                searched_sources: mergeSources(prev.searched_sources, iData.searched_sources),
              };
            });
          } else {
            setResult((prev) => (prev ? { ...prev, research_loading: false } : prev));
          }
        } catch (e) {
          console.error('[investigation]', e);
          setResult((prev) => (prev ? { ...prev, research_loading: false } : prev));
        }
      })();
    },
    [geo]
  );

  /** Single tap: preview; high confidence → partial result + parallel research/alternatives. */
  const analyzeTap = useCallback(
    async (tapX, tapY, selectionBox = null) => {
      if (!image) {
        setError('No image loaded');
        return;
      }

      const selBox =
        selectionBox &&
        typeof selectionBox === 'object' &&
        [selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height].every((n) =>
          Number.isFinite(Number(n))
        ) &&
        Number(selectionBox.width) > 0 &&
        Number(selectionBox.height) > 0
          ? {
              x: Number(selectionBox.x),
              y: Number(selectionBox.y),
              width: Number(selectionBox.width),
              height: Number(selectionBox.height),
            }
          : null;

      selectionBoxRef.current = selBox;
      setTapPosition({ x: tapX, y: tapY });
      setActiveSelectionBox(selBox);
      setLoading(true);
      haptic('scan');
      setError(null);
      setResult(null);
      setPendingConfirmation(null);
      setRegionSelectActive(false);

      try {
        const preview = await fetchTap(tapX, tapY, {
          preview_only: true,
          selection_box: selBox,
        });
        if (!preview.ok) {
          setError(preview.data.error || `Request failed (${preview.status})`);
          return;
        }

        const idRaw = preview.data.identification || {};
        const conf = typeof idRaw?.confidence === 'number' ? idRaw.confidence : 0;

        const crop =
          (typeof idRaw.crop_base64 === 'string' && idRaw.crop_base64) ||
          (typeof preview.data.crop_base64 === 'string' && preview.data.crop_base64) ||
          null;

        const db_preview = preview.data.db_preview ?? null;

        if (conf < CONFIRM_THRESHOLD) {
          setPendingConfirmation({
            identification: crop ? { ...idRaw, crop_base64: crop } : { ...idRaw },
            identification_tier: preview.data.identification_tier,
            response_ms: preview.data.response_ms,
            scene_inventory: Array.isArray(preview.data.scene_inventory)
              ? preview.data.scene_inventory
              : null,
            db_preview,
          });
          return;
        }

        setResult({
          identification: idRaw,
          identification_tier: preview.data.identification_tier,
          db_preview,
          scene_inventory: preview.data.scene_inventory,
          investigation: null,
          results: [],
          registry_results: [],
          local_results: [],
          response_ms: preview.data.response_ms,
          version: 'v1',
          research_loading: Boolean(idRaw.brand || idRaw.corporate_parent),
          searched_sources: [],
          empty_sources: [],
          sourcing_complete: false,
        });
        runResearchPhase(idRaw);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      } finally {
        setLoading(false);
        setActiveSelectionBox(null);
      }
    },
    [image, fetchTap, runResearchPhase]
  );

  const confirmPendingIdentification = useCallback(() => {
    if (!pendingConfirmation) return;
    const pc = pendingConfirmation;
    const id = pc.identification;
    setError(null);
    setPendingConfirmation(null);

    setResult({
      identification: id,
      identification_tier: pc.identification_tier,
      db_preview: pc.db_preview ?? null,
      scene_inventory: pc.scene_inventory,
      investigation: null,
      results: [],
      registry_results: [],
      local_results: [],
      response_ms: pc.response_ms,
      version: 'v1',
      research_loading: Boolean(id.brand || id.corporate_parent),
      searched_sources: [],
      empty_sources: [],
      sourcing_complete: false,
    });
    runResearchPhase(id);
  }, [pendingConfirmation, runResearchPhase]);

  const cancelPendingConfirmation = useCallback(() => {
    setPendingConfirmation(null);
    setTapPosition(null);
    selectionBoxRef.current = null;
    setActiveSelectionBox(null);
    setTapSession((s) => s + 1);
  }, []);

  const startBackgroundReselect = useCallback(() => {
    setPendingConfirmation(null);
    setRegionSelectActive(true);
  }, []);

  const completeRegionSelect = useCallback(
    async (cx, cy, normRect = null) => {
      setRegionSelectActive(false);
      setTapPosition({ x: cx, y: cy });
      setTapSession((s) => s + 1);
      await analyzeTap(cx, cy, normRect);
    },
    [analyzeTap]
  );

  const cancelRegionSelect = useCallback(() => {
    setRegionSelectActive(false);
    setTapPosition(null);
    selectionBoxRef.current = null;
    setActiveSelectionBox(null);
    setTapSession((s) => s + 1);
  }, []);

  const investigateByBrand = useCallback(async (brand) => {
    const q = String(brand || '').trim();
    if (!q) {
      setError('Enter a company or brand name');
      return;
    }
    setLoading(true);
    haptic('scan');
    setError(null);
    setResult(null);
    setImage(null);
    setTapPosition(null);
    setPendingConfirmation(null);
    setRegionSelectActive(false);
    selectionBoxRef.current = null;
    setActiveSelectionBox(null);
    setTapSession((s) => s + 1);
    try {
      const res = await fetch(investigateUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: q, session_id: getSessionId() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }
      setResult({
        ...data,
        research_loading: false,
        sourcing_complete: true,
      });
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
    selectionBoxRef.current = null;
    setActiveSelectionBox(null);
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setTapPosition(null);
    selectionBoxRef.current = null;
    setActiveSelectionBox(null);
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
    activeSelectionBox,
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
