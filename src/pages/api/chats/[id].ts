/**
 * /api/chats/[id] — single-chat sync endpoint.
 *
 *   GET    → { success, data: { id, title, created_at, updated_at, messages[] } }
 *   PUT    → create-or-replace the whole chat (title + messages). The client
 *            syncs full snapshots after each turn — messages are small
 *            (≤ MAX_MESSAGES) so replace-all is simpler and safer than diffing.
 *   DELETE → remove chat (messages cascade).
 *
 * Auth: required. Ownership enforced on every op (id is client-generated,
 * so PUT claims the id for this user; an id owned by someone else → 403).
 */
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { getUserFromRequest } from '../../../lib/auth';

export const prerender = false;

const MAX_MESSAGES = 80;
const MAX_CONTENT_CHARS = 24_000;
const MAX_TITLE_CHARS = 200;
const MAX_METADATA_CHARS = 8_000;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function ownerOf(supabase: ReturnType<typeof createServerClient>, chatId: string) {
  const { data } = await supabase.from('chats').select('user_id').eq('id', chatId).maybeSingle();
  return data?.user_id ?? null;
}

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user) return json(401, { success: false, error: 'unauthorized' });
  const chatId = params.id ?? '';
  if (!ID_PATTERN.test(chatId)) return json(400, { success: false, error: 'bad_id' });

  try {
    const supabase = createServerClient();
    const { data: chat, error } = await supabase
      .from('chats')
      .select('id, user_id, title, created_at, updated_at')
      .eq('id', chatId)
      .maybeSingle();
    if (error) throw error;
    if (!chat) return json(404, { success: false, error: 'not_found' });
    if (chat.user_id !== user.id) return json(403, { success: false, error: 'forbidden' });

    const { data: messages, error: mErr } = await supabase
      .from('chat_messages')
      .select('seq, role, content, metadata')
      .eq('chat_id', chatId)
      .order('seq', { ascending: true });
    if (mErr) throw mErr;

    return json(200, {
      success: true,
      data: {
        id: chat.id,
        title: chat.title,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
        messages: (messages ?? []).map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.metadata && typeof m.metadata === 'object' ? m.metadata : {}),
        })),
      },
    });
  } catch (err) {
    console.error('chats/[id] GET error:', err);
    return json(500, { success: false, error: 'internal_error' });
  }
};

export const PUT: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user) return json(401, { success: false, error: 'unauthorized' });
  const chatId = params.id ?? '';
  if (!ID_PATTERN.test(chatId)) return json(400, { success: false, error: 'bad_id' });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json(400, { success: false, error: 'invalid_json' });
  }

  const title = typeof body?.title === 'string' ? body.title.slice(0, MAX_TITLE_CHARS) : 'New chat';
  const createdAt = typeof body?.createdAt === 'string' ? body.createdAt : null;
  const rawMessages = Array.isArray(body?.messages) ? body.messages : null;
  if (!rawMessages || rawMessages.length === 0 || rawMessages.length > MAX_MESSAGES) {
    return json(400, { success: false, error: 'bad_messages' });
  }

  // Validate + normalize. Everything beyond role/content is metadata.
  const rows: Array<{ seq: number; role: string; content: string; metadata: Record<string, unknown> }> = [];
  for (let i = 0; i < rawMessages.length; i++) {
    const m = rawMessages[i];
    const role = m?.role === 'user' ? 'user' : m?.role === 'assistant' ? 'assistant' : null;
    if (!role || typeof m?.content !== 'string') return json(400, { success: false, error: 'bad_message_shape' });
    const { role: _r, content: _c, ...rest } = m;
    let metadata: Record<string, unknown> = rest && typeof rest === 'object' ? rest : {};
    try {
      if (JSON.stringify(metadata).length > MAX_METADATA_CHARS) metadata = {};
    } catch {
      metadata = {};
    }
    rows.push({ seq: i, role, content: m.content.slice(0, MAX_CONTENT_CHARS), metadata });
  }

  try {
    const supabase = createServerClient();

    const existingOwner = await ownerOf(supabase, chatId);
    if (existingOwner && existingOwner !== user.id) {
      return json(403, { success: false, error: 'forbidden' });
    }

    const { error: upErr } = await supabase.from('chats').upsert(
      {
        id: chatId,
        user_id: user.id,
        title,
        ...(createdAt ? { created_at: createdAt } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (upErr) throw upErr;

    // Replace-all messages (small N; avoids diff complexity).
    const { error: delErr } = await supabase.from('chat_messages').delete().eq('chat_id', chatId);
    if (delErr) throw delErr;
    const { error: insErr } = await supabase
      .from('chat_messages')
      .insert(rows.map((r) => ({ ...r, chat_id: chatId })));
    if (insErr) throw insErr;

    return json(200, { success: true });
  } catch (err) {
    console.error('chats/[id] PUT error:', err);
    return json(500, { success: false, error: 'internal_error' });
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user) return json(401, { success: false, error: 'unauthorized' });
  const chatId = params.id ?? '';
  if (!ID_PATTERN.test(chatId)) return json(400, { success: false, error: 'bad_id' });

  try {
    const supabase = createServerClient();
    const { error } = await supabase.from('chats').delete().eq('id', chatId).eq('user_id', user.id);
    if (error) throw error;
    return json(200, { success: true });
  } catch (err) {
    console.error('chats/[id] DELETE error:', err);
    return json(500, { success: false, error: 'internal_error' });
  }
};
