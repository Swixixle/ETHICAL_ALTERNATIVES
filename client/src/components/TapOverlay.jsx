import { useRef, useState } from 'react';
import { haptic } from '../utils/haptics.js';
import { playTap } from '../utils/sounds.js';

/**
 * @param {{
 *   imageUrl: string;
 *   onTap: (x: number, y: number) => void;
 *   marker?: { x: number; y: number } | null;
 *   interactionDisabled?: boolean;
 * }} props
 */
export default function TapOverlay({
  imageUrl,
  onTap,
  marker = null,
  interactionDisabled = false,
}) {
  const ref = useRef(null);
  /** Skip synthetic click right after touchstart (mobile double invoke). */
  const suppressClickUntil = useRef(0);
  const [ripple, setRipple] = useState(null);

  function coordsFromEvent(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { clientX, clientY };
  }

  function applyTap(e) {
    if (interactionDisabled) return;
    const el = ref.current;
    if (!el || typeof onTap !== 'function') return;
    const rect = el.getBoundingClientRect();
    const { clientX, clientY } = coordsFromEvent(e);
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;
    const x = (clientX - rect.left) / w;
    const y = (clientY - rect.top) / h;

    setRipple({ x, y, id: Date.now() });
    window.setTimeout(() => setRipple(null), 500);
    playTap();
    haptic('tap');
    onTap(x, y);
  }

  function onTouchStart(e) {
    e.preventDefault();
    suppressClickUntil.current =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 450;
    applyTap(e);
  }

  function onClick(e) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now < suppressClickUntil.current) return;
    e.preventDefault();
    applyTap(e);
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        touchAction: 'none',
        overflow: 'hidden',
      }}
      onClick={interactionDisabled ? undefined : onClick}
      onTouchStart={interactionDisabled ? undefined : onTouchStart}
    >
      <img className="app__photo" src={imageUrl} style={{ width: '100%', display: 'block' }} alt="" />
      {ripple ? (
        <div
          key={ripple.id}
          style={{
            position: 'absolute',
            left: `${ripple.x * 100}%`,
            top: `${ripple.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '2px solid #f0a820',
            animation: 'tapRipple 0.28s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {marker &&
      typeof marker.x === 'number' &&
      typeof marker.y === 'number' &&
      Number.isFinite(marker.x) &&
      Number.isFinite(marker.y) ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: `${marker.x * 100}%`,
            top: `${marker.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#f0a820',
            border: '2px solid #0f1520',
            boxShadow: '0 0 0 2px rgba(240,168,32,0.45)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </div>
  );
}
