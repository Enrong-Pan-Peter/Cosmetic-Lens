/**
 * Vision OCR for cosmetic product labels.
 *
 * Pipeline:
 *   image (data URL) → OpenAI vision model → JSON object →
 *     { ingredients[], rawText, productName, confidence, warnings, language }
 *
 * Returned object is suitable for autofilling the chat composer; the user
 * still reviews + sends, so we err on the side of low-confidence rather than
 * inventing ingredients.
 *
 * The OpenAI Chat Completions API supports image_url parts in the user
 * message when the model is multimodal (gpt-4o-mini, gpt-4.1-mini, etc.).
 * We always request JSON mode so we don't need a brittle regex parser.
 */

import { buildModelParams } from './model-params';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type VisionConfidence = 'high' | 'medium' | 'low' | 'unreadable';

export interface VisionExtractionResult {
  /** Whether the photo shows a cosmetic/skincare product. */
  isCosmetic: boolean;
  /** Short description of whatever is in the photo (any subject). */
  description: string;
  ingredients: string[];
  rawText: string;
  productName: string | null;
  productType: string | null;
  confidence: VisionConfidence;
  warnings: string[];
  language: 'en' | 'zh' | 'other';
}

export interface VisionExtractionFailure {
  success: false;
  error: string;
  code:
    | 'api_key_missing'
    | 'api_error'
    | 'invalid_response'
    | 'unreadable'
    | 'network_error';
}

export interface VisionExtractionSuccess {
  success: true;
  data: VisionExtractionResult;
  model: string;
}

export type VisionExtractionResponse =
  | VisionExtractionSuccess
  | VisionExtractionFailure;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Vision OCR needs a proven multimodal model, which is a separate concern from
// the chat model (chat runs on gpt-5.6-luna). A 2026-07 swap briefly set this to
// a text model and that broke photo extraction, so OCR is pinned to the image
// models the app has always used.
const VISION_MODEL_PRIMARY = 'gpt-4o-mini';
const VISION_MODEL_FALLBACK = 'gpt-4.1-mini';

/** Hard upper bound on what we send to OpenAI (independent of API endpoint). */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

/** Whitelist of mime types we accept. iOS Safari converts HEIC → JPEG on upload. */
export const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a vision assistant. You identify what is shown in a photo. Your specialty is cosmetic and skincare products, but you can recognize anything.

Return ONLY a JSON object matching this schema:

{
  "isCosmetic": boolean,        // true if the photo shows a cosmetic or skincare product (or its box/label); false for anything else
  "description": string,        // A short description (max ~12 words) of what is in the photo, whatever it is (e.g. "a can of lager beer", "a green skincare tube")
  "ingredients": [string],     // INCI names from the "Ingredients"/"成分"/"全成分" section, in order — ONLY if visible AND this is a cosmetic; otherwise []
  "rawText": string,            // Readable text on the item: brand, name, and any key claims (preserve line breaks with \\n)
  "productName": string | null, // Brand + product name if it is a cosmetic you can identify, else null
  "productType": string | null, // Short category if cosmetic (e.g. "hand cream", "cleanser", "sunscreen", "lipstick"), else null
  "confidence": "high" | "medium" | "low" | "unreadable",
  "warnings": [string],
  "language": "en" | "zh" | "other"
}

Rules:
- ALWAYS fill "description" with what you actually see, whether or not it is a cosmetic.
- Set isCosmetic = true for skincare/cosmetic products and their packaging (creams, serums, cleansers, sunscreens, makeup, etc.); false for everything else (food, drinks, electronics, animals, people, scenery, documents).
- Fill productName, productType, and ingredients ONLY when isCosmetic is true. Fill "ingredients" only from an actual ingredient section; never invent ingredients or treat marketing text as ingredients.
- Keep printed text in its original language. Do not translate product names or ingredients.
- Preserve ingredient order (INCI lists are concentration-ordered).
- confidence describes how clearly you can see the subject, NOT whether it is a cosmetic. A clear photo of a non-cosmetic is still "high"/"medium" with isCosmetic=false. Use "unreadable" ONLY when the image is blank, empty, or too blurry to tell what it is.
- Output JSON ONLY. No markdown code fences. No commentary.`;

function buildUserInstruction(language: 'en' | 'zh'): string {
  const descLang = language === 'zh' ? 'Simplified Chinese' : 'English';
  return `Identify what is in this photo. If it is a cosmetic or skincare product, read its label and extract the ingredient list only if it is visible. Write the "description" field in ${descLang}. Return the JSON object as specified.`;
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export interface ExtractOptions {
  /** Data URL (e.g. `data:image/jpeg;base64,/9j/...`). */
  imageDataUrl: string;
  /** UI language — only used to pick a fallback error message if the model fails. */
  language?: 'en' | 'zh';
  /** Abort signal forwarded to fetch. */
  signal?: AbortSignal;
}

export async function extractIngredientsFromImage(
  opts: ExtractOptions,
): Promise<VisionExtractionResponse> {
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'OpenAI API key not configured',
      code: 'api_key_missing',
    };
  }

  if (!opts.imageDataUrl?.startsWith('data:image/')) {
    return {
      success: false,
      error: 'imageDataUrl must be a data:image/* URL',
      code: 'invalid_response',
    };
  }

  const primary = await callVisionModel(
    VISION_MODEL_PRIMARY,
    opts.imageDataUrl,
    apiKey,
    opts.signal,
    opts.language ?? 'en',
  );

  // A "successful" call that returns no ingredients and an "unreadable" verdict
  // means the model could not read the label. That can happen when the primary
  // model is weaker at OCR than the fallback, so treat it like a failure and let
  // the proven-multimodal fallback take a turn instead of giving up here.
  const primaryUnreadable =
    primary.success &&
    primary.data.confidence === 'unreadable' &&
    primary.data.ingredients.length === 0;

  if (primary.success && !primaryUnreadable) return primary;

  // A missing API key will not be fixed by switching models.
  if (!primary.success && primary.code === 'api_key_missing') return primary;

  console.warn(
    `[vision] primary ${VISION_MODEL_PRIMARY} ${
      primary.success ? 'returned unreadable' : `failed (${primary.code}: ${primary.error})`
    }; trying ${VISION_MODEL_FALLBACK}`,
  );
  const fallback = await callVisionModel(
    VISION_MODEL_FALLBACK,
    opts.imageDataUrl,
    apiKey,
    opts.signal,
    opts.language ?? 'en',
  );
  if (fallback.success) return fallback;

  // Both models struck out. Return the primary result if we got one, otherwise
  // the fallback error.
  return primary.success ? primary : fallback;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function callVisionModel(
  model: string,
  imageDataUrl: string,
  apiKey: string,
  signal?: AbortSignal,
  language: 'en' | 'zh' = 'en',
): Promise<VisionExtractionResponse> {
  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildUserInstruction(language) },
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    ...buildModelParams(model, { temperature: 0.1, maxTokens: 1500 }),
  });

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal,
    });
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || 'fetch failed',
      code: 'network_error',
    };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return {
      success: false,
      error: `OpenAI vision API ${response.status}: ${text.slice(0, 200)}`,
      code: 'api_error',
    };
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return {
      success: false,
      error: 'No content in vision response',
      code: 'invalid_response',
    };
  }

  const parsed = parseVisionContent(content);
  if (!parsed) {
    return {
      success: false,
      error: 'Vision response was not valid JSON',
      code: 'invalid_response',
    };
  }

  if (parsed.confidence === 'unreadable' && parsed.ingredients.length === 0) {
    return {
      success: true,
      data: parsed,
      model,
    };
  }

  return { success: true, data: parsed, model };
}

/**
 * Parse + sanitise the JSON object returned by the model. The model is
 * instructed to return strict JSON (we use response_format=json_object) but
 * we still defensively validate every field so the rest of the app can rely
 * on the shape.
 */
function parseVisionContent(raw: string): VisionExtractionResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try stripping accidental code fences just in case.
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      parsed = JSON.parse(stripped);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  const ingredients = sanitizeIngredients(obj.ingredients);
  const isCosmetic = obj.isCosmetic === true;
  const description =
    typeof obj.description === 'string' ? obj.description.trim().slice(0, 300) : '';
  const rawText = typeof obj.rawText === 'string' ? obj.rawText.slice(0, 4000) : '';
  const productName =
    typeof obj.productName === 'string' && obj.productName.trim().length > 0
      ? obj.productName.trim().slice(0, 200)
      : null;
  const productType =
    typeof obj.productType === 'string' && obj.productType.trim().length > 0
      ? obj.productType.trim().slice(0, 100)
      : null;

  const confidence = normalizeConfidence(obj.confidence);
  const warnings = Array.isArray(obj.warnings)
    ? obj.warnings
        .filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
        .map((w) => w.trim().slice(0, 200))
        .slice(0, 8)
    : [];

  const language = normalizeLanguage(obj.language, ingredients);

  return {
    isCosmetic,
    description,
    ingredients,
    rawText,
    productName,
    productType,
    confidence,
    warnings,
    language,
  };
}

function sanitizeIngredients(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    let s = item.trim();
    if (!s) continue;
    // Strip common list prefixes: "1.", "1)", "- ", "* ", "•"
    s = s.replace(/^([\u2022\-*+]|\d+[.)])\s*/, '').trim();
    // Drop trailing semicolons/commas/periods.
    s = s.replace(/[;,.]+$/, '').trim();
    if (s.length > 200) s = s.slice(0, 200);
    if (s) cleaned.push(s);
    if (cleaned.length >= 80) break; // INCI lists rarely exceed ~60 entries.
  }
  // Deduplicate (preserve first occurrence — order matters for INCI).
  const seen = new Set<string>();
  return cleaned.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function normalizeConfidence(value: unknown): VisionConfidence {
  if (value === 'high' || value === 'medium' || value === 'low' || value === 'unreadable') {
    return value;
  }
  return 'medium';
}

function normalizeLanguage(
  value: unknown,
  ingredients: string[],
): 'en' | 'zh' | 'other' {
  if (value === 'en' || value === 'zh' || value === 'other') return value;
  if (ingredients.some((i) => /[\u4e00-\u9fa5]/.test(i))) return 'zh';
  if (ingredients.length > 0) return 'en';
  return 'other';
}
