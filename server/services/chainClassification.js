import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../db/pool.js';

const client = new Anthropic();
const MODEL =
  process.env.ANTHROPIC_CHAIN_MODEL ||
  process.env.ANTHROPIC_CITY_MODEL ||
  process.env.ANTHROPIC_VISION_MODEL ||
  'claude-sonnet-4-6';

/** @type {Map<string, { is_chain: boolean; confidence: number }>} */
const memoryCache = new Map();

export function normalizeBizName(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

async function readDbCache(key) {
  if (!pool) return null;
  try {
    const { rows } = await pool.query(
      `SELECT is_chain, confidence FROM chain_classifications WHERE name_normalized = $1 LIMIT 1`,
      [key]
    );
    if (!rows[0]) return null;
    return {
      is_chain: Boolean(rows[0].is_chain),
      confidence: Number(rows[0].confidence),
    };
  } catch {
    return null;
  }
}

async function writeDbCache(key, is_chain, confidence) {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO chain_classifications (name_normalized, is_chain, confidence, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (name_normalized) DO UPDATE
       SET is_chain = EXCLUDED.is_chain, confidence = EXCLUDED.confidence, updated_at = now()`,
      [key, is_chain, confidence]
    );
  } catch (e) {
    console.warn('[chainClassification] cache write', e?.message);
  }
}

/**
 * @param {string[]} names distinct business names
 * @returns {Promise<Map<string, { is_chain: boolean; confidence: number }>>} keyed by original name string
 */
export async function classifyIndependentCandidates(names) {
  const out = new Map();
  const unique = [...new Set((names || []).map((n) => String(n || '').trim()).filter(Boolean))];
  const toQuery = [];

  for (const name of unique) {
    const key = normalizeBizName(name);
    if (!key) continue;
    if (memoryCache.has(key)) {
      out.set(name, memoryCache.get(key));
      continue;
    }
    const db = await readDbCache(key);
    if (db) {
      memoryCache.set(key, db);
      out.set(name, db);
      continue;
    }
    toQuery.push(name);
  }

  if (toQuery.length === 0) return out;

  if (!process.env.ANTHROPIC_API_KEY) {
    for (const name of toQuery) {
      const fb = { is_chain: false, confidence: 0.55 };
      const key = normalizeBizName(name);
      memoryCache.set(key, fb);
      out.set(name, fb);
    }
    return out;
  }

  for (let i = 0; i < toQuery.length; i += 10) {
    const batch = toQuery.slice(i, i + 10);
    const classified = await classifyBatchWithClaude(batch);
    for (const row of classified) {
      const nm = row.name;
      if (!nm) continue;
      const is_chain = Boolean(row.is_chain);
      const confidence =
        typeof row.confidence === 'number' && Number.isFinite(row.confidence)
          ? Math.min(1, Math.max(0, row.confidence))
          : 0.5;
      const key = normalizeBizName(nm);
      const obj = { is_chain, confidence };
      memoryCache.set(key, obj);
      out.set(nm, obj);
      await writeDbCache(key, is_chain, confidence);
    }
    for (const name of batch) {
      if (!out.has(name)) {
        const key = normalizeBizName(name);
        const fb = { is_chain: false, confidence: 0.35 };
        memoryCache.set(key, fb);
        out.set(name, fb);
      }
    }
  }

  return out;
}

/**
 * @param {string[]} batch
 * @returns {Promise<Array<{ name: string; is_chain: boolean; confidence: number }>>}
 */
async function classifyBatchWithClaude(batch) {
  const list = batch.map((n) => `- ${n}`).join('\n');
  const msg = `You filter local business names for an "independent only" directory.

For EACH name below, decide if it is very likely a national/regional chain, franchise, or well-known corporate brand location (examples: McDonald's, Starbucks, Subway, Dollar General, Walgreens, Target — and obvious franchise signage patterns).

Return ONLY a JSON array, no markdown, no preamble. Shape:
[{"name":"exact string from list","is_chain":true or false,"confidence":0.0-1.0}]

Use is_chain true only when you are confident it is a chain/franchise/corporate brand. When unsure, is_chain false with confidence below 0.5.

Names:
${list}`;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: msg }],
    });
    const block = res.content?.[0];
    const text = block && block.type === 'text' ? block.text : '[]';
    let slice = text.trim();
    const fence = slice.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) slice = fence[1].trim();
    const parsed = JSON.parse(slice);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[chainClassification] Claude batch failed', e?.message);
    return [];
  }
}
