import { useCallback, useEffect, useRef, useState } from 'react';
// import { haptic } from '../utils/haptics.js';
import { getImpactFetchHeaders } from '../lib/impactConsent.js';
import { getEaSessionId } from '../utils/eaSessionId.js';
import { enhanceRegionCrop } from '../utils/imageEnhance.js';

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

/** @param {unknown} a @param {unknown} b */
function mergeSources(a, b) {
  const s = new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]);
  return [...s];
}

/**
 * @param {Record<string, unknown>} identification
 * @param {Record<string, unknown>} iData
 * @param {boolean} orphan
 * @param {number} tapSession
 */
function dispatchInvestigationReady(identification, iData, orphan, tapSession) {
  if (typeof window === 'undefined') return;
  const inv = iData.investigation ?? null;
  const brand =
    identification && typeof identification.brand === 'string' && identification.brand.trim()
      ? identification.brand.trim()
      : identification && typeof identification.corporate_parent === 'string' && identification.corporate_parent.trim()
        ? identification.corporate_parent.trim()
        : identification && typeof identification.object === 'string' && identification.object.trim()
          ? identification.object.trim()
          : 'Report';
  window.dispatchEvent(
    new CustomEvent('ea-investigation-ready', {
      detail: {
        orphan,
        brandLabel: brand,
        tapSession,
        identification: identification ? { ...identification } : {},
        investigation: inv,
        is_stub_investigation:
          iData.investigation?.is_stub_investigation ?? iData.is_stub_investigation ?? false,
        rate_limited: Boolean(iData.rate_limited),
        rate_limit_message:
          typeof iData.rate_limit_message === 'string' ? iData.rate_limit_message : null,
        rate_limit_resets_in_ms: iData.rate_limit_resets_in_ms ?? null,
        searched_sources: Array.isArray(iData.searched_sources) ? iData.searched_sources : [],
      },
    })
  );
}

/** Below this → confirm / disambiguation flow; 0.60–0.84 still loads the card with an on-card accuracy hint. */
const CONFIRM_THRESHOLD = 0.6;

export function useTapAnalysis() {
  const [image, _setImage] = useState(null);
  /** Bumps when Snap session resets or a new photo is chosen — drop stale async tap work. */
  const snapEpochRef = useRef(0);

  const setImage = useCallback((b64) => {
    snapEpochRef.current += 1;
    setLoading(false);
    setError(null);
    _setImage(b64);
  }, []);

  const [tapPosition, setTapPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [geo, setGeo] = useState(null);
  const [tapSession, setTapSession] = useState(0);
  const tapSessionRef = useRef(0);
  useEffect(() => {
    tapSessionRef.current = tapSession;
  }, [tapSession]);
  /** @type {null | { identification: object, identification_tier: string, response_ms?: number, scene_inventory?: unknown, db_preview?: unknown }} */
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [regionSelectActive, setRegionSelectActive] = useState(false);
  /** @type {React.MutableRefObject<{ x: number; y: number; width: number; height: number } | null>} */
  const selectionBoxRef = useRef(null);
  const [activeSelectionBox, setActiveSelectionBox] = useState(null);
  const errorHapticFired = useRef(false);
  /** Prevents overlapping getCurrentPosition chains when geolocation is triggered multiple times quickly. */
  const geoInFlightRef = useRef(false);

  useEffect(() => {
    if (error) {
      if (!errorHapticFired.current) {
        // haptic('error');
        errorHapticFired.current = true;
      }
    } else {
      errorHapticFired.current = false;
    }
  }, [error]);

  const captureGeoOnce = useCallback(() => {
    const hasValidGeo =
      geo && typeof geo === 'object' && Number.isFinite(geo.lat) && Number.isFinite(geo.lng);
    if (hasValidGeo || typeof navigator === 'undefined' || !navigator.geolocation) return;
    if (geoInFlightRef.current) return;
    geoInFlightRef.current = true;

    const endAttempt = (nextGeo) => {
      geoInFlightRef.current = false;
      setGeo(nextGeo);
    };

    const applyPosition = (pos) => {
      endAttempt({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    };

    navigator.geolocation.getCurrentPosition(
      applyPosition,
      () => {
        navigator.geolocation.getCurrentPosition(
          applyPosition,
          () => endAttempt(false),
          { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 }
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    );
  }, [geo]);

  const buildBody = useCallback(
    (tapX, tapY, { preview_only = false, selection_box = null, imageOverride = null } = {}) => {
      const body = {
        image_base64: imageOverride || image,
        tap_x: tapX,
        tap_y: tapY,
        preview_only,
        session_id: getEaSessionId(),
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
      headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
      body: JSON.stringify(buildBody(tapX, tapY, options)),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  }, [buildBody]);

  const runResearchPhase = useCallback(
    (identification) => {
      const phaseEpoch = snapEpochRef.current;
      const session_id = getEaSessionId();
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
            headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
            body: JSON.stringify(sourcingBody),
          });
          const sData = await sRes.json().catch(() => ({}));
          if (snapEpochRef.current !== phaseEpoch) return;
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
            if (snapEpochRef.current !== phaseEpoch) return;
            setResult((prev) => (prev ? { ...prev, research_loading: false } : prev));
            return;
          }
          const iRes = await fetch(tapInvestigationUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
            body: JSON.stringify(invBody),
          });
          const iData = await iRes.json().catch(() => ({}));
          if (snapEpochRef.current !== phaseEpoch) return;
          if (iRes.ok) {
            const inv = iData.investigation ?? null;
            let orphanMerge = false;
            setResult((prev) => {
              if (!prev) {
                orphanMerge = true;
                return prev;
              }
              return {
                ...prev,
                investigation: inv,
                is_stub_investigation:
                  iData.investigation?.is_stub_investigation ?? iData.is_stub_investigation ?? false,
                research_loading: false,
                rate_limited: false,
                rate_limit_message: null,
                rate_limit_resets_in_ms: null,
                searched_sources: mergeSources(prev.searched_sources, iData.searched_sources),
              };
            });
            queueMicrotask(() => {
              if (snapEpochRef.current !== phaseEpoch) return;
              dispatchInvestigationReady(identification, iData, orphanMerge, tapSessionRef.current);
            });
          } else if (iRes.status === 429) {
            const msg =
              iData.message ||
              'You have used your 5 free investigations for today. Come back tomorrow.';
            setResult((prev) =>
              prev
                ? {
                    ...prev,
                    research_loading: false,
                    rate_limited: true,
                    rate_limit_message: msg,
                    rate_limit_resets_in_ms: iData.resets_in_ms ?? null,
                  }
                : prev
            );
          } else {
            setResult((prev) => (prev ? { ...prev, research_loading: false } : prev));
          }
        } catch (e) {
          console.error('[investigation]', e);
          if (snapEpochRef.current !== phaseEpoch) return;
          setResult((prev) => (prev ? { ...prev, research_loading: false } : prev));
        }
      })();
    },
    [geo]
  );

  /** Single tap: preview; high confidence → partial result + parallel research/alternatives. */
  const analyzeTap = useCallback(
    async (tapX, tapY, selectionBox = null, extra = {}) => {
      const { imageOverride } = extra;
      if (!image && !imageOverride) {
        setError('No image loaded');
        return;
      }

      snapEpochRef.current += 1;
      const myEpoch = snapEpochRef.current;

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
      // haptic('scan');
      setError(null);
      setResult(null);
      setPendingConfirmation(null);
      setRegionSelectActive(false);

      try {
        const preview = await fetchTap(tapX, tapY, {
          preview_only: true,
          selection_box: selBox,
          imageOverride,
        });
        if (snapEpochRef.current !== myEpoch) return;
        if (!preview.ok) {
          if (preview.status === 429) {
            const msg =
              preview.data?.message ||
              'You have used your 5 free investigations for today. Come back tomorrow.';
            setError(`RATE_LIMITED:${msg}`);
          } else if (preview.status === 422 && preview.data?.error === 'confidence_too_low') {
            setError(
              'RETAP:' +
                (preview.data?.message ||
                  'Could not identify a brand. Try holding to select a specific object.')
            );
          } else {
            setError(preview.data?.error || `Request failed (${preview.status})`);
          }
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
          if (snapEpochRef.current !== myEpoch) return;
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

        if (snapEpochRef.current !== myEpoch) return;
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
          low_confidence_warning: conf >= CONFIRM_THRESHOLD && conf < 0.72,
        });
        runResearchPhase(idRaw);
      } catch (e) {
        if (snapEpochRef.current === myEpoch) {
          setError(e instanceof Error ? e.message : 'Network error');
        }
      } finally {
        if (snapEpochRef.current === myEpoch) {
          setLoading(false);
          setActiveSelectionBox(null);
        }
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

    const confPc = typeof id?.confidence === 'number' ? id.confidence : 0;
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
      low_confidence_warning:
        (confPc >= CONFIRM_THRESHOLD && confPc < 0.72) ||
        (confPc < CONFIRM_THRESHOLD && confPc >= 0.45),
    });
    runResearchPhase(id);
  }, [pendingConfirmation, runResearchPhase]);

  const cancelPendingConfirmation = useCallback(() => {
    snapEpochRef.current += 1;
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

  const startRegionSelect = useCallback((x, y) => {
    setRegionSelectActive(true);
    setTapPosition({ x, y });
  }, []);

  const completeRegionSelect = useCallback(
    async (cx, cy, normRect = null) => {
      const regionEpoch = snapEpochRef.current;
      setRegionSelectActive(false);
      setTapPosition({ x: cx, y: cy });
      setTapSession((s) => s + 1);

      if (normRect && image) {
        try {
          const { enhancedBase64 } = await enhanceRegionCrop(image, normRect);
          if (snapEpochRef.current !== regionEpoch) return;
          const nx = Number(normRect.x);
          const ny = Number(normRect.y);
          const nw = Number(normRect.width);
          const nh = Number(normRect.height);
          const localCx = nw > 0 ? Math.min(1, Math.max(0, (cx - nx) / nw)) : 0.5;
          const localCy = nh > 0 ? Math.min(1, Math.max(0, (cy - ny) / nh)) : 0.5;
          await analyzeTap(localCx, localCy, { x: 0, y: 0, width: 1, height: 1 }, {
            imageOverride: enhancedBase64,
          });
        } catch {
          if (snapEpochRef.current !== regionEpoch) return;
          await analyzeTap(cx, cy, normRect);
        }
      } else {
        if (snapEpochRef.current !== regionEpoch) return;
        await analyzeTap(cx, cy, normRect);
      }
    },
    [analyzeTap, image]
  );

  const cancelRegionSelect = useCallback(() => {
    snapEpochRef.current += 1;
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
    snapEpochRef.current += 1;
    const phaseEpoch = snapEpochRef.current;
    setLoading(false);
    setError(null);
    _setImage(null);
    setTapPosition(null);
    setPendingConfirmation(null);
    setRegionSelectActive(false);
    selectionBoxRef.current = null;
    setActiveSelectionBox(null);
    setTapSession((s) => {
      const next = s + 1;
      tapSessionRef.current = next;
      return next;
    });

    const identification = {
      object: q,
      brand: q,
      corporate_parent: null,
      category: 'search',
      confidence: 1,
      identification_method: 'text_search',
      search_keywords: q,
    };
    const session_id = getEaSessionId();
    const sourcingBody = {
      identification,
      session_id,
    };
    if (geo && typeof geo === 'object' && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
      sourcingBody.user_lat = geo.lat;
      sourcingBody.user_lng = geo.lng;
    }

    setResult({
      identification,
      identification_tier: 'confirmed',
      investigation: null,
      results: [],
      registry_results: [],
      local_results: [],
      scene_inventory: null,
      response_ms: null,
      version: 'v1',
      research_loading: true,
      sourcing_complete: false,
      searched_sources: [],
      empty_sources: [],
      low_confidence_warning: false,
    });

    void (async () => {
      try {
        const sRes = await fetch(tapSourcingUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
          body: JSON.stringify(sourcingBody),
        });
        const sData = await sRes.json().catch(() => ({}));
        if (snapEpochRef.current !== phaseEpoch) return;
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
        console.error('[sourcing-deep]', e);
      }
    })();

    void (async () => {
      try {
        const res = await fetch(investigateUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
          body: JSON.stringify({ brand: q, session_id }),
        });
        const data = await res.json().catch(() => ({}));
        if (snapEpochRef.current !== phaseEpoch) return;
        const ts = tapSessionRef.current;
        if (!res.ok) {
          setError(data.error || `Request failed (${res.status})`);
          setResult((prev) => (prev ? { ...prev, research_loading: false } : prev));
          return;
        }
        let orphanMerge = false;
        setResult((prev) => {
          if (!prev) {
            orphanMerge = true;
            return prev;
          }
          return {
            ...prev,
            ...data,
            is_stub_investigation:
              data.investigation?.is_stub_investigation ?? data.is_stub_investigation ?? false,
            research_loading: false,
            sourcing_complete: true,
          };
        });
        queueMicrotask(() => {
          if (snapEpochRef.current !== phaseEpoch) return;
          dispatchInvestigationReady(identification, data, orphanMerge, tapSessionRef.current);
        });
      } catch (e) {
        if (snapEpochRef.current !== phaseEpoch) return;
        setError(e instanceof Error ? e.message : 'Network error');
        setResult((prev) => (prev ? { ...prev, research_loading: false } : prev));
      }
    })();
  }, [geo]);

  const reset = useCallback(() => {
    snapEpochRef.current += 1;
    geoInFlightRef.current = false;
    _setImage(null);
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
    snapEpochRef.current += 1;
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
    setError,
    setImage,
    setResult,
    analyzeTap,
    confirmPendingIdentification,
    cancelPendingConfirmation,
    pendingConfirmation,
    regionSelectActive,
    startBackgroundReselect,
    startRegionSelect,
    completeRegionSelect,
    cancelRegionSelect,
    reset,
    clearResult,
    captureGeoOnce,
    tapSession,
    selectAlternativeBrand,
    investigateByBrand,
    runResearchPhase,
  };
}
