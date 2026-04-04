import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getDailyRotationMeta } from '../services/rotationTheme.js';

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

function fallbackPayload(city, state, country, rotation) {
  const place = [city, state].filter(Boolean).join(', ') || city || 'your area';
  return {
    headline: `${city || 'Local'} independents — ${rotation.rotation_theme.split(' — ')[1] || 'today'}`,
    subheading: `What makes ${place} worth supporting locally`,
    scene_description: `${place} changes with the day’s lens; today we spotlight ${rotation.rotation_theme.split(' — ')[1] || 'local life'} and where independents keep the city human-scaled.`,
    known_for: [],
    neighborhood_note: null,
    independent_tradition: `Independent businesses have long been part of ${place}'s economy.`,
    daily_rotation: {
      rotation_date: rotation.rotation_date,
      rotation_theme: rotation.rotation_theme,
    },
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
  const rotation = getDailyRotationMeta();
  const cacheKey = `${cityStr}-${stateStr}-${rotation.rotation_date}`.toLowerCase();

  if (cityCache.has(cacheKey)) {
    return res.json(cityCache.get(cacheKey));
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 900,
      messages: [
        {
          role: 'user',
          content: `You are generating a local identity card for the city of ${cityStr}${
            stateStr ? `, ${stateStr}` : ''
          }, ${country}.

This appears on the home screen of EthicalAlt — an app that helps people find independent local businesses instead of corporate chains.

## Today’s rotation (fixed for this UTC calendar day — everyone in this city sees the same lens today; tomorrow is different)
**Theme:** ${rotation.rotation_theme}

**Creative direction:** ${rotation.theme_prompt}

Your **headline** and **scene_description** must fully embody ONLY this theme — not a generic tourism paragraph. **known_for**, **subheading**, **neighborhood_note**, and **independent_tradition** should also lean into this lens while staying truthful.

When the theme fits, you may draw on authentic local detail (e.g. for Indianapolis: Vonnegut, Indy 500, Pacers, Mass Ave arts, maker culture) — only if accurate for ${cityStr}. If you know the place less well, stay regional and honest.

Generate a JSON object with this exact shape:

{
  "headline": string,
  "subheading": string,
  "scene_description": string,
  "known_for": string[],
  "neighborhood_note": string | null,
  "independent_tradition": string,
  "daily_rotation": {
    "rotation_date": "${rotation.rotation_date}",
    "rotation_theme": "${rotation.rotation_theme}"
  }
}

Rules:
- headline: 4–9 words. Evocative, title case; must match today’s theme (the UI may uppercase for display).
- subheading: 1 sentence; tied to the theme.
- scene_description: 2–3 sentences; concrete, theme-specific.
- known_for: 3–5 short phrases (aligned with theme).
- daily_rotation must use exactly the rotation_date and rotation_theme strings above (verbatim).

Return ONLY the JSON object. No markdown, no preamble.`,
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
      const out = {
        ...parsed,
        daily_rotation: {
          rotation_date: rotation.rotation_date,
          rotation_theme: rotation.rotation_theme,
        },
      };
      cityCache.set(cacheKey, out);
      return res.json(out);
    }

    const fb = fallbackPayload(cityStr, stateStr, country, rotation);
    cityCache.set(cacheKey, fb);
    res.json(fb);
  } catch (err) {
    console.error('City identity error:', err?.message || err);
    const fb = fallbackPayload(cityStr, stateStr, country, rotation);
    res.json(fb);
  }
});

export default router;
