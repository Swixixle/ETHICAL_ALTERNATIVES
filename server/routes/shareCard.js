import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { resolveIncumbentSlug } from '../services/investigation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const companyAccounts = JSON.parse(
  readFileSync(join(__dirname, '../data/company-social-accounts.json'), 'utf8')
);
const regulatorData = JSON.parse(
  readFileSync(join(__dirname, '../data/regulator-endpoints.json'), 'utf8')
);

function pickCompanyAccounts(map, slug) {
  if (!slug || typeof slug !== 'string') return null;
  if (map[slug]) return map[slug];
  if (slug.startsWith('mcdonald')) return map.mcdonalds || map['mcdonald-s'];
  return null;
}

function collectPrimarySources(inv) {
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

function buildPullQuote(inv) {
  const timeline = Array.isArray(inv?.timeline) ? inv.timeline : [];
  for (const e of timeline) {
    if (e && typeof e.event === 'string' && e.event.trim()) {
      const url = typeof e.source_url === 'string' && e.source_url ? String(e.source_url) : null;
      if (url) {
        return {
          text: e.event.trim().replace(/\s+/g, ' ').slice(0, 320),
          sourceUrl: url,
        };
      }
    }
  }
  const ex = inv?.executive_summary;
  if (typeof ex === 'string' && ex.trim()) {
    const urls = collectPrimarySources(inv);
    return {
      text: ex.trim().replace(/\s+/g, ' ').slice(0, 360),
      sourceUrl: urls[0] || null,
    };
  }
  return { text: null, sourceUrl: null };
}

function buildInvestigationSummary(inv) {
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

function buildRegulatorPackText(inv, brandName, sources) {
  const summary = buildInvestigationSummary(inv);
  const lines = [
    `Public record summary regarding ${brandName}:`,
    '',
    summary || '(No structured summary — cite sections and URLs from the in-app record.)',
    '',
    'Primary sources (verify before submitting):',
  ];
  const top = sources.slice(0, 12);
  if (top.length) {
    for (const u of top) lines.push(`- ${u}`);
  } else {
    lines.push('- (Copy URLs from the EthicalAlt investigation sections in the app.)');
  }
  return lines.join('\n');
}

function collectRelevantRegulators(tags) {
  const buckets = ['tax', 'environmental', 'labor', 'financial', 'food_safety', 'default'];
  const allRegulators = buckets.flatMap((b) =>
    Array.isArray(regulatorData[b]) ? regulatorData[b] : []
  );

  const relevant = [];
  for (const reg of allRegulators) {
    if (!reg?.applies_to || !Array.isArray(reg.applies_to)) continue;
    if (reg.applies_to.some((t) => tags.includes(t))) {
      if (!relevant.find((r) => r.agency === reg.agency)) relevant.push(reg);
    }
  }

  const defaultRegs = Array.isArray(regulatorData.default) ? regulatorData.default : [];
  for (const reg of defaultRegs) {
    if (reg?.agency && !relevant.find((r) => r.agency === reg.agency)) {
      relevant.push(reg);
    }
  }

  return relevant.slice(0, 8);
}

const router = Router();

/** POST /api/share-card */
router.post('/', (req, res) => {
  try {
    const body = req.body || {};
    const investigation = body.investigation || {};
    const identification = body.identification || {};

    const brandName =
      String(identification.brand || investigation.brand || identification.object || 'Company').trim() ||
      'Company';

    const slugFromBody = typeof body.brand_slug === 'string' ? body.brand_slug.trim() : '';
    const brandSlug =
      slugFromBody ||
      resolveIncumbentSlug(identification.brand, identification.corporate_parent) ||
      resolveIncumbentSlug(investigation.brand, identification.corporate_parent);

    const verdictTags = Array.isArray(investigation.verdict_tags)
      ? investigation.verdict_tags.map(String)
      : [];
    const concernFlags = Array.isArray(investigation.concern_flags)
      ? investigation.concern_flags.map(String)
      : [];
    const tags = [...new Set([...verdictTags, ...concernFlags])];

    const accounts = pickCompanyAccounts(companyAccounts, brandSlug);
    const primarySources = collectPrimarySources(investigation);
    const invSummary = buildInvestigationSummary(investigation);
    const pullQuote = buildPullQuote(investigation);
    const regulatorPack = buildRegulatorPackText(investigation, brandName, primarySources);

    const headline =
      String(body.generated_headline || investigation.generated_headline || '').trim() ||
      brandName;
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

    const shareTexts = {
      twitter: `${concernEmoji} ${headline}\n\n${topTagsDisplay.join(' · ')}\n\nSourced public record · #EthicalAlt\n${companyTag}\n\n${siteUrl}`,

      twitter_company: `${concernEmoji} ${headline}\n\n${topTagsDisplay.join(' · ')}\n\n${companyTag} — documented public record (primary sources in thread context).\n\n#EthicalAlt\n${siteUrl}`,

      instagram: `${concernEmoji} ${headline}\n\n${topTagsDisplay.join(' · ')}\n\n${invSummary ? `${invSummary.slice(0, 600)}${invSummary.length > 600 ? '…' : ''}\n\n` : ''}Every claim ties to public record URLs in the full EthicalAlt dossier.\n\n#EthicalAlt #EthicalShopping`,

      general: `${headline}\n\n${topTagsDisplay.join(' · ')}\n\n${invSummary || ''}\n\nPrimary sources: government filings, courts, and established journalism — see EthicalAlt for links.\n\n${siteUrl}`,

      regulator_pack: regulatorPack,
    };

    const relevantRegulators = collectRelevantRegulators(tags);

    res.json({
      brand_name: brandName,
      brand_slug: brandSlug,
      company_accounts: accounts,
      company_tag: companyTag,
      relevant_regulators: relevantRegulators,
      share_texts: shareTexts,
      card_data: {
        headline,
        brand_name: brandName,
        concern_level: concernLevel,
        top_tags: verdictTags.slice(0, 3),
        source_count: primarySources.length,
        pull_quote: pullQuote.text
          ? { text: pullQuote.text, source_url: pullQuote.sourceUrl }
          : null,
      },
      disclaimer:
        'All shared content uses only documented public record claims with primary source URLs. Nothing fabricated. The record speaks.',
    });
  } catch (err) {
    console.error('share-card error:', err?.message || err);
    res.status(500).json({ error: 'share_card_failed' });
  }
});

export default router;
