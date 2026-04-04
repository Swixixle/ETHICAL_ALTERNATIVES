import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const VISION_MODEL = process.env.ANTHROPIC_VISION_MODEL || 'claude-sonnet-4-6';

const ALLOWED_CATEGORIES = new Set([
  'clothing',
  'food',
  'coffee',
  'books',
  'home_goods',
  'personal_care',
  'electronics',
  'tobacco',
  'tools',
  'other',
]);

function buildPrompt(tapX, tapY) {
  const px = Math.round(tapX * 100);
  const py = Math.round(tapY * 100);
  return `You are a product identification expert.
The user tapped at approximately ${px}% from the left and ${py}% from the top of this image.

Identify the object at that position as specifically as possible.

Requirements:
1. Most specific product / brand / model visible at the tap.
2. Name the brand if identifiable; name product line / model if identifiable.
3. Extract attributes useful for finding alternatives: clothing (cut, material, color, style); food/drink (brand, product, type); electronics (make, model); tobacco (brand, type, set health implications); otherwise concise descriptors in specifications.
4. Guess corporate parent of the brand when reasonably known, else null.
5. search_keywords: a short phrase (4–8 words) for marketplace / indie search — NO brand names or trademarked product names.
6. health_flag: true for tobacco/vape, high-risk consumables, or when documented health angles are central; else false.

You MUST reply with valid JSON only (no markdown, no prose):
{"object":"","brand":null,"product_line":null,"specifications":{},"corporate_parent":null,"category":"other","search_keywords":"","confidence":0,"confidence_notes":"","health_flag":false}

category must be exactly one of: clothing, food, coffee, books, home_goods, personal_care, electronics, tobacco, tools, other.
confidence is 0..1.`;
}

/** @param {string} text */
function parseIdentificationJson(text) {
  const trimmed = text?.trim?.() || '';
  let slice = trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) slice = fence[1].trim();

  try {
    const obj = JSON.parse(slice);
    return normalizeIdentification(obj);
  } catch {
    return salvageIdentification(trimmed);
  }
}

function normalizeIdentification(obj) {
  const category = ALLOWED_CATEGORIES.has(obj?.category) ? obj.category : 'other';
  return {
    object: typeof obj.object === 'string' ? obj.object : 'Unknown object',
    brand: obj.brand == null || obj.brand === '' ? null : String(obj.brand),
    product_line: obj.product_line == null || obj.product_line === '' ? null : String(obj.product_line),
    specifications:
      obj.specifications && typeof obj.specifications === 'object' && !Array.isArray(obj.specifications)
        ? obj.specifications
        : {},
    corporate_parent:
      obj.corporate_parent == null || obj.corporate_parent === '' ? null : String(obj.corporate_parent),
    category,
    search_keywords: typeof obj.search_keywords === 'string' ? obj.search_keywords : '',
    confidence: typeof obj.confidence === 'number' ? Math.max(0, Math.min(1, obj.confidence)) : 0,
    confidence_notes: typeof obj.confidence_notes === 'string' ? obj.confidence_notes : '',
    health_flag: Boolean(obj.health_flag),
  };
}

function salvageIdentification(text) {
  const objectMatch = text.match(/"object"\s*:\s*"([^"]*)"/);
  const catMatch = text.match(/"category"\s*:\s*"([^"]*)"/);
  const cat = catMatch?.[1] && ALLOWED_CATEGORIES.has(catMatch[1]) ? catMatch[1] : 'other';
  return {
    object: objectMatch?.[1] || 'Unknown object',
    brand: null,
    product_line: null,
    specifications: {},
    corporate_parent: null,
    category: cat,
    search_keywords: '',
    confidence: 0.25,
    confidence_notes: 'Could not parse full model output; please retake or tap again.',
    health_flag: cat === 'tobacco',
  };
}

/**
 * @param {string} imageBase64 — raw base64 JPEG (no data URL prefix)
 * @param {number} tapX
 * @param {number} tapY
 */
export async function identifyObject(imageBase64, tapX, tapY) {
  const message = await client.messages.create({
    model: VISION_MODEL,
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: buildPrompt(tapX, tapY),
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  const text = textBlock?.type === 'text' ? textBlock.text : '';
  return parseIdentificationJson(text);
}
