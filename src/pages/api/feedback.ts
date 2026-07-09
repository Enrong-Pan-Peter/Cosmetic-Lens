/**
 * POST /api/feedback
 *
 * Stores a thumbs up/down (+ optional reason) on an assistant answer — the
 * eval flywheel (improvement-plan 7.3). Anonymous-friendly: identity, when
 * present, comes only from a verified JWT (never the body). Cheap `light`
 * rate-limit class. Write goes through the service role; failures never block
 * the UI (the button already showed "thanks").
 */
import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';
import { getUserFromRequest } from '../../lib/auth';
import { enforceRateLimit, getClientIp } from '../../lib/rate-limit';

export const prerender = false;

const MAX_TEXT = 4000;
const MAX_REASON = 500;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clip(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const rating = body?.rating === 'up' || body?.rating === 'down' ? body.rating : null;
  if (!rating) {
    return json({ success: false, error: 'rating must be "up" or "down"' }, 400);
  }

  const authedUser = await getUserFromRequest(request);

  // Rate limit (per-user or per-IP). Fail-open like the rest of the app.
  const rl = await enforceRateLimit({
    cls: 'light',
    userId: authedUser?.id ?? null,
    ip: getClientIp(request, clientAddress),
    request,
  });
  if (!rl.allowed) {
    // Feedback is non-critical; silently accept without storing when limited.
    return json({ success: true, throttled: true });
  }

  try {
    const supabase = createServerClient();
    const { error } = await supabase.from('feedback').insert({
      user_id: authedUser?.id ?? null,
      chat_id: clip(body?.chatId, 128),
      rating,
      reason: clip(body?.reason, MAX_REASON),
      intent: clip(body?.intent, 40),
      pipeline: clip(body?.pipeline, 40),
      language: body?.language === 'zh' ? 'zh' : 'en',
      query: clip(body?.query, MAX_TEXT),
      answer: clip(body?.answer, MAX_TEXT),
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.warn('[feedback] insert failed (run 20260708_feedback.sql?):', err instanceof Error ? err.message : err);
    // Don't surface storage failures to the user — return success anyway.
    return json({ success: true, stored: false });
  }

  return json({ success: true, stored: true });
};
