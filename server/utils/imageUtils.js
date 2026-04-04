/** Max decoded image payload ~2MB per spec (tap flow JPEG). */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Strip data URL prefix if present; return raw base64.
 * @param {string} input
 */
export function stripBase64Prefix(input) {
  if (!input || typeof input !== 'string') return '';
  const m = input.match(/^data:image\/\w+;base64,(.+)$/);
  return m ? m[1] : input.replace(/\s/g, '');
}

/**
 * Rough size check: base64 is ~4/3 of binary.
 * @param {string} base64Raw
 */
export function estimateDecodedBytes(base64Raw) {
  if (!base64Raw) return 0;
  const len = base64Raw.length;
  const padding = (base64Raw.match(/=/g) || []).length;
  return Math.floor((len * 3) / 4) - padding;
}

/**
 * @param {string} base64Raw
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateImagePayload(base64Raw) {
  if (!base64Raw || typeof base64Raw !== 'string') {
    return { ok: false, error: 'image_base64 required' };
  }
  const trimmed = stripBase64Prefix(base64Raw);
  if (!trimmed.length) {
    return { ok: false, error: 'image_base64 required' };
  }
  if (estimateDecodedBytes(trimmed) > MAX_IMAGE_BYTES) {
    return { ok: false, error: `image exceeds ${MAX_IMAGE_BYTES} byte limit` };
  }
  return { ok: true, base64: trimmed };
}
