import { Router } from 'express';
import { getImpactPublicSnapshot, recordImpactOutcome } from '../services/impactAnalytics.js';

const router = Router();

router.get('/impact/public', async (req, res) => {
  const raw = typeof req.query.month === 'string' ? req.query.month.trim() : '';
  const ym = /^\d{4}-\d{2}$/.test(raw) ? raw : undefined;
  try {
    const snap = await getImpactPublicSnapshot(ym);
    res.json({ ok: true, ...snap });
  } catch (e) {
    console.warn('[impact route] public', e?.message || e);
    res.status(500).json({ ok: false, error: 'impact_public_failed' });
  }
});

router.post('/impact/outcome', async (req, res) => {
  const o = typeof req.body?.outcome === 'string' ? req.body.outcome.trim() : '';
  await recordImpactOutcome(req, o);
  res.json({ ok: true });
});

export default router;
