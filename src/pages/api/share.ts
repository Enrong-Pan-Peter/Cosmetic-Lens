/**
 * POST /api/share (improvement-plan 12.1)
 *
 * Snapshots one assistant answer into the public `shared_analyses` table and
 * returns its id + path. Anonymous-friendly; identity (when present) comes only
 * from the verified JWT. Cheap `light` rate-limit class. The write is the only
 * way content becomes public — chats/chat_messages are never exposed.
 */
import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';
import { getUserFromRequest } from '../../lib/auth';
import { enforceRateLimit, getClientIp, rateLimitResponse } from '../../lib/rate-limit';
import { generateShareId, sanitizeSharePayload } from '../../lib/share';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const payload = sanitizeSharePayload(body);
  if (!payload) {
    return json({ success: false, error: 'Nothing to share' }, 400);
  }

  const authedUser = await getUserFromRequest(request);

  const rl = await enforceRateLimit({
    cls: 'light',
    userId: authedUser?.id ?? null,
    ip: getClientIp(request, clientAddress),
    request,
  });
  if (!rl.allowed) {
    return rateLimitResponse('light', payload.language, Boolean(authedUser));
  }

  const id = generateShareId();
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from('shared_analyses').insert({
      id,
      user_id: authedUser?.id ?? null,
      title: payload.title,
      content: payload.content,
      language: payload.language,
      metadata: payload.metadata,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[share] insert failed (run 20260710_shared_analyses.sql?):', err instanceof Error ? err.message : err);
    return json({ success: false, error: 'Could not create share link' }, 500);
  }

  return json({ success: true, id, path: `/${payload.language}/a/${id}` });
};
