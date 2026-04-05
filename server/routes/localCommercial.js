import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic();

const commercialCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

const MODEL =
  process.env.ANTHROPIC_LOCAL_COMMERCIAL_MODEL ||
  process.env.ANTHROPIC_VISION_MODEL ||
  'claude-sonnet-4-6';

function cacheKey(city, state, seed) {
  return `${String(city).toLowerCase()}-${String(state || '').toLowerCase()}-${seed % 10}`;
}

const SEED_HOOKS = {
  0: 'person-first: open with the most remarkable individual connected to this place',
  1: 'person-first: open with someone who left and came back, or never left when others did',
  2: 'person-first: open with an immigrant, outsider, or unlikely founder',
  3: 'place-first: open with the most specific physical structure — a building, a corner, a crossroads',
  4: 'place-first: open with a business that defied the economic gravity that killed its neighbors',
  5: 'place-first: open with the downtown as it exists right now — honest, not nostalgic',
  6: 'land-first: open with the geology, terrain, or watershed that determined everything else',
  7: 'land-first: open with what the land was before the town existed',
  8: 'land-first: open with agriculture — what the soil grows and why',
  9: 'near-extinction-first: open with the thing that almost ended',
};

function normSeed(raw) {
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n)) return 0;
  return ((n % 10) + 10) % 10;
}

function extractText(message) {
  const parts = [];
  for (const block of message.content || []) {
    if (block.type === 'text' && block.text) parts.push(block.text);
  }
  return parts.join('\n').trim();
}

/**
 * Web search turns may pause for tool results — mirror investigation loop.
 * @param {string} userPrompt
 */
async function runCommercialAnthropicTurn(userPrompt) {
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }];
  const userMessage = { role: 'user', content: userPrompt };
  let messages = [userMessage];
  const maxSteps = 20;
  let lastResponse = null;

  for (let step = 0; step < maxSteps; step++) {
    const params = {
      model: MODEL,
      max_tokens: 4096,
      messages,
      tools,
    };

    lastResponse = await anthropic.messages.create(params);
    const blockTypes = (lastResponse.content || []).map((b) => b.type).join(', ');
    console.log(
      `[local-commercial] step ${step + 1} stop_reason=${lastResponse.stop_reason} blocks=[${blockTypes}]`
    );

    const sr = lastResponse.stop_reason;
    if (sr === 'end_turn' || sr === 'max_tokens') break;

    if (sr === 'pause_turn') {
      messages.push({ role: 'assistant', content: lastResponse.content });
      continue;
    }

    if (sr === 'tool_use') {
      messages.push({ role: 'assistant', content: lastResponse.content });
      const toolResults = [];
      for (const block of lastResponse.content || []) {
        if (block.type === 'tool_use') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content:
              'Continue research. Return ONLY valid JSON per the schema in the user message — no markdown.',
          });
        }
      }
      if (toolResults.length) {
        messages.push({ role: 'user', content: toolResults });
      } else {
        messages.push({
          role: 'user',
          content: 'Continue and return only the JSON object requested.',
        });
      }
      continue;
    }

    console.warn(`[local-commercial] unhandled stop_reason=${sr}`);
    break;
  }

  return lastResponse;
}

function parseCommercialJson(text) {
  const trimmed = String(text || '').trim();
  let slice = trimmed.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try {
    return JSON.parse(slice);
  } catch {
    const match = slice.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function fallbackPayload(city, state, seed) {
  const cityStr = String(city || 'This town');
  return {
    city: cityStr,
    state: state || null,
    seed,
    city_tagline: `${cityStr}. Worth the exit.`,
    slides: [
      {
        index: 1,
        visual_direction: `Wide establishing shot of downtown ${cityStr}`,
        headline: cityStr.toUpperCase(),
        voice_line: `${cityStr}. A town with a story worth finding.`,
        mood: 'quiet presence',
        music_direction: 'Single piano note, sustained',
      },
    ],
    visit_reason: `Independent businesses and local history in ${cityStr}.`,
    honest_note: null,
    current_independents: [],
    sources: [],
    error: 'Research pending — try again for full commercial',
    generated_at: new Date().toISOString(),
  };
}

/** POST /api/local-commercial */
router.post('/', async (req, res) => {
  const body = req.body || {};
  const cityRaw = typeof body.city === 'string' ? body.city.trim() : '';
  if (!cityRaw) {
    return res.status(400).json({ error: 'city required' });
  }

  const state = typeof body.state === 'string' ? body.state.trim() : null;
  const lat = body.lat != null && Number.isFinite(Number(body.lat)) ? Number(body.lat) : null;
  const lng = body.lng != null && Number.isFinite(Number(body.lng)) ? Number(body.lng) : null;
  const seed = normSeed(body.rotation_seed ?? 0);
  const key = cacheKey(cityRaw, state, seed);

  const cached = commercialCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return res.json(cached.data);
  }

  const locationStr = [cityRaw, state].filter(Boolean).join(', ');
  const coordNote = lat != null && lng != null ? `GPS: ${lat}, ${lng}` : '';

  const userPrompt = `You are generating a 6-8 slide documentary commercial for ${locationStr}. ${coordNote}

NARRATIVE HOOK (seed ${seed}): ${SEED_HOOKS[seed]}

MANDATORY RESEARCH — use web search:
1. One specific primary-source story: real names, real dates
2. A geological, ecological, or Indigenous land fact
3. Something that nearly vanished but survived
4. A structural or geographic feature that shaped this town
5. 2-3 current independent businesses with real names
6. One uncomfortable historical fact if documented — do not omit

TONE: Documentary. Archival. No tourism copy. No "charming" or "quaint."
Voice lines sound like Errol Morris, not a CVB brochure.

Return ONLY valid JSON — no markdown, no preamble:

{
  "city_tagline": "5-8 words, specific, no adjectives like charming or quaint",
  "slides": [
    {
      "index": 1,
      "visual_direction": "precise camera shot description",
      "headline": "max 8 words, declarative",
      "voice_line": "1-3 sentences, archival documentary tone",
      "mood": "two-word clinical descriptor",
      "music_direction": "instrumental only, e.g. single cello note"
    }
  ],
  "visit_reason": "one factual sentence on why to exit the highway here",
  "honest_note": "one sentence on a complicated truth, or null",
  "current_independents": [
    { "name": "string", "description": "one sentence", "address": "string or null" }
  ],
  "sources": ["citations"]
}

Rules:
- Every slide must reference a specific verified fact about ${locationStr}
- No slide could describe any other town
- honest_note is mandatory if uncomfortable history is documented
- Return ONLY the JSON object`;

  if (!process.env.ANTHROPIC_API_KEY) {
    const fb = fallbackPayload(cityRaw, state, seed);
    delete fb.error;
    fb.sources = [];
    return res.json(fb);
  }

  try {
    const message = await runCommercialAnthropicTurn(userPrompt);
    const text = extractText(message);
    if (!text) throw new Error('Empty response');

    let parsed = parseCommercialJson(text);
    if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      throw new Error('Invalid or empty slides in response');
    }

    const result = {
      city: cityRaw,
      state,
      seed,
      generated_at: new Date().toISOString(),
      city_tagline: parsed.city_tagline || `${cityRaw}. Worth the exit.`,
      slides: parsed.slides,
      visit_reason: parsed.visit_reason || `Independent businesses and local history in ${cityRaw}.`,
      honest_note: parsed.honest_note ?? null,
      current_independents: Array.isArray(parsed.current_independents)
        ? parsed.current_independents
        : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    };

    commercialCache.set(key, { data: result, expires: Date.now() + CACHE_TTL });
    res.json(result);
  } catch (err) {
    console.error('[local-commercial]', err?.message || err);
    const fb = fallbackPayload(cityRaw, state, seed);
    res.json(fb);
  }
});

export default router;
