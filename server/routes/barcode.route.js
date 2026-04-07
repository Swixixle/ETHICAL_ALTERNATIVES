import { Router } from 'express';

const router = Router();

/**
 * First comma-separated segment, trimmed.
 * @param {unknown} raw
 */
function firstCsvSegment(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const first = s.split(',')[0]?.trim();
  return first || null;
}

router.post('/', async (req, res) => {
  const raw = req.body?.barcode;
  if (raw == null || typeof raw !== 'string' || !String(raw).trim()) {
    return res.status(400).json({ error: 'barcode required' });
  }
  const barcode = String(raw).trim();

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,brand_owner,categories`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const offRes = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!offRes.ok) {
      return res.json({ found: false, barcode });
    }

    const data = await offRes.json().catch(() => null);
    if (!data || (data.status !== 1 && data.status !== '1')) {
      return res.json({ found: false, barcode });
    }

    const product = data.product;
    if (!product || typeof product !== 'object') {
      return res.json({ found: false, barcode });
    }

    const brandsRaw = product.brands;
    const brandFromBrands = firstCsvSegment(brandsRaw);
    const brandOwner =
      typeof product.brand_owner === 'string' && product.brand_owner.trim()
        ? product.brand_owner.trim()
        : null;
    const brand = brandFromBrands || brandOwner || null;

    const product_name =
      typeof product.product_name === 'string' && product.product_name.trim()
        ? product.product_name.trim()
        : null;

    const catRaw = product.categories;
    const category = firstCsvSegment(catRaw);

    if (brand) {
      return res.json({
        found: true,
        brand,
        product_name,
        category,
        barcode,
      });
    }

    return res.json({ found: false, barcode });
  } catch {
    return res.json({ found: false, barcode });
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
