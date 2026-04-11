import { Router } from 'express';
import { getStoredInvestigationBySlug } from '../services/investigation.js';

const router = Router();

/** GET /api/report/:slug — JSON investigation snapshot from incumbent_profiles (no live pipeline). */
router.get('/:slug', async (req, res) => {
  const slug = decodeURIComponent(String(req.params.slug || '')).trim().toLowerCase();
  if (!slug) {
    return res.status(404).json({ error: 'not_found' });
  }
  const healthFlag = req.query.health === '1' || req.query.health === 'true';
  try {
    const profile = await getStoredInvestigationBySlug(slug, { healthFlag });
    if (!profile) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json(profile);
  } catch (e) {
    console.error('[report]', e?.message || e);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
