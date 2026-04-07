/**
 * Client-side crop + contrast + sharpen for region-select taps before vision API.
 * @param {string} base64Jpeg — raw base64 (no data URL prefix)
 * @param {{ x: number; y: number; width: number; height: number }} normBox — normalized 0–1
 * @returns {Promise<{ enhancedBase64: string; originalCropBase64: string }>}
 */
export async function enhanceRegionCrop(base64Jpeg, normBox) {
  try {
    if (
      !normBox ||
      typeof normBox !== 'object' ||
      ![normBox.x, normBox.y, normBox.width, normBox.height].every((n) => Number.isFinite(Number(n)))
    ) {
      return { enhancedBase64: base64Jpeg, originalCropBase64: base64Jpeg };
    }

    const img = await loadImageFromJpegBase64(base64Jpeg);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) {
      return { enhancedBase64: base64Jpeg, originalCropBase64: base64Jpeg };
    }

    let bx = Math.max(0, Math.min(1, Number(normBox.x)));
    let by = Math.max(0, Math.min(1, Number(normBox.y)));
    let bw = Math.max(0.001, Math.min(1 - bx, Number(normBox.width)));
    let bh = Math.max(0.001, Math.min(1 - by, Number(normBox.height)));

    let sx = Math.round(bx * nw);
    let sy = Math.round(by * nh);
    let sw = Math.round(bw * nw);
    let sh = Math.round(bh * nh);

    sx = Math.max(0, Math.min(sx, nw - 1));
    sy = Math.max(0, Math.min(sy, nh - 1));
    sw = Math.max(1, Math.min(sw, nw - sx));
    sh = Math.max(1, Math.min(sh, nh - sy));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { enhancedBase64: base64Jpeg, originalCropBase64: base64Jpeg };
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const JPEG_QUALITY = 0.88;
    const originalCropBase64 = canvas
      .toDataURL('image/jpeg', JPEG_QUALITY)
      .replace(/^data:image\/jpeg;base64,/, '');

    let imgData = ctx.getImageData(0, 0, sw, sh);
    const contrastData = applyContrast(imgData.data, 1.3);
    const sharpened = applySharpen3x3(contrastData, sw, sh);

    const out = ctx.createImageData(sw, sh);
    out.data.set(sharpened);
    ctx.putImageData(out, 0, 0);

    const enhancedBase64 = canvas
      .toDataURL('image/jpeg', JPEG_QUALITY)
      .replace(/^data:image\/jpeg;base64,/, '');

    return { enhancedBase64, originalCropBase64 };
  } catch {
    return { enhancedBase64: base64Jpeg, originalCropBase64: base64Jpeg };
  }
}

/**
 * @param {string} base64Jpeg
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFromJpegBase64(base64Jpeg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = `data:image/jpeg;base64,${base64Jpeg}`;
  });
}

/**
 * @param {Uint8ClampedArray} data — RGBA
 * @param {number} factor — contrast multiplier around 0.5
 */
function applyContrast(data, factor) {
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c];
      out[i + c] = Math.round(
        Math.min(255, Math.max(0, ((v / 255 - 0.5) * factor + 0.5) * 255))
      );
    }
    out[i + 3] = data[i + 3];
  }
  return out;
}

/**
 * Kernel:
 *   0 -1  0
 *  -1  5 -1
 *   0 -1  0
 * Edge pixels unchanged (copy from contrastData).
 * @param {Uint8ClampedArray} contrastData
 * @param {number} w
 * @param {number} h
 */
function applySharpen3x3(contrastData, w, h) {
  const out = new Uint8ClampedArray(contrastData.length);
  out.set(contrastData);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const up = i - w * 4 + c;
        const down = i + w * 4 + c;
        const left = i - 4 + c;
        const right = i + 4 + c;
        const center = i + c;
        let sum =
          5 * contrastData[center] -
          contrastData[up] -
          contrastData[down] -
          contrastData[left] -
          contrastData[right];
        out[i + c] = Math.min(255, Math.max(0, Math.round(sum)));
      }
    }
  }
  return out;
}
