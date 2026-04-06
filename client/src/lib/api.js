import { getImpactFetchHeaders } from './impactConsent.js';

function apiBase() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

/**
 * @param {Record<string, unknown>} investigation
 * @param {'tiktok'|'instagram'|'facebook'|'x'|'email'|'image_download'|'copy_caption'} channel
 * @param {Record<string, unknown> | null} [identification]
 * @param {{ siteUrl?: string; userState?: string; generatedHeadline?: string }} [opts]
 */
export async function exportShare(investigation, channel, identification = null, opts = {}) {
  const base = apiBase();
  const url = base ? `${base}/api/share-export` : '/api/share-export';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
    body: JSON.stringify({
      investigation,
      identification,
      channel,
      site_url: opts.siteUrl,
      user_state: opts.userState,
      generated_headline: opts.generatedHeadline,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Namespace-style export for specs that reference `api.exportShare`. */
export const api = { exportShare };
