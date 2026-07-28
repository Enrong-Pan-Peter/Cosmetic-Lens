/**
 * GET/PUT /api/favorites — cloud mirror of the "My Shelf" star list (14.3b).
 *
 * SECURITY: identity comes ONLY from the verified Supabase JWT (see auth.ts).
 * Every query is scoped to that user_id — a client can never read or write
 * another user's shelf. PUT is "set to exactly these ids" (diffed to inserts +
 * deletes) so an unstar made while online propagates as a real delete.
 */
import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';
import { getUserFromRequest } from '../../lib/auth';

export const prerender = false;

const MAX_FAVORITES = 200;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Dedupe + drop non-strings + clamp. */
function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === 'string' && x.trim() && !seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
    if (out.length >= MAX_FAVORITES) break;
  }
  return out;
}

export const GET: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);
  if (!user) return json({ success: false, error: 'unauthorized' }, 401);

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('favorites')
      .select('ingredient_id')
      .eq('user_id', user.id);
    if (error) throw error;
    return json({ success: true, ids: (data ?? []).map((r) => r.ingredient_id) });
  } catch (err) {
    console.error('favorites GET error:', err);
    return json({ success: false, error: 'internal_error' }, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);
  if (!user) return json({ success: false, error: 'unauthorized' }, 401);

  try {
    const body = await request.json().catch(() => ({}));
    const ids = normalizeIds((body as Record<string, unknown>).ids);
    const supabase = createServerClient();

    const { data: existingRows, error: readErr } = await supabase
      .from('favorites')
      .select('ingredient_id')
      .eq('user_id', user.id);
    if (readErr) throw readErr;

    const existing = new Set((existingRows ?? []).map((r) => r.ingredient_id));
    const next = new Set(ids);
    const toInsert = ids.filter((id) => !existing.has(id));
    const toDelete = [...existing].filter((id) => !next.has(id));

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('favorites')
        .upsert(
          toInsert.map((ingredient_id) => ({ user_id: user.id, ingredient_id })),
          { onConflict: 'user_id,ingredient_id' },
        );
      if (error) throw error;
    }
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .in('ingredient_id', toDelete);
      if (error) throw error;
    }

    return json({ success: true, ids });
  } catch (err) {
    console.error('favorites PUT error:', err);
    return json({ success: false, error: 'internal_error' }, 500);
  }
};
