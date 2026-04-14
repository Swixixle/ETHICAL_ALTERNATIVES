import { useCallback, useEffect, useRef, useState } from 'react';
// import { playShutter } from '../utils/sounds.js';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.82;

/**
 * @param {File} file
 * @returns {Promise<{ base64: string; dataUrl: string }>}
 */
function fileToResizedJpegBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const sw = img.width;
        const sh = img.height;
        if (!sw || !sh) {
          reject(new Error('Invalid image'));
          return;
        }
        const scale = Math.min(1, MAX_DIMENSION / Math.max(sw, sh));
        const w = Math.round(sw * scale);
        const h = Math.round(sh * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unsupported'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
        resolve({ base64, dataUrl });
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Could not process image'));
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

/**
 * @param {object} props
 * @param {(base64: string) => void} props.onImageSelected — JPEG base64 only (no data URL prefix)
 * @param {(value: string, format: string) => void} [props.onBarcodeDetected]
 * @param {() => void} [props.onUserGeolocationOpportunity] — call synchronously on user gestures (before awaits) so desktop browsers can show the location permission prompt
 * @param {boolean} [props.loading]
 */
export default function PhotoCapture({
  onImageSelected,
  onBarcodeDetected,
  onUserGeolocationOpportunity,
  loading = false,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const barcodeDetectorRef = useRef(null);
  const onBarcodeDetectedRef = useRef(onBarcodeDetected);

  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [barcodeDetected, setBarcodeDetected] = useState(/** @type {{ value: string; format: string } | null} */ (null));
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [barcodePillOpacity, setBarcodePillOpacity] = useState(0);
  const [showCameraCta, setShowCameraCta] = useState(
    () => typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  );

  useEffect(() => {
    onBarcodeDetectedRef.current = onBarcodeDetected;
  }, [onBarcodeDetected]);

  const stopCamera = useCallback(() => {
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!cameraMode) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
  }, [cameraMode]);

  useEffect(() => {
    if (!barcodeDetected) {
      setBarcodePillOpacity(0);
      return;
    }
    setBarcodePillOpacity(0);
    const t = window.setTimeout(() => setBarcodePillOpacity(1), 10);
    return () => clearTimeout(t);
  }, [barcodeDetected]);

  useEffect(() => {
    if (!cameraMode) {
      setBarcodeDetected(null);
      setScanningBarcode(false);
      barcodeDetectorRef.current = null;
      return;
    }

    barcodeDetectorRef.current = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });
      } catch {
        barcodeDetectorRef.current = null;
      }
    }

    if (!barcodeDetectorRef.current) {
      setScanningBarcode(false);
      return;
    }

    setScanningBarcode(true);

    let intervalId = /** @type {ReturnType<typeof setInterval> | null} */ (null);

    const scan = async () => {
      if (!videoRef.current || !barcodeDetectorRef.current) return;
      if (videoRef.current.readyState < 2) return;
      try {
        const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          if (intervalId != null) {
            clearInterval(intervalId);
            intervalId = null;
          }
          const bc = barcodes[0];
          setBarcodeDetected({ value: bc.rawValue, format: bc.format });
          setScanningBarcode(false);
          const cb = onBarcodeDetectedRef.current;
          if (typeof cb === 'function') {
            cb(bc.rawValue, bc.format);
          }
        }
      } catch {
        /* BarcodeDetector may throw on some frames — ignore */
      }
    };

    intervalId = setInterval(() => {
      void scan();
    }, 500);

    return () => {
      if (intervalId != null) clearInterval(intervalId);
      setScanningBarcode(false);
      setBarcodeDetected(null);
    };
  }, [cameraMode]);

  const emitFile = useCallback(
    async (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      setBusy(true);
      try {
        const { base64, dataUrl } = await fileToResizedJpegBase64(file);
        setPreviewDataUrl(dataUrl);
        // playShutter();
        onImageSelected(base64);
      } finally {
        setBusy(false);
      }
    },
    [onImageSelected]
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (e.target && 'value' in e.target && typeof e.target.value === 'string') {
      e.target.value = '';
    }
    if (file) {
      onUserGeolocationOpportunity?.();
      void emitFile(file);
    }
  };

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUserGeolocationOpportunity?.();
      void emitFile(file);
    }
  }

  const finishFromVideo = useCallback(() => {
    onUserGeolocationOpportunity?.();
    const video = videoRef.current;
    if (!video) return;
    const sw = video.videoWidth;
    const sh = video.videoHeight;
    if (!sw || !sh) return;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(sw, sh));
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    setPreviewDataUrl(dataUrl);
    // playShutter();
    onImageSelected(base64);
    stopCamera();
    setCameraMode(false);
  }, [onImageSelected, onUserGeolocationOpportunity, stopCamera]);

  const openLiveCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setShowCameraCta(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraMode(true);
    } catch {
      setShowCameraCta(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const cancelCamera = () => {
    stopCamera();
    setCameraMode(false);
  };

  const clearPreview = () => {
    setPreviewDataUrl(null);
  };

  const shellStyle = {
    background: '#0f1520',
    color: '#f0e8d0',
    minHeight: 'min(70vh, 520px)',
    border: '1px solid #2a3f52',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    boxSizing: 'border-box',
  };

  const btnBase = {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    padding: '10px 16px',
    borderRadius: 2,
    cursor: 'pointer',
  };

  if (cameraMode) {
    return (
      <div style={shellStyle}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'min(70vh, 520px)',
            background: '#000',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minHeight: 260 }}>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 260, display: 'block' }}
            />
            {barcodeDetected ? (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(240, 168, 32, 0.9)',
                  padding: '8px 14px',
                  borderRadius: 999,
                  opacity: barcodePillOpacity,
                  transition: 'opacity 0.3s ease',
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 2,
                    color: '#0f1520',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  BARCODE DETECTED — LOOKING UP...
                </span>
              </div>
            ) : null}
            {scanningBarcode ? (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#6a8a9a',
                    flexShrink: 0,
                  }}
                  aria-hidden
                />
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 8,
                    color: '#6a8a9a',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  SCANNING
                </span>
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              padding: 16,
              background: '#0f1520',
              borderTop: '1px solid #2a3f52',
            }}
          >
            <button
              type="button"
              onClick={cancelCamera}
              style={{
                ...btnBase,
                border: '1px solid #f0a820',
                background: 'transparent',
                color: '#f0e8d0',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={finishFromVideo}
              style={{
                ...btnBase,
                border: 'none',
                background: '#f0a820',
                color: '#0f1520',
                fontWeight: 700,
              }}
            >
              Use photo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (previewDataUrl) {
    return (
      <div style={shellStyle}>
        <div
          style={{
            position: 'relative',
            minHeight: 'min(70vh, 520px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0e14',
          }}
        >
          <button
            type="button"
            onClick={clearPreview}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 2,
              ...btnBase,
              border: '1px solid #2a3f52',
              background: 'rgba(15, 21, 32, 0.88)',
              color: '#f0e8d0',
            }}
          >
            New photo
          </button>
          <img
            src={previewDataUrl}
            alt="Selected for analysis"
            style={{
              maxWidth: '100%',
              maxHeight: 'min(70vh, 640px)',
              objectFit: 'contain',
            }}
          />
          {loading ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 21, 32, 0.72)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#f0e8d0',
              }}
            >
              Analyzing…
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...shellStyle,
        display: 'flex',
        flexDirection: 'column',
        padding: '1.25rem',
        gap: 0,
      }}
    >
      <label
        htmlFor="ea-photo-file"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          width: '100%',
          flex: 1,
          minHeight: 200,
          background: dragActive ? 'rgba(240,168,32,0.08)' : '#162030',
          border: dragActive ? '2px dashed #f0a820' : '2px dashed #344d62',
          borderRadius: 4,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: busy ? 'wait' : 'pointer',
          padding: 32,
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#f0a820',
            textAlign: 'center',
          }}
        >
          {dragActive ? 'Drop to analyze' : 'Tap to choose a photo'}
        </span>
        <span
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 14,
            color: '#6a8a9a',
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          Opens your photo library
        </span>
        <input
          id="ea-photo-file"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          aria-label="Choose a photo"
          onChange={handleFileChange}
          disabled={busy}
        />
      </label>

      {showCameraCta ? (
        <button
          type="button"
          onClick={() => {
            onUserGeolocationOpportunity?.();
            void openLiveCamera();
          }}
          disabled={busy}
          style={{
            marginTop: 14,
            alignSelf: 'center',
            background: 'none',
            border: 'none',
            color: '#a8c4d8',
            fontFamily: "'Crimson Pro', serif",
            fontSize: 15,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            cursor: busy ? 'default' : 'pointer',
            padding: 8,
          }}
        >
          Use live camera
        </button>
      ) : null}

      {busy ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(22, 32, 48, 0.4)',
            pointerEvents: 'none',
          }}
          aria-busy="true"
        />
      ) : null}
    </div>
  );
}
