/**
 * GET /api/chats — list the authenticated user's chats (id, title, timestamps).
 * Auth: required (Bearer JWT). Identity via getUserFromRequest only.
 */
import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';
import { getUserFromRequest } from '../../lib/auth';
import { enforceRateLimit, getClientIp, rateLimitResponse } from '../../lib/rate-limit';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ request, clientAddress }) => {
  const user = await getUserFromRequest(request);
  if (!user) return json(401, { success: false, error: 'unauthorized' });

  const rl = await enforceRateLimit({
    cls: 'light',
    userId: user.id,
    ip: getClientIp(request, clientAddress),
    request,
  });
  if (!rl.allowed) return rateLimitResponse('light', 'en', true);

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('chats')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return json(200, { success: true, data: data ?? [] });
  } catch (err) {
    console.error('chats GET error:', err);
    return json(500, { success: false, error: 'internal_error' });
  }
};
