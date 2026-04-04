import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic();

const MODEL =
  process.env.ANTHROPIC_CITY_MODEL ||
  process.env.ANTHROPIC_VISION_MODEL ||
  'claude-sonnet-4-6';

const cityCache = new Map();

function parseIdentityJson(text) {
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

function fallbackPayload(city, state, country) {
  const place = [city, state].filter(Boolean).join(', ') || city || 'your area';
  return {
    headline: `${city || 'Local'}'s independent businesses`,
    subheading: `What makes ${place} worth supporting locally`,
    scene_description: `${place} has a community of independent makers, restaurants, and shops worth finding.`,
    known_for: [],
    neighborhood_note: null,
    independent_tradition: `Independent businesses have long been part of ${place}'s economy.`,
  };
}

/** POST /api/city-identity */
router.post('/', async (req, res) => {
  const { city, state, country = 'US' } = req.body || {};
  const cityStr = typeof city === 'string' ? city.trim() : '';
  if (!cityStr) {
    return res.status(400).json({ error: 'city required' });
  }

  const stateStr = typeof state === 'string' ? state.trim() : '';
  const cacheKey = `${cityStr}-${stateStr}`.toLowerCase();
  if (cityCache.has(cacheKey)) {
    return res.json(cityCache.get(cacheKey));
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `You are generating a local identity card for the city of ${cityStr}${stateStr ? `, ${stateStr}` : ''}, ${country}.

This will appear on the home screen of EthicalAlt — an app that helps people find independent local businesses instead of corporate chains.

Generate a JSON object with this exact shape:

{
  "headline": string,
  "subheading": string,
  "scene_description": string,
  "known_for": string[],
  "neighborhood_note": string | null,
  "independent_tradition": string
}

headline: 4-8 words. Evocative, specific to this city's independent culture — NOT generic tourism.
subheading: 1 sentence on what the independent business culture actually looks like.
scene_description: 2-3 sentences. Mention real neighborhoods or regional characteristics where possible.
known_for: 3-5 short phrases (local food, craft, culture).
neighborhood_note: 1 sentence on where to find independents, or null if rural/suburban with no clear district.
independent_tradition: 1 sentence on history or resilience of local business — honest.

Return ONLY the JSON object. No markdown, no preamble.
Be specific to this place. If you know little about it, say so briefly and focus on the region.`,
        },
      ],
    });

    const text = response.content?.[0]?.type === 'text' ? response.content[0].text : '';
    const parsed = parseIdentityJson(text);
    if (
      parsed &&
      typeof parsed.headline === 'string' &&
      typeof parsed.scene_description === 'string'
    ) {
      cityCache.set(cacheKey, parsed);
      return res.json(parsed);
    }

    const fb = fallbackPayload(cityStr, stateStr, country);
    cityCache.set(cacheKey, fb);
    res.json(fb);
  } catch (err) {
    console.error('City identity error:', err?.message || err);
    res.json(fallbackPayload(cityStr, stateStr, country));
  }
});

export default router;
