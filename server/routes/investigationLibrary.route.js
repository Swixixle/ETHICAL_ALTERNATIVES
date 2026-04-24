/**
 * GET  /api/investigate/:slug       — auto-investigation library (cached or full run)
 * POST /api/investigate/:slug/refresh — force refresh; optional SSE (Accept: text/event-stream)
 *
 * Note: POST /api/investigate (no slug) is the existing tap “typed search” in tap.js; these paths are different.
 */
import express from 'express';
import '../env.js';
import { pool } from '../db/pool.js';
import { investigate } from '../lib/auto_investigation.mjs';

const router = express.Router();

function decodeSlug(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

router.get('/investigate/:slug', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not configured.' });
  }
  const slug = decodeSlug(req.params.slug);
  if (!slug) {
    return res.status(400).json({ success: false, error: 'Invalid slug' });
  }
  const forceRefresh = String(req.query.forceRefresh || req.query.refresh || '') === 'true';
  try {
    const investigation = await investigate(slug, { forceRefresh });
    return res.json({
      success: true,
      investigation,
      from_cache: Boolean(investigation.from_cache),
    });
  } catch (err) {
    console.error('GET /api/investigate/:slug (library)', err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

router.post('/investigate/:slug/refresh', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not configured.' });
  }
  const slug = decodeSlug(req.params.slug);
  if (!slug) {
    return res.status(400).json({ success: false, error: 'Invalid slug' });
  }

  const wantSse = (req.get('Accept') || '').includes('text/event-stream');

  if (wantSse) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (obj) => {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    try {
      const investigation = await investigate(slug, {
        forceRefresh: true,
        onProgress: (msg) => send({ status: 'progress', ...msg }),
      });
      send({ status: 'complete', investigation, from_cache: false });
    } catch (err) {
      send({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return res.end();
  }

  try {
    const investigation = await investigate(slug, { forceRefresh: true });
    return res.json({ success: true, investigation, from_cache: false });
  } catch (err) {
    console.error('POST /api/investigate/:slug/refresh', err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
