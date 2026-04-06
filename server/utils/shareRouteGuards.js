/** Shared guards / copy for share endpoints (no photos; TikTok risk messaging). */

export const PHOTO_DENYLIST_ROOT = new Set([
  'image_base64',
  'photo_base64',
  'photo',
  'image',
  'crop_base64',
  'capture_base64',
  'user_image',
]);

export function bodyContainsPhotoPayload(body) {
  if (!body || typeof body !== 'object') return false;
  for (const k of PHOTO_DENYLIST_ROOT) {
    const v = body[k];
    if (v != null && String(v).length > 0) return true;
  }
  const id = body.identification;
  if (id && typeof id === 'object') {
    for (const k of ['crop_base64', 'image_base64', 'photo_base64']) {
      if (id[k] != null && String(id[k]).length > 0) return true;
    }
  }
  const inv = body.investigation;
  if (inv && typeof inv === 'object') {
    for (const k of ['crop_base64', 'image_base64', 'photo_base64', 'user_capture']) {
      if (inv[k] != null && String(inv[k]).length > 0) return true;
    }
  }
  return false;
}

export const TIKTOK_HIGH_RISK_BLOCK_REASON =
  'This investigation is classified high-risk for short-form social export (e.g. TikTok). ' +
  'Automated sharing is disabled until source verification meets our threshold. ' +
  'You can still review primary sources in the app.';

export const MEDIUM_TIER_ADDENDUM =
  'Note: Some sections carry preliminary or limited corroboration — verify primary sources before you act or share further.';

export const DISCLAIMER_CORE =
  'All shared content uses only documented public record claims with primary source URLs. Nothing fabricated. The record speaks.';
