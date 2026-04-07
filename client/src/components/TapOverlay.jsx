import { useEffect, useRef, useState } from 'react';
import { haptic } from '../utils/haptics.js';
import { playTap } from '../utils/sounds.js';

const MOVE_CANCEL_PX = 8;

/**
 * @param {{
 *   imageUrl: string;
 *   onTap: (x: number, y: number) => void;
 *   onHoldSelect?: (x: number, y: number) => void;
 *   holdDurationMs?: number;
 *   marker?: { x: number; y: number } | null;
 *   interactionDisabled?: boolean;
 * }} props
 */
export default function TapOverlay({
  imageUrl,
  onTap,
  onHoldSelect,
  holdDurationMs = 600,
  marker = null,
  interactionDisabled = false,
}) {
  const ref = useRef(null);
  const holdTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const holdIndicatorClearRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const startClientRef = useRef({ x: 0, y: 0 });
  const normDownRef = useRef({ x: 0, y: 0 });
  const movedTooFarRef = useRef(false);
  const holdCompletedRef = useRef(false);
  const pointerDownRef = useRef(false);

  const [ripple, setRipple] = useState(/** @type {{ x: number; y: number; id: number } | null} */ (null));
  const [holdIndicator, setHoldIndicator] = useState(
    /** @type {{ x: number; y: number; id: number } | null} */ (null)
  );

  useEffect(() => {
    return () => {
      if (holdTimerRef.current != null) window.clearTimeout(holdTimerRef.current);
      if (holdIndicatorClearRef.current != null) window.clearTimeout(holdIndicatorClearRef.current);
    };
  }, []);

  function clearHoldTimer() {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function normFromClient(clientX, clientY) {
    const el = ref.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / w,
      y: (clientY - rect.top) / h,
    };
  }

  function performTap(nx, ny) {
    if (interactionDisabled) return;
    if (typeof onTap !== 'function') return;
    setRipple({ x: nx, y: ny, id: Date.now() });
    window.setTimeout(() => setRipple(null), 500);
    playTap();
    haptic('tap');
    onTap(nx, ny);
  }

  function onPointerDown(e) {
    if (interactionDisabled) return;
    if (e.button !== 0) return;
    const el = ref.current;
    if (!el) return;

    pointerDownRef.current = true;
    movedTooFarRef.current = false;
    holdCompletedRef.current = false;
    startClientRef.current = { x: e.clientX, y: e.clientY };
    normDownRef.current = normFromClient(e.clientX, e.clientY);
    clearHoldTimer();

    e.preventDefault();
    el.setPointerCapture?.(e.pointerId);

    const holdEnabled = typeof onHoldSelect === 'function';
    if (holdEnabled) {
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null;
        if (!pointerDownRef.current || movedTooFarRef.current) return;
        holdCompletedRef.current = true;
        haptic('scan');
        const id = Date.now();
        const { x, y } = normDownRef.current;
        setHoldIndicator({ x, y, id });
        if (holdIndicatorClearRef.current != null) window.clearTimeout(holdIndicatorClearRef.current);
        holdIndicatorClearRef.current = window.setTimeout(() => {
          holdIndicatorClearRef.current = null;
          setHoldIndicator(null);
        }, 400);
        onHoldSelect(x, y);
      }, holdDurationMs);
    }
  }

  function onPointerMove(e) {
    if (interactionDisabled || !pointerDownRef.current) return;
    const sx = startClientRef.current.x;
    const sy = startClientRef.current.y;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
      movedTooFarRef.current = true;
      clearHoldTimer();
    }
  }

  function endPointer(e, { cancelled }) {
    if (interactionDisabled) return;
    const el = ref.current;
    clearHoldTimer();
    const wasDown = pointerDownRef.current;
    pointerDownRef.current = false;

    if (el?.releasePointerCapture && e.pointerId != null) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    if (!wasDown) return;
    if (holdCompletedRef.current) return;
    if (cancelled) return;
    if (movedTooFarRef.current) return;
    const { x, y } = normDownRef.current;
    performTap(x, y);
  }

  function onPointerUp(e) {
    endPointer(e, { cancelled: false });
  }

  function onPointerCancel(e) {
    endPointer(e, { cancelled: true });
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
      onPointerDown={interactionDisabled ? undefined : onPointerDown}
      onPointerMove={interactionDisabled ? undefined : onPointerMove}
      onPointerUp={interactionDisabled ? undefined : onPointerUp}
      onPointerCancel={interactionDisabled ? undefined : onPointerCancel}
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
            background: 'rgba(212, 160, 23, 0.35)',
            border: 'none',
            animation: 'tapRipple 280ms ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {holdIndicator ? (
        <div
          key={holdIndicator.id}
          style={{
            position: 'absolute',
            left: `${holdIndicator.x * 100}%`,
            top: `${holdIndicator.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: '2px solid #f0a820',
            background: 'transparent',
            animation: 'holdPulse 400ms ease-out forwards',
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
