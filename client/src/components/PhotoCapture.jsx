import { useCallback, useEffect, useRef, useState } from 'react';
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

/**
 * @param {object} props
 * @param {(base64: string) => void} props.onImageSelected — JPEG base64 only (no data URL prefix)
 * @param {boolean} [props.loading] — parent-driven: analyzing / waiting on API
 */
export default function PhotoCapture({ onImageSelected, loading = false }) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [mode, setMode] = useState('idle');
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const canLivePreview =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);

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

  const pickFile = () => fileInputRef.current?.click();

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

  const startCamera = async () => {
    setError(null);
    if (!canLivePreview) {
      pickFile();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setMode('camera');
    } catch {
      setError('Camera unavailable — try upload instead');
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
        {error ? <p className="photo-capture__error">{error}</p> : null}
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
        className="photo-capture__idle"
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
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="photo-capture__hidden-input"
          aria-label="Upload or capture photo"
          onChange={onFileInputChange}
        />
        <button
          type="button"
          className={`photo-capture__dropzone ${dragActive ? 'photo-capture__dropzone--active' : ''}`}
          onClick={pickFile}
        >
          <span className="photo-capture__hint">Drop an image here or tap to choose</span>
          <span>
            <kbd>Mobile</kbd> opens camera when supported
          </span>
        </button>
        <p className="photo-capture__hint">Tap any object in the photo</p>
        <div className="photo-capture__actions">
          {canLivePreview ? (
            <button type="button" className="photo-capture__btn photo-capture__btn--primary" onClick={startCamera}>
              Use live camera
            </button>
          ) : null}
        </div>
        {error ? <p className="photo-capture__error">{error}</p> : null}
        {showIdlePreparing ? <div className="photo-capture__idle-skeleton" aria-busy="true" /> : null}
      </div>
    </div>
  );
}
