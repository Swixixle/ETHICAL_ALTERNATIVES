import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import {
  geminiVisionCompletion,
  recordProviderFailure,
  recordProviderSuccess,
} from './aiProvider.js';

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

const ID_METHODS = new Set(['direct_logo', 'partial_logo', 'product_recognition', 'scene_inference']);

/**
 * Tight square crop centered on tap. 20% of shorter side, min 150px, clamped to image bounds.
 * @param {string} imageBase64
 * @param {number} tapX
 * @param {number} tapY
 * @returns {Promise<string>} JPEG base64
 */
export async function generateTapCrop(imageBase64, tapX, tapY) {
  const buf = Buffer.from(imageBase64, 'base64');
  const meta = await sharp(buf).metadata();
  const w = meta.width;
  const h = meta.height;
  if (!w || !h) {
    throw new Error('Could not read image dimensions');
  }

  const shorter = Math.min(w, h);
  let side = Math.max(150, Math.round(shorter * 0.2));
  side = Math.min(side, w, h);

  const cx = tapX * w;
  const cy = tapY * h;
  const half = side / 2;
  let left = Math.round(cx - half);
  let top = Math.round(cy - half);

  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (left + side > w) left = Math.max(0, w - side);
  if (top + side > h) top = Math.max(0, h - side);

  const width = Math.min(side, w - left);
  const height = Math.min(side, h - top);

  const cropped = await sharp(buf)
    .extract({ left, top, width, height })
    .jpeg({ quality: 90 })
    .toBuffer();

  return cropped.toString('base64');
}

/**
 * Exact crop from normalized bounding box (fractions of full image width/height).
 * @param {string} imageBase64
 * @param {{ x: number, y: number, width: number, height: number }} box
 */
export async function generateSelectionBoxCrop(imageBase64, box) {
  const buf = Buffer.from(imageBase64, 'base64');
  const meta = await sharp(buf).metadata();
  const w = meta.width;
  const h = meta.height;
  if (!w || !h) {
    throw new Error('Could not read image dimensions');
  }

  let left = Math.round(Number(box.x) * w);
  let top = Math.round(Number(box.y) * h);
  let width = Math.round(Number(box.width) * w);
  let height = Math.round(Number(box.height) * h);

  left = Math.max(0, Math.min(left, w - 1));
  top = Math.max(0, Math.min(top, h - 1));
  width = Math.max(1, Math.min(width, w - left));
  height = Math.max(1, Math.min(height, h - top));

  const cropped = await sharp(buf)
    .extract({ left, top, width, height })
    .jpeg({ quality: 90 })
    .toBuffer();

  return cropped.toString('base64');
}

function buildVisionPrompt(tapX, tapY, userDrawnRegion) {
  const px = Math.round(tapX * 100);
  const py = Math.round(tapY * 100);
  const intro = userDrawnRegion
    ? `The user drew a freehand highlight around exactly what they meant in the
FIRST image (full scene). The SECOND image is the precise rectangular crop of that
highlight — use it as the primary subject. The full image is context only.`
    : `The user tapped at ${px}% from left, ${py}% from top of the
FIRST image (full scene). The SECOND image is a tight crop centered exactly on
that tap point.`;

  return `You are a precise brand and product identification system.

${intro}

PRIMARY RULE: Identify what is in the CROP IMAGE. The crop shows exactly what
the user intended. The full image provides context only.

Even if the object in the crop is small, partially obscured, or in the
background — it is what the user indicated. Prioritize it over any more visually
prominent object in the full scene.

Identify at maximum specificity:
- Brand name (Adidas, Doritos, Speedway — even if the logo is small)
- Product line if visible (Doritos Cool Ranch, Adidas Trefoil, etc.)
- If a logo is partially visible, reason about brand from visible elements:
  colors, shapes, typography, partial text
- Read any TEXT printed on packaging in the crop (spellings, slogans, flavor names).
  Use readable package text to identify the product BEFORE relying on logo shape alone.
  Prioritize text-based identification when words clearly name a brand or product (e.g. GOLDFISH, OREO).
- If no clear product/brand is in the crop, infer from SCENE CONTEXT:
  store layout, shelving, signage style, color palette, architectural elements

Return JSON only (no markdown, no prose):
{
  "object": string,
  "brand": string | null,
  "product_line": string | null,
  "specifications": object,
  "corporate_parent": string | null,
  "category": string,
  "search_keywords": string,
  "confidence": number,
  "confidence_notes": string,
  "health_flag": boolean,
  "identification_method": "direct_logo" | "partial_logo" | "product_recognition" | "scene_inference",
  "scene_context": string | null,
  "visible_text": string | null,
  "text_based_identification": boolean
}

identification_method values:
- "direct_logo": brand logo clearly visible and readable in crop
- "partial_logo": brand inferred from partial logo, colors, or typography
- "product_recognition": product identified by packaging, shape, or design
- "scene_inference": brand inferred from store/environment context

category must be exactly one of: clothing, food, coffee, books, home_goods, personal_care, electronics, tobacco, tools, other.
search_keywords: short phrase (4–8 words) for marketplace search — NO brand names or trademarked product names.
confidence is 0..1.

STREET AND SCENE IDENTIFICATION RULES:

When the image contains a busy scene, street, mall, grocery store, or any
environment with multiple brands:

1. SHOPPING BAGS: Identify from color, handle style, logo shape.
   Use the shopping bag color guide: Tiffany=robin's egg blue, Hermès=orange,
   Whole Foods=dark green, Target=red, Apple=white, Louis Vuitton=brown LV monogram.

2. STOREFRONTS: Identify from signage color, font, logo fragment, storefront
   design. Use: McDonald's=red+yellow arches, Starbucks=green siren,
   Walmart=blue+yellow spark, Apple=minimalist all-glass, CVS=red pharmacy.

3. CLOTHING ON PEOPLE: Look for logos at chest, sleeve, waistband.
   Nike=swoosh (curved checkmark), Adidas=three stripes OR trefoil,
   Ralph Lauren=polo player on horse, Supreme=red box with white text,
   Lacoste=small green crocodile, Gucci=interlocking GG, North Face=arc logo.

4. GAS STATIONS: Speedway=red+yellow chevron, Shell=yellow+red scallop,
   BP=green+yellow sunburst, Chevron=blue+red V, Exxon=red+blue oval.

5. PARTIAL SIGNAGE: If only part of a sign is visible, reason from color
   palette, letter forms, and adjacent context (drive-through=fast food,
   fuel pumps=gas station, pharmacy cross=CVS/Walgreens).

6. CORPORATE BUILDINGS: Apple stores are all-glass minimalist.
   McDonald's has red/yellow exterior. Starbucks has green awning.

7. PRODUCTS AT DISTANCE: Identify from packaging color+shape even if text
   is unreadable: Tide=orange, Coca-Cola=red can/bottle, Pepsi=blue+red,
   Heinz=red with label, Doritos=distinctive triangle bag.

For any scene-inferred identification:
- Set identification_method: "scene_inference" or "partial_logo"
- Set confidence accurately
- Explain reasoning in confidence_notes`;
}

/**
 * Full-scene brand / logo inventory for low-confidence taps.
 * @param {string} imageBase64 — raw base64 JPEG (no data URL prefix)
 */
export async function inventoryScene(imageBase64) {
  const prompt = `Analyze this image. List every identifiable brand, product, logo, or corporate entity visible anywhere in the image.

Return ONLY a valid JSON array. No comments, no markdown.

Each item:
{
  "brand": string,
  "location_description": string (e.g. "top-left", "center", "background-right"),
  "approximate_x_percent": number (0-100),
  "approximate_y_percent": number (0-100),
  "confidence": number (0-1),
  "identification_basis": "direct logo" | "partial logo" | "color+context" | "architecture"
}

Include sightings with confidence above 0.3. This is a discovery pass — find everything.`;

  try {
    const response = await client.messages.create({
      model: VISION_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const text = textBlock?.type === 'text' ? textBlock.text : '[]';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('inventoryScene error:', err.message);
    return [];
  }
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
  const methodRaw = typeof obj?.identification_method === 'string' ? obj.identification_method : '';
  const identification_method = ID_METHODS.has(methodRaw) ? methodRaw : 'product_recognition';

  const scene_context =
    obj.scene_context == null || obj.scene_context === '' ? null : String(obj.scene_context);

  const visible_text =
    obj.visible_text == null || obj.visible_text === '' ? null : String(obj.visible_text);
  const text_based_identification = Boolean(obj.text_based_identification);

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
    identification_method,
    scene_context,
    visible_text,
    text_based_identification,
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
    identification_method: 'partial_logo',
    scene_context: null,
    visible_text: null,
    text_based_identification: false,
  };
}

const SCENE_CONTEXT_PROMPT = `Analyze this scene image. Identify:

1. What type of environment is this? (convenience store, gas station, restaurant,
   clothing store, home, party, street, etc.)

2. What brands or corporations are most likely present based on:
   - Store layout and shelving style
   - Color palette and signage design language
   - Architectural elements and flooring
   - Product category mix visible
   - Any partially visible logos or text

3. For each likely brand: confidence level and reasoning

Return JSON only:
{
  "environment_type": string,
  "likely_brands": [
    {
      "brand": string,
      "confidence": "high" | "medium" | "low",
      "reasoning": string
    }
  ]
}

Example reasoning: "Red and yellow chevron signage visible, fuel pumps through
window, fountain drink station layout matches Speedway convenience store design"`;

/** @param {string} text */
function parseSceneContextJson(text) {
  const trimmed = text?.trim?.() || '';
  let slice = trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) slice = fence[1].trim();
  try {
    const obj = JSON.parse(slice);
    return {
      environment_type: typeof obj.environment_type === 'string' ? obj.environment_type : '',
      likely_brands: Array.isArray(obj.likely_brands) ? obj.likely_brands : [],
    };
  } catch {
    return { environment_type: '', likely_brands: [] };
  }
}

/**
 * Second pass: environment / chain inference from full scene.
 * @param {string} imageBase64
 */
export async function inferSceneContext(imageBase64) {
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
          { type: 'text', text: SCENE_CONTEXT_PROMPT },
        ],
      },
    ],
  });
  const textBlock = message.content.find((b) => b.type === 'text');
  const text = textBlock?.type === 'text' ? textBlock.text : '';
  return parseSceneContextJson(text);
}

/** @param {object} id normalized identification */
function mergeSceneInference(id, scene) {
  if (!scene?.likely_brands?.length) return id;
  const high = scene.likely_brands.find((b) => b.confidence === 'high');
  if (!high?.brand) return id;
  const weakBrand = !id.brand || id.identification_method === 'scene_inference';
  if (!weakBrand) return id;
  const reason = typeof high.reasoning === 'string' ? high.reasoning : '';
  const env = scene.environment_type ? String(scene.environment_type) : '';
  return {
    ...id,
    brand: high.brand,
    corporate_parent: id.corporate_parent || high.brand,
    object: id.object && id.object !== 'Unknown object' ? id.object : high.brand,
    identification_method: 'scene_inference',
    scene_context: id.scene_context || reason || (env ? `Environment: ${env}` : null),
    confidence: Math.max(id.confidence, 0.55),
    confidence_notes:
      id.confidence_notes ||
      [env && `Environment: ${env}`, reason && `Scene inference: ${reason}`].filter(Boolean).join(' · ') ||
      'Inferred from scene context.',
  };
}

/**
 * @param {string} imageBase64 — raw base64 JPEG (no data URL prefix)
 * @param {number} tapX
 * @param {number} tapY
 * @param {{ x: number, y: number, width: number, height: number } | null} [selectionBox] normalized 0–1
 */
export async function identifyObject(imageBase64, tapX, tapY, selectionBox = null) {
  const hasBox =
    selectionBox &&
    typeof selectionBox === 'object' &&
    [selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height].every((n) =>
      Number.isFinite(Number(n))
    ) &&
    Number(selectionBox.width) > 0 &&
    Number(selectionBox.height) > 0;

  const cropBase64 = hasBox
    ? await generateSelectionBoxCrop(imageBase64, {
        x: Number(selectionBox.x),
        y: Number(selectionBox.y),
        width: Number(selectionBox.width),
        height: Number(selectionBox.height),
      })
    : await generateTapCrop(imageBase64, tapX, tapY);

  const promptText = buildVisionPrompt(tapX, tapY, Boolean(hasBox));
  let text = '';
  let visionProvider = 'claude';

  try {
    const message = await client.messages.create({
      model: VISION_MODEL,
      max_tokens: 1600,
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
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: cropBase64,
              },
            },
            {
              type: 'text',
              text: promptText,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    text = textBlock?.type === 'text' ? textBlock.text : '';
    recordProviderSuccess('claude');
  } catch (e) {
    console.warn('[vision] Claude vision failed, trying Gemini:', e?.message || e);
    recordProviderFailure('claude');
    visionProvider = 'gemini';
    try {
      text = await geminiVisionCompletion(imageBase64, cropBase64, promptText);
    } catch (e2) {
      console.error('[vision] Gemini vision failed:', e2?.message || e2);
      recordProviderFailure('gemini');
      throw e2;
    }
  }

  let merged = parseIdentificationJson(text);

  if (merged.identification_method === 'scene_inference' || merged.confidence < 0.6) {
    try {
      const scene = await inferSceneContext(imageBase64);
      merged = mergeSceneInference(merged, scene);
    } catch (e) {
      console.warn('inferSceneContext failed', e?.message || e);
    }
  }

  return { ...merged, crop_base64: cropBase64, vision_provider: visionProvider };
}
