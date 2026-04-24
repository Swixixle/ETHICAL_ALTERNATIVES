/**
 * GET /api/human-scale-analysis/:slug
 *
 * Query (optional):
 *   category          — tax|legal|labor|environmental|political|product_health (default: legal)
 *   amount_involved   — override violation $ (with corporate_fine enables full brief)
 *   corporate_fine    — override corporate fine $
 *   violation_type    — label for the violation
 *   simple=1          — skip goldman-sachs demo block; use heuristic only
 */
import express from 'express';
import '../env.js';
import { pool } from '../db/pool.js';
import { buildComparisonBrief, generateBriefSummary } from '../services/sentencingComparisonBrief.js';
import { generateCategoryHumanScaleAnalysis } from '../services/humanScaleIntegration.js';

const router = express.Router();

const CATEGORIES = new Set(['tax', 'legal', 'labor', 'environmental', 'political', 'product_health']);

function decodeSlug(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

function slugToTitle(slug) {
  return String(slug || '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function parseAmount(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function resolveBrandName(slug) {
  if (!pool) return slugToTitle(slug);
  try {
    const { rows } = await pool.query(
      'SELECT brand_name FROM incumbent_profiles WHERE LOWER(brand_slug) = LOWER($1) LIMIT 1',
      [slug]
    );
    if (rows[0]?.brand_name) return String(rows[0].brand_name).trim();
  } catch (e) {
    console.warn('[human-scale-analysis] brand lookup failed', e?.message || e);
  }
  return slugToTitle(slug);
}

/** Matches server/test-comparison-brief.mjs — used for goldman-sachs unless ?simple=1 */
const GOLDMAN_SACH_DEMO = {
  category: 'legal',
  violationType: 'Securities fraud - $5B misrepresentation',
  amountInvolved: 5_000_000_000,
  corporateOutcome: 'Settlement with SEC and DOJ',
  corporateFine: 500_000_000,
  corporateSentence: 0,
  incidentDate: '2023',
  resolutionDate: '2024-06-15',
  admission: false,
  individualsCharged: 0,
  sources: ['https://sec.gov/', 'https://justice.gov/'],
};

router.get('/human-scale-analysis/:slug', async (req, res) => {
  const slug = decodeSlug(req.params.slug);
  if (!slug) {
    return res.status(400).json({ ok: false, error: 'Missing or invalid slug' });
  }

  const catRaw = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : 'legal';
  const category = CATEGORIES.has(catRaw) ? catRaw : 'legal';

  const amountInvolved = parseAmount(req.query.amount_involved);
  const corporateFine = parseAmount(req.query.corporate_fine);
  const simple = String(req.query.simple || '') === '1' || String(req.query.simple || '').toLowerCase() === 'true';

  try {
    const brandName = await resolveBrandName(slug);

    // Explicit amounts → build full signed-style brief
    if (amountInvolved != null && corporateFine != null) {
      const corporateViolation = {
        brandName,
        brandSlug: slug,
        category,
        violationType:
          typeof req.query.violation_type === 'string' && req.query.violation_type.trim()
            ? req.query.violation_type.trim()
            : 'Regulatory / economic violation',
        amountInvolved: amountInvolved,
        corporateOutcome:
          typeof req.query.outcome === 'string' && req.query.outcome.trim()
            ? req.query.outcome.trim()
            : 'Enforcement resolution',
        corporateFine,
        corporateSentence: parseAmount(req.query.corporate_sentence_months) ?? 0,
        incidentDate: typeof req.query.incident_date === 'string' ? req.query.incident_date : new Date().getFullYear().toString(),
        resolutionDate:
          typeof req.query.resolution_date === 'string' ? req.query.resolution_date : new Date().toISOString().split('T')[0],
        admission: false,
        individualsCharged: 0,
        sources: [],
      };
      const brief = await buildComparisonBrief(corporateViolation, `api-${slug}`, {
        sampleSize: 100,
        governance: (() => {
          const g = parseAmount(req.query.decision_makers);
          if (g != null && g > 0) {
            return {
              board_members: Math.max(1, Math.floor(g * 0.55)),
              c_suite_authority: Math.max(1, g - Math.floor(g * 0.55)),
              total: Math.floor(g),
              is_estimated: true,
            };
          }
          return undefined;
        })(),
      });
      return res.json({
        ok: true,
        mode: 'custom_amounts',
        brand_slug: slug,
        brand_name: brandName,
        brief,
        summary_text: generateBriefSummary(brief),
      });
    }

    // Demo case aligned with test script (23,804-case USSC path, ~5ms)
    if (!simple && slug.toLowerCase() === 'goldman-sachs') {
      const corporateViolation = {
        brandName,
        brandSlug: slug,
        ...GOLDMAN_SACH_DEMO,
      };
      const brief = await buildComparisonBrief(corporateViolation, `api-${slug}-demo`, {
        sampleSize: 100,
        governance: {
          board_members: 12,
          c_suite_authority: 6,
          total: 18,
          is_estimated: true,
        },
      });
      return res.json({
        ok: true,
        mode: 'goldman_demo',
        brand_slug: slug,
        brand_name: brandName,
        brief,
        summary_text: generateBriefSummary(brief),
      });
    }

    // Heuristic: category + governance estimate (weaker $ defaults if no flags)
    const analysis = await generateCategoryHumanScaleAnalysis(brandName, slug, category, [], []);
    if (!analysis) {
      return res.status(404).json({
        ok: false,
        error:
          'No human-scale model for this category, or offense not in Phase 1 taxonomy. Try ?category=legal, or pass amount_involved and corporate_fine together.',
        brand_slug: slug,
        brand_name: brandName,
        category,
      });
    }
    return res.json({
      ok: true,
      mode: 'heuristic',
      brand_slug: slug,
      brand_name: brandName,
      category,
      analysis,
    });
  } catch (err) {
    console.error('GET /api/human-scale-analysis/:slug', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
