import { useCallback, useEffect, useRef, useState } from 'react';
import EyeIcon from './EyeIcon.jsx';
import './PhotoCapture.css';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.82;

/** @param {HTMLImageElement | HTMLVideoElement} source */
function drawToJpegBase64(source, maxDim = MAX_DIMENSION, quality = JPEG_QUALITY) {
  const sw = source.naturalWidth || source.videoWidth;
  const sh = source.naturalHeight || source.videoHeight;
  if (!sw || !sh) {
    throw new Error('Image has no dimensions');
  }
  const scale = Math.min(maxDim / sw, maxDim / sh, 1);
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');
  ctx.drawImage(source, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  return { base64, dataUrl };
}

/**
 * Resize file uploads before base64 encode — full-res decode is too heavy on mobile.
 * @param {File} file
 * @param {number} [maxDimension]
 * @returns {Promise<string>} JPEG base64 (no data-URL prefix)
 */
function resizeImageForUpload(file, maxDimension = 1200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unsupported'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1]);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Could not process image'));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    img.src = url;
  });
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * iOS sometimes exposes non-zero video dimensions but paints black — sample one frame.
 * @param {HTMLVideoElement} video
 */
function isVideoFrameLikelyBlack(video) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return true;
  const sw = Math.min(64, w);
  const sh = Math.min(64, h);
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  try {
    ctx.drawImage(video, 0, 0, sw, sh);
    const data = ctx.getImageData(0, 0, sw, sh).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += data[i] + data[i + 1] + data[i + 2];
    }
    const denom = (data.length / 4) * 3;
    const avg = sum / denom;
    return avg < 10;
  } catch {
    return false;
  }
}

/** Live stream on iOS sometimes resolves but never paints frames — detect near-zero dimensions. */
async function waitForVideoFrame(video, maxMs = 2000) {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  while (true) {
    const elapsed =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
    if (elapsed > maxMs) {
      return video.videoWidth > 2 && video.videoHeight > 2;
    }
    if (video.videoWidth > 2 && video.videoHeight > 2) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 80));
  }
}

/**
 * @param {object} props
 * @param {(base64: string) => void} props.onImageSelected — JPEG base64 only (no data URL prefix)
 * @param {boolean} [props.loading] — parent-driven: analyzing / waiting on API
 */
export default function PhotoCapture({ onImageSelected, loading = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [mode, setMode] = useState('idle');
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const canLivePreview =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  const stopCamera = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.srcObject = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const finalizeImage = useCallback(
    async (source) => {
      setError(null);
      setPreparing(true);
      try {
        const { base64, dataUrl } = drawToJpegBase64(source);
        setPreviewDataUrl(dataUrl);
        onImageSelected(base64);
        setMode('preview');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not process image');
        setMode('idle');
        setPreviewDataUrl(null);
      } finally {
        setPreparing(false);
      }
    },
    [onImageSelected]
  );

  const processFile = useCallback(
    async (file) => {
      if (!file || !file.type.startsWith('image/')) {
        setError('Please choose an image file');
        return;
      }
      setError(null);
      setPreparing(true);
      try {
        const base64 = await resizeImageForUpload(file, MAX_DIMENSION);
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        setPreviewDataUrl(dataUrl);
        onImageSelected(base64);
        setMode('preview');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load image');
        setMode('idle');
        setPreviewDataUrl(null);
      } finally {
        setPreparing(false);
      }
    },
    [onImageSelected]
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void processFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  /** Silent fallback to file input on any failure, black stream, or iOS zero-dimension preview. */
  const startCamera = async () => {
    if (!canLivePreview) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopCamera();
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      const ok = await waitForVideoFrame(video, 2000);
      if (!ok) {
        stopCamera();
        setMode('idle');
        return;
      }
      if (isIOS() && isVideoFrameLikelyBlack(video)) {
        stopCamera();
        setMode('idle');
        return;
      }
      setMode('camera');
    } catch {
      stopCamera();
      setMode('idle');
    }
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    await finalizeImage(video);
    stopCamera();
  };

  const cancelCamera = () => {
    stopCamera();
    setMode('idle');
  };

  const changePhoto = () => {
    setPreviewDataUrl(null);
    setMode('idle');
    setError(null);
  };

  const showAnalyzingOverlay = loading && mode === 'preview' && previewDataUrl;
  const showIdlePreparing = preparing && mode === 'idle';

  if (mode === 'camera') {
    return (
      <div className="photo-capture">
        <div className="photo-capture__camera">
          <div className="photo-capture__eye-bar" aria-hidden>
            <EyeIcon open size={88} />
            <p className="photo-capture__hint" style={{ margin: '4px 0 0', fontSize: '0.72rem' }}>
              Camera active
            </p>
          </div>
          <video ref={videoRef} className="photo-capture__video" playsInline muted autoPlay />
          <div className="photo-capture__camera-bar">
            <button type="button" className="photo-capture__btn" onClick={cancelCamera}>
              Cancel
            </button>
            <button type="button" className="photo-capture__btn photo-capture__btn--primary" onClick={captureFrame}>
              Capture
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'preview' && previewDataUrl) {
    return (
      <div className="photo-capture">
        <div className="photo-capture__stage">
          <div className="photo-capture__toolbar">
            <button type="button" className="photo-capture__btn" onClick={changePhoto}>
              New photo
            </button>
          </div>
          <div className="photo-capture__eye-preview" aria-hidden>
            <EyeIcon open size={96} />
          </div>
          <div className="photo-capture__image-shell">
            <img className="photo-capture__img" src={previewDataUrl} alt="Selected for analysis" />
          </div>
          <p className="photo-capture__instruction">
            Then use Tap or Circle it on the next screen — point at what you mean
          </p>
          {showAnalyzingOverlay ? (
            <div className="photo-capture__skeleton" aria-busy="true">
              <span className="photo-capture__skeleton-label">Analyzing</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="photo-capture">
      <div
        className={`photo-capture__idle ${dragActive ? 'photo-capture__idle--drag' : ''}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragActive(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <label
          htmlFor="photo-upload"
          style={{
            display: 'flex',
            width: '100%',
            minHeight: 200,
            background: dragActive ? 'rgba(240, 168, 32, 0.14)' : '#162030',
            border: dragActive ? '2px dashed #f0a820' : '2px dashed #344d62',
            borderRadius: 4,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 32,
            boxSizing: 'border-box',
          }}
        >
          <EyeIcon open={false} size={80} />
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#f0a820',
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            Tap to choose a photo
          </div>
          <div
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontSize: 14,
              color: '#6a8a9a',
              marginTop: 6,
              textAlign: 'center',
            }}
          >
            Opens camera or photo library
          </div>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            aria-label="Choose photo from camera or library"
            onChange={handleFileChange}
          />
        </label>

        {canLivePreview ? (
          <div className="photo-capture__live-wrap">
            <button type="button" className="photo-capture__live-camera" onClick={startCamera}>
              Use live camera
            </button>
          </div>
        ) : null}

        {error ? <p className="photo-capture__error">{error}</p> : null}
        {showIdlePreparing ? <div className="photo-capture__idle-skeleton" aria-busy="true" /> : null}
      </div>
    </div>
  );
}
