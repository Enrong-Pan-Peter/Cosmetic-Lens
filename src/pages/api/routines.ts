/**
 * GET/PUT /api/routines — cloud mirror of saved routines (14.7).
 *
 * SECURITY: identity comes ONLY from the verified Supabase JWT; every query is
 * scoped by user_id. The composite PK (user_id, id) means a client-supplied id
 * can only ever address the caller's own row. PUT is "set to exactly these
 * routines" (upsert provided + delete missing). Payloads are validated/clamped
 * with the same pure `normalizeSavedRoutines` the client uses.
 */
import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';
import { getUserFromRequest } from '../../lib/auth';
import { enforceRateLimit, getClientIp, rateLimitResponse } from '../../lib/rate-limit';
import { normalizeSavedRoutines, type SavedRoutine } from '../../lib/routine-store';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface RoutineRow {
  id: string;
  name: string;
  products: unknown;
  is_pregnant: boolean;
  saved_at: string;
}

function rowToClient(r: RoutineRow): SavedRoutine {
  const ms = Date.parse(r.saved_at);
  return {
    id: r.id,
    name: r.name,
    products: Array.isArray(r.products) ? (r.products as SavedRoutine['products']) : [],
    isPregnant: Boolean(r.is_pregnant),
    savedAt: Number.isFinite(ms) ? ms : 0,
  };
}

export const GET: APIRoute = async ({ request, clientAddress }) => {
  const user = await getUserFromRequest(request);
  if (!user) return json({ success: false, error: 'unauthorized' }, 401);

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
      .from('saved_routines')
      .select('id, name, products, is_pregnant, saved_at')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });
    if (error) throw error;
    return json({ success: true, routines: (data ?? []).map((r) => rowToClient(r as RoutineRow)) });
  } catch (err) {
    console.error('routines GET error:', err);
    return json({ success: false, error: 'internal_error' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, clientAddress }) => {
  const user = await getUserFromRequest(request);
  if (!user) return json({ success: false, error: 'unauthorized' }, 401);

  const rl = await enforceRateLimit({
    cls: 'light',
    userId: user.id,
    ip: getClientIp(request, clientAddress),
    request,
  });
  if (!rl.allowed) return rateLimitResponse('light', 'en', true);

  try {
    const body = await request.json().catch(() => ({}));
    const routines = normalizeSavedRoutines((body as Record<string, unknown>).routines);
    const supabase = createServerClient();

    const { data: existingRows, error: readErr } = await supabase
      .from('saved_routines')
      .select('id')
      .eq('user_id', user.id);
    if (readErr) throw readErr;

    if (routines.length > 0) {
      const rows = routines.map((r) => ({
        user_id: user.id,
        id: r.id,
        name: r.name,
        products: r.products,
        is_pregnant: r.isPregnant,
        saved_at: new Date(r.savedAt || Date.now()).toISOString(),
      }));
      const { error } = await supabase.from('saved_routines').upsert(rows, { onConflict: 'user_id,id' });
      if (error) throw error;
    }

    // Delete any of the user's routines that aren't in the incoming set.
    const keep = new Set(routines.map((r) => r.id));
    const toDelete = (existingRows ?? []).map((r) => r.id).filter((id) => !keep.has(id));
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('saved_routines')
        .delete()
        .eq('user_id', user.id)
        .in('id', toDelete);
      if (delErr) throw delErr;
    }

    return json({ success: true, routines });
  } catch (err) {
    console.error('routines PUT error:', err);
    return json({ success: false, error: 'internal_error' }, 500);
  }
};
