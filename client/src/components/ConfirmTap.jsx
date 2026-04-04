import './ConfirmTap.css';

/**
 * Build a displayable data URL from server identification (raw base64 or already-prefixed).
 * @param {Record<string, unknown> | null | undefined} identification
 */
export function identificationCropSrc(identification) {
  const raw =
    (identification && typeof identification.crop_base64 === 'string' && identification.crop_base64) ||
    (identification && typeof identification.cropBase64 === 'string' && identification.cropBase64) ||
    '';
  const trimmed = raw.replace(/\s/g, '');
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return trimmed;
  return `data:image/jpeg;base64,${trimmed}`;
}

/**
 * Low-confidence tap: show crop zoom + confirm before expensive pipeline.
 */
export default function ConfirmTap({
  identification,
  identificationTier,
  loading = false,
  onConfirm,
  onRetap,
  onBackgroundMode,
  sceneInventory = null,
  onSelectAlternativeBrand,
}) {
  const cropSrc = identificationCropSrc(identification);

  const label =
    identification?.object || identification?.brand || 'this region';
  const brandLine = identification?.brand ? ` · ${identification.brand}` : '';

  return (
    <div className="confirm-tap">
      <p className="confirm-tap__prompt">Is this what you tapped?</p>
      <div className="confirm-tap__zoom">
        {cropSrc ? (
          <img className="confirm-tap__crop-img" src={cropSrc} alt="Crop around your tap" />
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
      {sceneInventory && sceneInventory.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#6a6050',
              marginBottom: 8,
            }}
          >
            Also detected in this image:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sceneInventory.slice(0, 6).map((item, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => onSelectAlternativeBrand && onSelectAlternativeBrand(item)}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 1,
                  color: '#c9bfa8',
                  background: 'transparent',
                  border: '1px solid #3a3228',
                  padding: '4px 10px',
                  borderRadius: 999,
                  cursor: 'pointer',
                }}
              >
                {item.brand} · {Math.round(Number(item.confidence ?? 0) * 100)}%
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
