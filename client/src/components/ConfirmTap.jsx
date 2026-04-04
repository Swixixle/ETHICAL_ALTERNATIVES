import './ConfirmTap.css';

/**
 * Low-confidence tap: show crop zoom + confirm before expensive pipeline.
 */
export default function ConfirmTap({
  cropDataUrl,
  identification,
  identificationTier,
  loading = false,
  onConfirm,
  onRetap,
  onBackgroundMode,
}) {
  const label =
    identification?.object || identification?.brand || 'this region';
  const brandLine = identification?.brand ? ` · ${identification.brand}` : '';

  return (
    <div className="confirm-tap">
      <p className="confirm-tap__prompt">Is this what you tapped?</p>
      <div className="confirm-tap__zoom">
        {cropDataUrl ? (
          <img className="confirm-tap__crop-img" src={cropDataUrl} alt="Crop around your tap" />
        ) : (
          <div className="confirm-tap__crop-fallback">No crop preview</div>
        )}
      </div>
      <p className="confirm-tap__guess">
        <strong>{label}</strong>
        {brandLine}
      </p>
      {identificationTier ? (
        <p className="confirm-tap__tier">Match strength: {identificationTier}</p>
      ) : null}
      {identification?.confidence_notes ? (
        <p className="confirm-tap__notes">{identification.confidence_notes}</p>
      ) : null}
      <div className="confirm-tap__actions">
        <button type="button" className="app__btn" onClick={onConfirm} disabled={loading}>
          {loading ? 'Working…' : "Yes, that's it"}
        </button>
        <button type="button" className="app__btn app__btn--ghost" onClick={onRetap} disabled={loading}>
          Re-tap
        </button>
        <button
          type="button"
          className="app__btn app__btn--ghost"
          onClick={onBackgroundMode}
          disabled={loading}
        >
          It&apos;s in the background
        </button>
      </div>
    </div>
  );
}
