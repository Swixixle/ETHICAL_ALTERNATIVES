import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic();

const MODEL =
  process.env.ANTHROPIC_DOCUMENTARY_MODEL ||
  process.env.ANTHROPIC_VISION_MODEL ||
  'claude-sonnet-4-6';

const SYSTEM = `You are the narrator of a short investigative documentary. In 90–150 words, describe the user's city and state as it relates to the company they are about to investigate. Cover: what the company's physical or economic presence is in this city or region, any local incidents, local news coverage, or community impact specific to this area, and a sentence that bridges to the investigation they are about to see. Write in second person: 'You are in [city]...' Tone: calm, factual, Edward R. Murrow. No bullet points. No headers. Flowing prose. End with a natural transition to the investigation. Do not mention that this is AI-generated.`;

function sendSse(res, data) {
  res.write(`data: ${data}\n\n`);
}

/** POST / (mounted at /api/documentary) — SSE stream of narration tokens */
router.post('/', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
    return;
  }

  const { city, state, brand_name, brand_slug } = req.body || {};
  const cityStr = typeof city === 'string' ? city.trim() : '';
  const stateStr = typeof state === 'string' ? state.trim() : '';
  const brandName =
    typeof brand_name === 'string' && brand_name.trim()
      ? brand_name.trim()
      : 'the company you are investigating';
  const brandSlug = typeof brand_slug === 'string' && brand_slug.trim() ? brand_slug.trim() : 'unknown';

  if (!cityStr) {
    res.status(400).json({ error: 'city required' });
    return;
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const place = [cityStr, stateStr].filter(Boolean).join(', ');
  const userMsg = `User location: ${place}
Company being investigated: ${brandName} (slug: ${brandSlug})
Generate the documentary narration now.`;

  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 900,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const piece = event.delta.text;
        if (piece) sendSse(res, JSON.stringify(piece));
      }
    }
    sendSse(res, JSON.stringify('[DONE]'));
  } catch (e) {
    console.error('[documentary]', e);
    const msg = e instanceof Error ? e.message : 'stream failed';
    sendSse(res, JSON.stringify(`\n\n[Error: ${msg}]`));
    sendSse(res, JSON.stringify('[DONE]'));
  } finally {
    res.end();
  }
});

export default router;
