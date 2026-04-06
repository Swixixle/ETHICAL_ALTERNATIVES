/**
 * Public URL for HOW_INVESTIGATIONS_WORK — override with VITE_METHODOLOGY_URL (no trailing slash required).
 * Defaults to the doc on GitHub main so the client works before a marketing site exists.
 */
export function methodologyPageUrl() {
  const v = typeof import.meta !== 'undefined' && import.meta.env?.VITE_METHODOLOGY_URL;
  if (typeof v === 'string' && v.trim()) return v.trim().replace(/\/$/, '');
  return 'https://github.com/Swixixle/ETHICAL_ALTERNATIVES/blob/main/docs/HOW_INVESTIGATIONS_WORK.md';
}
