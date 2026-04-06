/**
 * Per-channel share export for system share sheet (no photos).
 * TikTok is the only channel blocked when share_risk_tier === high.
 */

import { Router } from 'express';
import { resolveIncumbentSlug } from '../services/investigation.js';
import { assignShareRiskTier } from '../services/shareRiskTier.js';
import { bumpCivicDaily, logImpactShare } from '../services/impactAnalytics.js';
import { buildShareTextBundle } from '../services/shareTextsCore.js';
import {
  bodyContainsPhotoPayload,
  DISCLAIMER_CORE,
  MEDIUM_TIER_ADDENDUM,
  TIKTOK_HIGH_RISK_BLOCK_REASON,
} from '../utils/shareRouteGuards.js';

const router = Router();

/** @type {Set<string>} */
const VALID_CHANNELS = new Set([
  'tiktok',
  'instagram',
  'facebook',
  'x',
  'email',
  'image_download',
  'copy_caption',
]);

function appendStandardDisclaimer(text, tier) {
  const d = tier === 'medium' ? `${MEDIUM_TIER_ADDENDUM}\n\n${DISCLAIMER_CORE}` : DISCLAIMER_CORE;
  return `${String(text || '').trim()}\n\n—\n${d}`;
}

/** POST /api/share-export */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    if (bodyContainsPhotoPayload(body)) {
      return res.status(400).json({
        error: 'photo_payload_rejected',
        message: 'This endpoint does not accept images or capture data.',
      });
    }

    const channelRaw = typeof body.channel === 'string' ? body.channel.trim().toLowerCase() : '';
    if (!VALID_CHANNELS.has(channelRaw)) {
      return res.status(400).json({
        error: 'invalid_channel',
        message: `channel must be one of: ${[...VALID_CHANNELS].join(', ')}`,
      });
    }

    const investigation = body.investigation || {};
    const identification = body.identification || {};
    if (!investigation || typeof investigation !== 'object' || Object.keys(investigation).length === 0) {
      return res.status(400).json({ error: 'investigation required' });
    }

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

    if (channelRaw === 'tiktok' && shareRiskTier === 'high') {
      void logImpactShare(brandSlug, 'tiktok', 'high', true);
      return res.json({
        blocked: true,
        reason: TIKTOK_HIGH_RISK_BLOCK_REASON,
        share_risk_tier: 'high',
        photo_included: false,
        channel: 'tiktok',
      });
    }

    const bundle = buildShareTextBundle(investigation, identification, body);
    const title = `EthicalAlt — ${bundle.headline}`;
    /** @type {string} */
    let text = '';
    let url = bundle.siteUrl;

    switch (channelRaw) {
      case 'tiktok':
        text = appendStandardDisclaimer(bundle.tiktokCaption, shareRiskTier);
        break;
      case 'instagram':
        text = appendStandardDisclaimer(bundle.instagramText, shareRiskTier);
        break;
      case 'facebook':
        text = appendStandardDisclaimer(bundle.facebookText, shareRiskTier);
        break;
      case 'x':
        text = appendStandardDisclaimer(bundle.twitterText, shareRiskTier);
        break;
      case 'email': {
        const bodyText = appendStandardDisclaimer(bundle.emailPack.body, shareRiskTier);
        void bumpCivicDaily(req, 'share_export');
        void logImpactShare(brandSlug, channelRaw, shareRiskTier, false);
        return res.json({
          blocked: false,
          photo_included: false,
          share_risk_tier: shareRiskTier,
          channel: channelRaw,
          title: bundle.emailPack.subject,
          text: bodyText,
          url,
          email_subject: bundle.emailPack.subject,
          email_body: bodyText,
          mailto: `mailto:?subject=${encodeURIComponent(bundle.emailPack.subject)}&body=${encodeURIComponent(bodyText.slice(0, 2800))}`,
          medium_risk_disclaimer: shareRiskTier === 'medium' ? MEDIUM_TIER_ADDENDUM : null,
        });
      }
      case 'image_download':
        text = appendStandardDisclaimer(bundle.cardTextPlain, shareRiskTier);
        url = bundle.siteUrl;
        break;
      case 'copy_caption':
        text = appendStandardDisclaimer(bundle.instagramText, shareRiskTier);
        break;
      default:
        text = appendStandardDisclaimer(bundle.generalText, shareRiskTier);
    }

    void bumpCivicDaily(req, 'share_export');
    void logImpactShare(brandSlug, channelRaw, shareRiskTier, false);

    res.json({
      blocked: false,
      photo_included: false,
      share_risk_tier: shareRiskTier,
      channel: channelRaw,
      title,
      text,
      url,
      medium_risk_disclaimer: shareRiskTier === 'medium' ? MEDIUM_TIER_ADDENDUM : null,
    });
  } catch (err) {
    console.error('share-export error:', err?.message || err);
    res.status(500).json({ error: 'share_export_failed' });
  }
});

export default router;
