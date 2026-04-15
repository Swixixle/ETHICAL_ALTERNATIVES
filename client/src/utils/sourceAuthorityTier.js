/**
 * Evidentiary tier for source URLs in investigation accordions.
 * @typedef {'official' | 'primary_press' | 'secondary'} SourceAuthorityTier
 */

/**
 * @param {string | null | undefined} url
 * @returns {SourceAuthorityTier}
 */
export function getSourceAuthorityTier(url) {
  const raw = String(url || '').trim();
  if (!/^https?:\/\//i.test(raw)) return 'secondary';
  let host = '';
  try {
    host = new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'secondary';
  }
  if (!host) return 'secondary';

  if (host.endsWith('.gov') || host.endsWith('.mil')) return 'official';
  if (
    /^(?:[^.]+\.)?justice\.gov$/.test(host) ||
    /^(?:[^.]+\.)?uscourts\.gov$/.test(host) ||
    /^(?:[^.]+\.)?federalregister\.gov$/.test(host) ||
    /^(?:[^.]+\.)?epa\.gov$/.test(host) ||
    /^(?:[^.]+\.)?sec\.gov$/.test(host) ||
    /^(?:[^.]+\.)?dol\.gov$/.test(host) ||
    /^(?:[^.]+\.)?ftc\.gov$/.test(host) ||
    /^(?:[^.]+\.)?fda\.gov$/.test(host) ||
    /^(?:[^.]+\.)?irs\.gov$/.test(host) ||
    /^(?:[^.]+\.)?treasury\.gov$/.test(host) ||
    /^(?:[^.]+\.)?hhs\.gov$/.test(host) ||
    /^(?:[^.]+\.)?nlrb\.gov$/.test(host) ||
    /^(?:[^.]+\.)?cpsc\.gov$/.test(host) ||
    /^(?:[^.]+\.)?uspto\.gov$/.test(host)
  ) {
    return 'official';
  }
  if (/europa\.eu$|(^|\.)gov\.uk$/.test(host)) return 'official';

  if (
    /(^|\.)nytimes\.com$|(^|\.)reuters\.com$|(^|\.)apnews\.com$|(^|\.)wsj\.com$|(^|\.)propublica\.org$|(^|\.)bloomberg\.com$|(^|\.)theguardian\.com$|(^|\.)ft\.com$|(^|\.)economist\.com$|(^|\.)forbes\.com$|(^|\.)cnbc\.com$/i.test(
      host
    )
  ) {
    return 'primary_press';
  }

  return 'secondary';
}
