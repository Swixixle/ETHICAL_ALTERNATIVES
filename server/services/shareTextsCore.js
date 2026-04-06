/**
 * Shared text builders for share-card and share-export (no images).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveIncumbentSlug } from './investigation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const companyAccounts = JSON.parse(
  readFileSync(join(__dirname, '../data/company-social-accounts.json'), 'utf8')
);

function pickCompanyAccounts(map, slug) {
  if (!slug || typeof slug !== 'string') return null;
  if (map[slug]) return map[slug];
  if (slug.startsWith('mcdonald')) return map.mcdonalds || map['mcdonald-s'];
  return null;
}

export function collectPrimarySources(inv) {
  if (!inv || typeof inv !== 'object') return [];
  const keys = [
    'tax_sources',
    'legal_sources',
    'labor_sources',
    'environmental_sources',
    'political_sources',
    'product_health_sources',
    'executive_sources',
  ];
  const out = [];
  for (const k of keys) {
    const arr = inv[k];
    if (Array.isArray(arr)) out.push(...arr.map(String));
  }
  return [...new Set(out.filter(Boolean))];
}

export function buildInvestigationSummary(inv) {
  if (!inv) return '';
  if (typeof inv.executive_summary === 'string' && inv.executive_summary.trim()) {
    return inv.executive_summary.trim();
  }
  const parts = [];
  for (const k of ['tax_summary', 'legal_summary', 'labor_summary', 'environmental_summary']) {
    const v = inv[k];
    if (typeof v === 'string' && v.trim()) parts.push(v.trim());
  }
  return parts.join('\n\n') || '';
}

export function buildInvestigationEmailPack(brandName, headline, inv, siteUrl, verdictTags, sourceCount) {
  const subj = `Documented corporate investigation: ${brandName}`;
  const tags = (verdictTags || []).slice(0, 3).map(String).join(', ');
  const summary = buildInvestigationSummary(inv);
  const summaryClip = summary.length > 1000 ? `${summary.slice(0, 1000)}…` : summary;
  const body = `${headline}\n\nKey issues: ${tags || '(see record)'}\n\n${summaryClip}\n\nIndexed primary sources in dossier: ${sourceCount}\n\nLive record: ${siteUrl}\n\n---\nCompiled from publicly available records. Verify primary sources; this email is not a legal filing.`;
  const max = 1900;
  const clipped = body.length > max ? `${body.slice(0, max)}…` : body;
  return {
    subject: subj,
    body: clipped,
    mailto: `mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(clipped)}`,
  };
}

/**
 * @param {Record<string, unknown>} investigation
 * @param {Record<string, unknown>} identification
 * @param {Record<string, unknown>} body — request body (site_url, generated_headline, etc.)
 */
export function buildShareTextBundle(investigation, identification, body) {
  const brandName =
    String(identification.brand || investigation.brand || identification.object || 'Company').trim() ||
    'Company';

  const slugFromBody = typeof body.brand_slug === 'string' ? body.brand_slug.trim() : '';
  const invSlug =
    typeof investigation.brand_slug === 'string' && investigation.brand_slug.trim()
      ? investigation.brand_slug.trim()
      : '';
  const brandSlug =
    slugFromBody ||
    invSlug ||
    resolveIncumbentSlug(identification.brand, identification.corporate_parent) ||
    resolveIncumbentSlug(investigation.brand, investigation.corporate_parent) ||
    'unknown';

  const verdictTags = Array.isArray(investigation.verdict_tags)
    ? investigation.verdict_tags.map(String)
    : [];

  const accounts = pickCompanyAccounts(companyAccounts, brandSlug);
  const primarySources = collectPrimarySources(investigation);
  const invSummary = buildInvestigationSummary(investigation);

  const headline =
    String(body.generated_headline || investigation.generated_headline || '').trim() || brandName;
  const concernLevel = String(investigation.overall_concern_level || 'unknown');

  const concernEmoji = {
    significant: '🔴',
    moderate: '🟡',
    minor: '🟢',
    clean: '✅',
  }[concernLevel] || '⚪';

  const topTagsDisplay = verdictTags.slice(0, 3).map((t) => t.replace(/_/g, ' ').toUpperCase());

  const siteUrl =
    String(process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '') ||
    (typeof body.site_url === 'string' ? body.site_url.replace(/\/$/, '') : '') ||
    'https://ethicalalt-client.onrender.com';

  const companyTag = accounts?.twitter
    ? accounts.twitter
    : `#${brandName.replace(/\s+/g, '')}`;

  const emailPack = buildInvestigationEmailPack(
    brandName,
    headline,
    investigation,
    siteUrl,
    verdictTags,
    primarySources.length
  );

  const twitterText = `${concernEmoji} ${headline}\n\n${topTagsDisplay.join(' · ')}\n\nSourced public record · #EthicalAlt\n${companyTag}\n\n${siteUrl}`;

  const instagramText = `${concernEmoji} ${headline}\n\n${topTagsDisplay.join(' · ')}\n\n${
    invSummary ? `${invSummary.slice(0, 600)}${invSummary.length > 600 ? '…' : ''}\n\n` : ''
  }Every claim ties to public record URLs in the full EthicalAlt dossier.\n\n#EthicalAlt #EthicalShopping`;

  const facebookText = `${headline}\n\n${topTagsDisplay.join(' · ')}\n\n${siteUrl}\n\n#EthicalAlt`;

  const tiktokCaption = `Public-record summary: ${headline}. Sources & scores in EthicalAlt — not legal advice. #EthicalAlt`;

  const generalText = `${headline}\n\n${topTagsDisplay.join(' · ')}\n\n${invSummary || ''}\n\nPrimary sources: government filings, courts, and established journalism — see EthicalAlt for links.\n\n${siteUrl}`;

  const cardTextPlain = [
    `EthicalAlt — ${brandName}`,
    `Concern: ${concernLevel}`,
    '',
    headline,
    '',
    topTagsDisplay.length ? `Tags: ${topTagsDisplay.join(', ')}` : '',
    '',
    invSummary ? invSummary.slice(0, 2000) : '',
    '',
    siteUrl,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    brandName,
    brandSlug,
    headline,
    concernLevel,
    concernEmoji,
    topTagsDisplay,
    invSummary,
    siteUrl,
    companyTag,
    emailPack,
    twitterText,
    instagramText,
    facebookText,
    tiktokCaption,
    generalText,
    cardTextPlain,
    verdictTags,
  };
}
