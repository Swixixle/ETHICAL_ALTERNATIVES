import { Router } from 'express';
import { submitSeller } from '../services/sellerRegistry.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const result = await submitSeller(req.body || {});
    res.json({
      success: true,
      message:
        "You're in. We review all submissions — yours will appear within 48 hours. No account, no fees.",
      id: result.id,
      seller_name: result.seller_name,
    });
  } catch (err) {
    console.error('Seller submission error:', err.message);
    res.status(400).json({ success: false, error: err.message || 'Submission failed' });
  }
});

router.get('/categories', (_req, res) => {
  res.json({
    categories: [
      { value: 'clothing', label: 'Clothing & Fashion' },
      { value: 'coffee', label: 'Coffee & Tea' },
      { value: 'food', label: 'Food & Pantry' },
      { value: 'ceramics', label: 'Ceramics & Pottery' },
      { value: 'personal_care', label: 'Personal Care & Beauty' },
      { value: 'candles', label: 'Candles & Fragrance' },
      { value: 'jewelry', label: 'Jewelry' },
      { value: 'art', label: 'Art & Prints' },
      { value: 'books', label: 'Books & Zines' },
      { value: 'plants', label: 'Plants & Garden' },
      { value: 'furniture', label: 'Furniture & Woodworking' },
      { value: 'textiles', label: 'Textiles & Fiber Arts' },
      { value: 'vintage', label: 'Vintage & Secondhand' },
      { value: 'handmade', label: 'Handmade (general)' },
      { value: 'outdoor', label: 'Outdoor & Gear' },
      { value: 'electronics', label: 'Electronics & Repair' },
      { value: 'other', label: 'Other' },
    ],
  });
});

export default router;
