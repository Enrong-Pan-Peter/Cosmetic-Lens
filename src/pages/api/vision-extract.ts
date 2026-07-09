/**
 * POST /api/vision-extract
 *
 * Accepts a `multipart/form-data` upload with an `image` field (single file)
 * and an optional `language` field. Returns the structured INCI extraction
 * from `src/lib/vision.ts`.
 *
 * Request:
 *   Content-Type: multipart/form-data
 *   image:    File (jpeg/png/webp/gif, ≤ 8 MB)
 *   language: "en" | "zh"  (optional, defaults to "en")
 *
 * Success response (200):
 *   {
 *     "success": true,
 *     "data": {
 *       "ingredients": [string],
 *       "rawText": string,
 *       "productName": string | null,
 *       "confidence": "high" | "medium" | "low" | "unreadable",
 *       "warnings": [string],
 *       "language": "en" | "zh" | "other"
 *     },
 *     "model": string
 *   }
 *
 * Error response (4xx / 5xx):
 *   {
 *     "success": false,
 *     "error": "human-readable string",
 *     "code": "missing_image" | "unsupported_type" | "too_large"
 *           | "api_key_missing" | "api_error" | "invalid_response"
 *           | "network_error" | "internal_error"
 *   }
 *
 * No user data is persisted; we forward the image directly to OpenAI and
 * return the parsed JSON to the caller.
 */

import type { APIRoute } from 'astro';
import {
  extractIngredientsFromImage,
  MAX_IMAGE_BYTES,
  SUPPORTED_MIME_TYPES,
} from '../../lib/vision';
import { getUserFromRequest } from '../../lib/auth';
import { enforceRateLimit, getClientIp, rateLimitResponse } from '../../lib/rate-limit';

export const prerender = false;

type ErrorCode =
  | 'missing_image'
  | 'unsupported_type'
  | 'too_large'
  | 'api_key_missing'
  | 'api_error'
  | 'invalid_response'
  | 'unreadable'
  | 'network_error'
  | 'internal_error';

function errorResponse(status: number, code: ErrorCode, message: string) {
  return new Response(
    JSON.stringify({ success: false, error: message, code }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse(
        400,
        'missing_image',
        'Expected multipart/form-data with an "image" field',
      );
    }

    // Rate limit BEFORE reading the (up to 8 MB) body — vision is the most
    // expensive endpoint per call. Language isn't parsed yet, so the 429
    // message language falls back via the Accept-Language-free default; the
    // client maps code 'rate_limit_exceeded' regardless.
    const authedUser = await getUserFromRequest(request);
    const rl = await enforceRateLimit({
      cls: 'vision',
      userId: authedUser?.id ?? null,
      ip: getClientIp(request, clientAddress),
      request,
    });
    if (!rl.allowed) {
      return rateLimitResponse('vision', 'en', Boolean(authedUser));
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err) {
      console.warn('[vision-extract] form parse failed:', err);
      return errorResponse(400, 'missing_image', 'Could not parse form data');
    }

    const file = formData.get('image');
    if (!(file instanceof File)) {
      return errorResponse(400, 'missing_image', 'Form field "image" is required');
    }

    if (file.size === 0) {
      return errorResponse(400, 'missing_image', 'Uploaded image is empty');
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return errorResponse(
        413,
        'too_large',
        `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB; max ${MAX_IMAGE_BYTES / 1024 / 1024} MB`,
      );
    }

    const mime = (file.type || '').toLowerCase();
    if (!SUPPORTED_MIME_TYPES.has(mime)) {
      return errorResponse(
        415,
        'unsupported_type',
        `Unsupported file type "${mime || 'unknown'}". Use JPG, PNG, WebP, or GIF.`,
      );
    }

    const languageRaw = formData.get('language');
    const language = languageRaw === 'zh' ? 'zh' : 'en';

    const buffer = await file.arrayBuffer();
    const base64 =
      typeof Buffer !== 'undefined'
        ? Buffer.from(buffer).toString('base64')
        : arrayBufferToBase64(buffer);
    const dataUrl = `data:${mime};base64,${base64}`;

    const result = await extractIngredientsFromImage({
      imageDataUrl: dataUrl,
      language,
    });

    if (!result.success) {
      const status =
        result.code === 'api_key_missing'
          ? 500
          : result.code === 'network_error'
            ? 502
            : 500;
      return errorResponse(status, result.code, result.error);
    }

    return new Response(
      JSON.stringify({ success: true, data: result.data, model: result.model }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[vision-extract] internal error:', err);
    return errorResponse(
      500,
      'internal_error',
      err instanceof Error ? err.message : 'Internal error',
    );
  }
};

/**
 * Fallback for runtimes where Node's Buffer global isn't available
 * (shouldn't happen on Vercel/Node, but kept for safety).
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return typeof btoa !== 'undefined'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
}
