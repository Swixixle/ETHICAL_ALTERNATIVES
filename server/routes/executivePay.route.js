import { Router } from 'express';
import { perplexityExecutivePayLookup } from '../services/aiProvider.js';

const router = Router();

router.post('/', async (req, res) => {
  const raw = req.body?.companyName ?? req.body?.company;
  const companyName = typeof raw === 'string' ? raw.trim() : '';
  if (!companyName) {
    return res.status(400).json({ ok: false, error: 'companyName required' });
  }

  const result = await perplexityExecutivePayLookup(companyName);
  if (!result.ok) {
    const status = result.error?.includes('not configured') ? 503 : 502;
    return res.status(status).json({ ok: false, error: result.error });
  }
  return res.json({
    ok: true,
    series: result.series,
    source_note: result.source_note,
    data_available: result.data_available,
  });
});

export default router;
