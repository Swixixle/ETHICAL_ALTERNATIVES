import { useCallback, useEffect, useRef, useState } from 'react';
import './TapOverlay.css';

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/** @param {{ x: number, y: number }[]} pts normalized */
function bboxFromPath(pts) {
  if (!pts.length) return null;
  let minX = pts[0].x;
  let maxX = pts[0].x;
  let minY = pts[0].y;
  let maxY = pts[0].y;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  let w = maxX - minX;
  let h = maxY - minY;
  const minDim = 0.02;
  if (w < minDim) {
    const pad = (minDim - w) / 2;
    minX = clamp01(minX - pad);
    w = Math.min(minDim, 1 - minX);
  }
  if (h < minDim) {
    const pad = (minDim - h) / 2;
    minY = clamp01(minY - pad);
    h = Math.min(minDim, 1 - minY);
  }
  if (minX + w > 1) minX = 1 - w;
  if (minY + h > 1) minY = 1 - h;
  return { x: minX, y: minY, width: w, height: h };
}

/**
 * @param {object} props
 * @param {'tap' | 'circle'} props.interactionMode
 * @param {(pos: { x: number, y: number }) => void} props.onTap
 * @param {(payload: { tap_x: number, tap_y: number, selection_box: { x: number, y: number, width: number, height: number } }) => void} props.onLassoComplete
 * @param {boolean} [props.loading]
 * @param {{ x: number, y: number } | null} [props.tappedPosition]
 * @param {{ x: number, y: number, width: number, height: number } | null} [props.loadingHighlightBox] — pulsing rect while analyzing
 */
export default function TapOverlay({
  interactionMode = 'tap',
  onTap,
  onLassoComplete,
  loading = false,
  tappedPosition = null,
  loadingHighlightBox = null,
}) {
  const rootRef = useRef(null);
  const [hintVisible, setHintVisible] = useState(true);
  const [crosshairKey, setCrosshairKey] = useState(0);
  const [localTap, setLocalTap] = useState(null);
  const [drawPoints, setDrawPoints] = useState([]);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (tappedPosition != null) {
      setLocalTap(null);
    }
  }, [tappedPosition?.x, tappedPosition?.y]);

  useEffect(() => {
    if (!loading) {
      setDrawPoints([]);
      drawingRef.current = false;
    }
  }, [loading, interactionMode]);

  const pos = tappedPosition ?? localTap;

  const toNorm = useCallback((clientX, clientY) => {
    const el = rootRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return { x: 0, y: 0 };
    return {
      x: clamp01((clientX - rect.left) / w),
      y: clamp01((clientY - rect.top) / h),
    };
  }, []);

  const recordTap = useCallback(
    (clientX, clientY) => {
      const el = rootRef.current;
      if (!el || loading) return;

      const p = toNorm(clientX, clientY);
      setHintVisible(false);
      setLocalTap(p);
      setCrosshairKey((k) => k + 1);
      onTap?.({ x: p.x, y: p.y });
    },
    [loading, onTap, toNorm]
  );

  const onPointerDownTap = useCallback(
    (e) => {
      if (interactionMode !== 'tap') return;
      if (loading) return;
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      recordTap(e.clientX, e.clientY);
    },
    [interactionMode, loading, recordTap]
  );

  const onPointerDownCircle = useCallback(
    (e) => {
      if (interactionMode !== 'circle') return;
      if (loading) return;
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      drawingRef.current = true;
      const p = toNorm(e.clientX, e.clientY);
      setDrawPoints([p]);
      setHintVisible(false);
    },
    [interactionMode, loading, toNorm]
  );

  const onPointerMoveCircle = useCallback(
    (e) => {
      if (interactionMode !== 'circle' || !drawingRef.current || loading) return;
      const p = toNorm(e.clientX, e.clientY);
      setDrawPoints((prev) => [...prev, p]);
    },
    [interactionMode, loading, toNorm]
  );

  const finishCircle = useCallback(
    (e) => {
      if (interactionMode !== 'circle') return;
      if (!drawingRef.current) return;
      drawingRef.current = false;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      setDrawPoints((pts) => {
        if (pts.length < 4 || !onLassoComplete) {
          return [];
        }
        const box = bboxFromPath(pts);
        if (!box) return [];
        const tap_x = clamp01(box.x + box.width / 2);
        const tap_y = clamp01(box.y + box.height / 2);
        onLassoComplete({
          tap_x,
          tap_y,
          selection_box: box,
        });
        return [];
      });
    },
    [interactionMode, onLassoComplete]
  );

  const onPointerDown = useCallback(
    (e) => {
      onPointerDownTap(e);
      onPointerDownCircle(e);
    },
    [onPointerDownTap, onPointerDownCircle]
  );

  const onPointerMove = useCallback(
    (e) => {
      onPointerMoveCircle(e);
    },
    [onPointerMoveCircle]
  );

  const onPointerUp = useCallback(
    (e) => {
      if (interactionMode === 'tap') {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        return;
      }
      finishCircle(e);
    },
    [interactionMode, finishCircle]
  );

  const onPointerCancel = useCallback(
    (e) => {
      if (interactionMode === 'circle' && drawingRef.current) {
        drawingRef.current = false;
        setDrawPoints([]);
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        return;
      }
      if (interactionMode === 'tap') {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }
    },
    [interactionMode]
  );

  const pathD =
    drawPoints.length > 1
      ? drawPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : '';

  const showLoadingBox = loading && loadingHighlightBox &&
    [loadingHighlightBox.x, loadingHighlightBox.y, loadingHighlightBox.width, loadingHighlightBox.height].every(
      (n) => Number.isFinite(Number(n))
    );

  return (
    <div
      ref={rootRef}
      className={`tap-overlay tap-overlay--${interactionMode}${loading ? ' tap-overlay--loading' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      role="presentation"
    >
      {interactionMode === 'circle' && pathD ? (
        <svg
          className="tap-overlay__lasso-svg"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={pathD} className="tap-overlay__lasso-path" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : null}

      {hintVisible && !loading ? (
        <p className="tap-overlay__hint">
          {interactionMode === 'circle' ? 'Circle what you mean — lift to analyze' : 'Tap anything'}
        </p>
      ) : null}

      {pos && !loading && interactionMode === 'tap' ? (
        <div
          key={crosshairKey}
          className="tap-overlay__crosshair"
          style={{
            left: `${pos.x * 100}%`,
            top: `${pos.y * 100}%`,
          }}
        >
          <span className="tap-overlay__crosshair-line tap-overlay__crosshair-line--h" />
          <span className="tap-overlay__crosshair-line tap-overlay__crosshair-line--v" />
          <span className="tap-overlay__crosshair-ring" />
        </div>
      ) : null}

      {showLoadingBox ? (
        <div
          className="tap-overlay__selection-pulse"
          style={{
            left: `${loadingHighlightBox.x * 100}%`,
            top: `${loadingHighlightBox.y * 100}%`,
            width: `${loadingHighlightBox.width * 100}%`,
            height: `${loadingHighlightBox.height * 100}%`,
          }}
        >
          <span className="tap-overlay__selection-pulse-border" />
          <span className="tap-overlay__scan-line" />
        </div>
      ) : null}

      {loading ? (
        <div className="tap-overlay__analyzing-wrap">
          <div className="tap-overlay__analyzing">Analyzing…</div>
        </div>
      ) : null}
    </div>
  );
}
