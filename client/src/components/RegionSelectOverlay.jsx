import { useCallback, useRef, useState } from 'react';
import './RegionSelectOverlay.css';

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Drag to define a rectangle on the photo; confirms with center as new tap.
 */
export default function RegionSelectOverlay({ imageSrc, onConfirm, onCancel }) {
  const rootRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  /** normalized rect: x,y top-left, w,h */
  const [rect, setRect] = useState(null);
  const startRef = useRef(null);

  const toNorm = useCallback((clientX, clientY) => {
    const el = rootRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    if (w <= 0 || h <= 0) return { x: 0, y: 0 };
    return {
      x: clamp01((clientX - r.left) / w),
      y: clamp01((clientY - r.top) / h),
    };
  }, []);

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const p = toNorm(e.clientX, e.clientY);
      startRef.current = p;
      setDragging(true);
      setRect({ x: p.x, y: p.y, w: 0, h: 0 });
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [toNorm]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!dragging || !startRef.current) return;
      const p = toNorm(e.clientX, e.clientY);
      const s = startRef.current;
      const x = Math.min(s.x, p.x);
      const y = Math.min(s.y, p.y);
      const w = Math.abs(p.x - s.x);
      const h = Math.abs(p.y - s.y);
      setRect({ x, y, w, h });
    },
    [dragging, toNorm]
  );

  const endDrag = useCallback((e) => {
    if (e?.currentTarget?.releasePointerCapture && e?.pointerId != null) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
    startRef.current = null;
  }, []);

  const handleConfirm = useCallback(() => {
    if (!rect || rect.w < 0.02 || rect.h < 0.02) {
      onCancel?.();
      return;
    }
    const cx = clamp01(rect.x + rect.w / 2);
    const cy = clamp01(rect.y + rect.h / 2);
    onConfirm(cx, cy, { x: rect.x, y: rect.y, width: rect.w, height: rect.h });
  }, [rect, onConfirm, onCancel]);

  return (
    <div className="region-select">
      <p className="region-select__hint">Drag a box around the product or logo you mean.</p>
      <div
        ref={rootRef}
        className="region-select__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="presentation"
      >
        <img className="region-select__img" src={imageSrc} alt="" draggable={false} />
        {rect && (rect.w > 0.005 || rect.h > 0.005) ? (
          <div
            className="region-select__box"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
            }}
          />
        ) : null}
      </div>
      <div className="region-select__toolbar">
        <button type="button" className="app__btn" onClick={handleConfirm}>
          Use this area
        </button>
        <button type="button" className="app__btn app__btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
