import { Router } from 'express';
import { geocodeLocationQuery } from '../services/geocoder.js';

const router = Router();

/** GET /api/geocode?city=Indianapolis or city=Indianapolis%2C+IN */
router.get('/', async (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  if (!city) {
    return res.status(400).json({ error: 'city required' });
  }
  try {
    const loc = await geocodeLocationQuery(city);
    if (!loc) {
      return res.status(404).json({ error: 'City not found' });
    }
    res.json(loc);
  } catch (e) {
    console.error('geocode route', e?.message || e);
    res.status(500).json({ error: 'geocode_failed' });
  }
});

export default router;
