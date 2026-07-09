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
  ingredients: string[];
  rawText: string;
  productName: string | null;
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

const VISION_MODEL_PRIMARY = 'gpt-5.4-mini';
const VISION_MODEL_FALLBACK = 'gpt-4o-mini';

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

const SYSTEM_PROMPT = `You are a precise OCR/extraction tool for cosmetic and skincare product labels.

Read the photo and return ONLY a JSON object matching this schema:

{
  "ingredients": [string],     // The INCI ingredient names from the "Ingredients:" section, in the order shown
  "rawText": string,            // Full readable text you see on the label (preserve line breaks with \\n)
  "productName": string | null, // Brand + product name if visible, else null (e.g. "CeraVe Moisturizing Cream")
  "confidence": "high" | "medium" | "low" | "unreadable",
  "warnings": [string],         // Short notes if image is partially obscured, blurry, glare, cropped, etc.
  "language": "en" | "zh" | "other"  // Primary language of the ingredient list on the label
}

Rules:
- "ingredients" MUST come from the actual "Ingredients" / "成分" / "全成分" section. Do NOT include marketing text, claims, directions, warnings, or net weight.
- Trim whitespace and strip leading bullets, numbers, or asterisks from each ingredient.
- If the label is in Chinese (e.g. uses 水, 甘油, 烟酰胺) keep ingredients in Chinese as printed. If in English, return the INCI English names as printed. Do not translate.
- Preserve order — INCI lists are concentration-ordered and the order matters.
- If an ingredient is illegible or partially obscured, OMIT it and add a warning rather than guessing.
- If the image is NOT a cosmetic product label (e.g. a landscape, food packaging, a face, blank surface):
    confidence = "unreadable", ingredients = [], warnings = ["not a cosmetic product label"].
- If you see a label but the ingredient section isn't visible:
    confidence = "low" or "unreadable", explain in warnings.
- Output JSON ONLY. No markdown code fences. No commentary.`;

const USER_INSTRUCTION = 'Extract the ingredient list from this cosmetic product label photo and return the JSON object as specified.';

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
  );
  if (primary.success) return primary;

  if (primary.code === 'api_key_missing' || primary.code === 'unreadable') {
    return primary;
  }

  console.warn(
    `[vision] primary model ${VISION_MODEL_PRIMARY} failed (${primary.code}: ${primary.error}); trying ${VISION_MODEL_FALLBACK}`,
  );
  return callVisionModel(
    VISION_MODEL_FALLBACK,
    opts.imageDataUrl,
    apiKey,
    opts.signal,
  );
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function callVisionModel(
  model: string,
  imageDataUrl: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<VisionExtractionResponse> {
  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: USER_INSTRUCTION },
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
  const rawText = typeof obj.rawText === 'string' ? obj.rawText.slice(0, 4000) : '';
  const productName =
    typeof obj.productName === 'string' && obj.productName.trim().length > 0
      ? obj.productName.trim().slice(0, 200)
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
    ingredients,
    rawText,
    productName,
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
