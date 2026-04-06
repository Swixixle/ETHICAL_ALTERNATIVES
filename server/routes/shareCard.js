import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { resolveIncumbentSlug } from '../services/investigation.js';
import { getPressOutletsForSlug } from '../services/pressOutletsCatalog.js';
import { WITNESS_LEGAL_NOTICE } from '../constants/witnessLegal.js';
import { bumpCivicDaily, logImpactShare } from '../services/impactAnalytics.js';
import { assignShareRiskTier } from '../services/shareRiskTier.js';
import { buildInvestigationSummary, buildShareTextBundle, collectPrimarySources } from '../services/shareTextsCore.js';
import {
  bodyContainsPhotoPayload,
  DISCLAIMER_CORE,
  MEDIUM_TIER_ADDENDUM,
  TIKTOK_HIGH_RISK_BLOCK_REASON,
} from '../utils/shareRouteGuards.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const companyAccounts = JSON.parse(
  readFileSync(join(__dirname, '../data/company-social-accounts.json'), 'utf8')
);
const regulatorData = JSON.parse(
  readFileSync(join(__dirname, '../data/regulator-endpoints.json'), 'utf8')
);
const shareDestinations = JSON.parse(
  readFileSync(join(__dirname, '../data/share-destinations.json'), 'utf8')
);

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

/** Agencies surfaced in the unified “send to all” checklist (fixed order). */
const SHARE_REGULATOR_ORDER = ['FTC', 'SEC', 'IRS', 'NLRB', 'DOL', 'OSHA', 'EPA', 'FDA'];

function resolveStateAG(stateCode) {
  const raw = typeof stateCode === 'string' ? stateCode.trim().toUpperCase() : '';
  const code = raw.length === 2 ? raw : '';
  if (!code || !shareDestinations.stateAGs?.[code]) return null;
  const row = shareDestinations.stateAGs[code];
  return { state_code: code, name: row.name, url: row.url };
}

function resolveUnionForSlug(slug) {
  const s = typeof slug === 'string' && slug.trim() ? slug.trim() : '';
  const u = shareDestinations.unions || {};
  return u[s] || u._default || null;
}

function resolveIrContact(slug) {
  const s = typeof slug === 'string' && slug.trim() ? slug.trim() : '';
  const url = shareDestinations.irContacts?.[s];
  return typeof url === 'string' && url ? { url } : null;
}

/**
 * Regulators whose applies_to intersects investigation verdict_tags only (no default list).
 */
function collectVerdictMatchedShareRegulators(verdictTags) {
  const tagSet = new Set((verdictTags || []).map(String));
  const buckets = ['default', 'irs', 'environmental', 'labor', 'financial', 'food_safety'];
  const matchedByAgency = new Map();

  for (const b of buckets) {
    const arr = regulatorData[b];
    if (!Array.isArray(arr)) continue;
    for (const reg of arr) {
      if (!reg?.agency || !SHARE_REGULATOR_ORDER.includes(reg.agency)) continue;
      if (!reg.applies_to || !Array.isArray(reg.applies_to)) continue;
      if (!reg.applies_to.some((t) => tagSet.has(String(t)))) continue;
      if (!matchedByAgency.has(reg.agency)) matchedByAgency.set(reg.agency, reg);
    }
  }

  return SHARE_REGULATOR_ORDER.map((a) => matchedByAgency.get(a)).filter(Boolean);
}

const router = Router();

function pickCompanyAccounts(map, slug) {
  if (!slug || typeof slug !== 'string') return null;
  if (map[slug]) return map[slug];
  if (slug.startsWith('mcdonald')) return map.mcdonalds || map['mcdonald-s'];
  return null;
}

/** POST /api/share-card — never includes photos; TikTok-style export blocked when share_risk_tier is high. */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    if (bodyContainsPhotoPayload(body)) {
      return res.status(400).json({
        error: 'photo_payload_rejected',
        message: 'This endpoint does not accept images or capture data. Remove photo fields and retry.',
      });
    }

    const shareChannel =
      typeof body.share_channel === 'string' ? body.share_channel.trim().toLowerCase() : '';
    const investigation = body.investigation || {};
    const identification = body.identification || {};

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

    const shareRiskTier = assignShareRiskTier(investigation);

    if (shareChannel === 'tiktok' && shareRiskTier === 'high') {
      void logImpactShare(brandSlug, 'tiktok', 'high', true);
      return res.json({
        blocked: true,
        reason: TIKTOK_HIGH_RISK_BLOCK_REASON,
        share_risk_tier: 'high',
        photo_included: false,
      });
    }

    const bundle = buildShareTextBundle(investigation, identification, body);
    const { brandName, headline, concernLevel, siteUrl, companyTag, emailPack, verdictTags } = bundle;

    const userStateRaw = typeof body.user_state === 'string' ? body.user_state.trim().toUpperCase() : '';
    const userState = userStateRaw.length === 2 ? userStateRaw : '';
    const stateAG = userState ? resolveStateAG(userState) : null;
    const unionContact = resolveUnionForSlug(brandSlug);
    const irContact = resolveIrContact(brandSlug);
    const esgRaters = Array.isArray(shareDestinations.esgRaters) ? shareDestinations.esgRaters : [];
    const pensionFunds = Array.isArray(shareDestinations.pensionFunds)
      ? shareDestinations.pensionFunds
      : [];

    const accounts = pickCompanyAccounts(companyAccounts, brandSlug);
    const primarySources = collectPrimarySources(investigation);
    const pullQuote = buildPullQuote(investigation);
    const regulatorPack = buildRegulatorPackText(investigation, brandName, primarySources);

    const shareTexts = {
      twitter: bundle.twitterText,
      twitter_company: `${bundle.concernEmoji} ${bundle.headline}\n\n${bundle.topTagsDisplay.join(' · ')}\n\n${bundle.companyTag} — documented public record (primary sources in thread context).\n\n#EthicalAlt\n${bundle.siteUrl}`,
      instagram: bundle.instagramText,
      general: bundle.generalText,
      regulator_pack: regulatorPack,
      email_subject: bundle.emailPack.subject,
      email_body: bundle.emailPack.body,
    };

    const relevantRegulators = collectVerdictMatchedShareRegulators(verdictTags);

    let pressOutlets =
      Array.isArray(investigation.press_outlets) && investigation.press_outlets.length
        ? investigation.press_outlets.map((o) => ({
            name: String(o?.name || '').trim(),
            handle: String(o?.handle || '').trim().startsWith('@')
              ? String(o?.handle || '').trim()
              : `@${String(o?.handle || '').replace(/^@+/, '').trim()}`,
            beat: String(o?.beat || '').trim(),
          })).filter((o) => o.name && o.handle)
        : getPressOutletsForSlug(brandSlug);

    const seenPress = new Set();
    pressOutlets = pressOutlets.filter((o) => {
      if (seenPress.has(o.handle)) return false;
      seenPress.add(o.handle);
      return true;
    });

    void bumpCivicDaily(req, 'share_export');
    void logImpactShare(brandSlug, 'share_card', shareRiskTier, false);

    const disclaimer =
      shareRiskTier === 'medium' ? `${MEDIUM_TIER_ADDENDUM}\n\n${DISCLAIMER_CORE}` : DISCLAIMER_CORE;

    res.json({
      brand_name: brandName,
      brand_slug: brandSlug,
      company_accounts: accounts,
      company_tag: companyTag,
      press_outlets: pressOutlets,
      relevant_regulators: relevantRegulators,
      state_ag: stateAG,
      user_state: userState || null,
      esg_raters: esgRaters,
      pension_funds: pensionFunds,
      union: unionContact,
      ir_contact: irContact,
      email_mailto: emailPack.mailto,
      share_url: siteUrl,
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
      disclaimer,
      legal_notice: WITNESS_LEGAL_NOTICE,
      photo_included: false,
      share_risk_tier: shareRiskTier,
      tiktok_export_blocked: shareRiskTier === 'high',
      medium_risk_disclaimer: shareRiskTier === 'medium' ? MEDIUM_TIER_ADDENDUM : null,
      blocked: false,
    });
  } catch (err) {
    console.error('share-card error:', err?.message || err);
    res.status(500).json({ error: 'share_card_failed' });
  }
});

export default router;
