import { useCallback, useEffect, useRef, useState } from 'react';
import './TapOverlay.css';

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Full-bleed overlay for tap / click coordinates over a photo (normalized 0–1 to this element).
 * Mount inside a wrapper sized to the displayed image (see PhotoCapture `photo-capture__image-shell`)
 * so taps align with pixels sent to the vision API.
 *
 * @param {object} props
 * @param {(pos: { x: number, y: number }) => void} props.onTap — x,y in 0..1 relative to overlay
 * @param {boolean} [props.loading] — show "Analyzing…" full overlay
 * @param {{ x: number, y: number } | null} [props.tappedPosition] — optional controlled position from parent
 */
export default function TapOverlay({ onTap, loading = false, tappedPosition = null }) {
  const rootRef = useRef(null);
  const [hintVisible, setHintVisible] = useState(true);
  const [crosshairKey, setCrosshairKey] = useState(0);
  const [localTap, setLocalTap] = useState(null);

  useEffect(() => {
    if (tappedPosition != null) {
      setLocalTap(null);
    }
  }, [tappedPosition?.x, tappedPosition?.y]);

  const pos = tappedPosition ?? localTap;

  const recordTap = useCallback(
    (clientX, clientY) => {
      const el = rootRef.current;
      if (!el || loading) return;

      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;

      const x = clamp01((clientX - rect.left) / w);
      const y = clamp01((clientY - rect.top) / h);

      setHintVisible(false);
      setLocalTap({ x, y });
      setCrosshairKey((k) => k + 1);
      onTap({ x, y });
    },
    [loading, onTap]
  );

  const onPointerDown = useCallback(
    (e) => {
      if (loading) return;
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      recordTap(e.clientX, e.clientY);
    },
    [loading, recordTap]
  );

  const onPointerUp = useCallback((e) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <div
      ref={rootRef}
      className={`tap-overlay${loading ? ' tap-overlay--loading' : ''}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      role="presentation"
    >
      {hintVisible && !loading ? (
        <p className="tap-overlay__hint">Tap anything</p>
      ) : null}

      {pos && !loading ? (
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

      {loading ? <div className="tap-overlay__analyzing">Analyzing…</div> : null}
    </div>
  );
}
