import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { cityNarrativeCache } from '../services/cacheStore.js';

const router = Router();
const anthropic = new Anthropic();

const MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_TIMEOUT_MS = 6000;

const SYSTEM = `You are a brief, evocative writer for EthicalAlt — an ethical shopping investigation app. When given a city and state, write a SHORT narrative fact about that place: something about its economic history, a notable industry that shaped it, a labor movement, an environmental story, a famous local business or person — something true, specific, and surprising. Never generic. Never tourist-copy. Write for someone who is about to investigate a corporation they just photographed.

Return ONLY a JSON object with two fields:
- headline: 6 words maximum, all caps, punchy
- body: 2-3 sentences maximum, 40-60 words, factual and evocative

Example output:
{"headline": "WHERE STEEL BUILT EVERYTHING TWICE", "body": "Pittsburgh smelted the steel that built the Brooklyn Bridge and then rebuilt itself after the mills closed. Today 68% of its storefronts are independent — one of the highest rates of any post-industrial American city."}`;

function parseNarrativeJson(text) {
  const trimmed = String(text || '').trim();
  let slice = trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) slice = fence[1].trim();
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function fallbackPayload(city) {
  const c = typeof city === 'string' ? city.trim() : '';
  return {
    headline: c ? c.toUpperCase() : 'YOUR AREA',
    body: 'Every place has a story. Every purchase is part of it.',
  };
}

function extractText(message) {
  const parts = [];
  for (const block of message.content || []) {
    if (block.type === 'text' && block.text) parts.push(block.text);
  }
  return parts.join('\n').trim();
}

/** POST / (mounted at /api/city-narrative) */
router.post('/', async (req, res) => {
  const { city, state } = req.body || {};
  const cityStr = typeof city === 'string' ? city.trim() : '';
  if (!cityStr) {
    return res.status(400).json({ error: 'city required' });
  }

  const statePart =
    state == null || state === ''
      ? ''
      : typeof state === 'string'
        ? state.trim()
        : String(state);
  const userMsg = `City: ${cityStr}, State: ${statePart || '(none)'}`;

  const cacheKey = `${(cityStr || '').toLowerCase().trim()}:${(statePart || '').toLowerCase().trim()}`;
  const cached = cityNarrativeCache.get(cacheKey);
  if (cached) {
    console.log(`[cityNarrative] cache hit: ${cacheKey}`);
    return res.json(cached);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    const fb = fallbackPayload(cityStr);
    cityNarrativeCache.set(cacheKey, { headline: fb.headline, body: fb.body });
    return res.json(fb);
  }

  try {
    const response = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }],
      },
      { timeout: ANTHROPIC_TIMEOUT_MS }
    );

    const text = extractText(response);
    const parsed = parseNarrativeJson(text);
    if (
      parsed &&
      typeof parsed.headline === 'string' &&
      typeof parsed.body === 'string' &&
      parsed.headline.trim() &&
      parsed.body.trim()
    ) {
      const payload = {
        headline: parsed.headline.trim(),
        body: parsed.body.trim(),
      };
      cityNarrativeCache.set(cacheKey, { headline: payload.headline, body: payload.body });
      return res.json(payload);
    }

    const fb = fallbackPayload(cityStr);
    cityNarrativeCache.set(cacheKey, { headline: fb.headline, body: fb.body });
    return res.json(fb);
  } catch (err) {
    console.error('[city-narrative]', err?.message || err);
    const fb = fallbackPayload(cityStr);
    cityNarrativeCache.set(cacheKey, { headline: fb.headline, body: fb.body });
    return res.json(fb);
  }
});

export default router;
