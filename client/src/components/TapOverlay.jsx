import { useRef } from 'react';

/**
 * Minimal tap target over the capture — image + normalized tap coords only.
 * @param {{ imageUrl: string; onTap: (x: number, y: number) => void }} props
 */
export default function TapOverlay({ imageUrl, onTap }) {
  const ref = useRef(null);
  /** Skip synthetic click right after touchstart (mobile double invoke). */
  const suppressClickUntil = useRef(0);

  function coordsFromEvent(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { clientX, clientY };
  }

  function applyTap(e) {
    const el = ref.current;
    if (!el || typeof onTap !== 'function') return;
    const rect = el.getBoundingClientRect();
    const { clientX, clientY } = coordsFromEvent(e);
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;
    const x = (clientX - rect.left) / w;
    const y = (clientY - rect.top) / h;
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
      }}
      onClick={onClick}
      onTouchStart={onTouchStart}
    >
      <img className="app__photo" src={imageUrl} style={{ width: '100%', display: 'block' }} alt="" />
    </div>
  );
}
