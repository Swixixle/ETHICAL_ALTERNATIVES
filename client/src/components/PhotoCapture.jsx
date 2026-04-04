import { useCallback, useEffect, useId, useRef, useState } from 'react';
import EyeIcon from './EyeIcon.jsx';
import './PhotoCapture.css';

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.85;

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

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    img.src = url;
  });
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
  const fileInputId = useId();
  const fileInputRef = useRef(null);
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
        const img = await loadImageFromFile(file);
        await finalizeImage(img);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load image');
      } finally {
        setPreparing(false);
      }
    },
    [finalizeImage]
  );

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) processFile(file);
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
          <p className="photo-capture__instruction">Tap any object in the photo</p>
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
        <input
          id={fileInputId}
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="photo-capture__visually-hidden"
          aria-label="Take or choose photo from camera or library"
          onChange={onFileInputChange}
        />

        <label htmlFor={fileInputId} className="photo-capture__main-upload">
          <EyeIcon open={false} size={100} />
          <span className="photo-capture__main-upload-title">Take or choose photo</span>
          <span className="photo-capture__main-upload-sub">Camera or library — works on iPhone, Android, and desktop</span>
          <span className="photo-capture__main-upload-hint">
            Tap to photograph or drop an image — then tap any object after you capture
          </span>
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
