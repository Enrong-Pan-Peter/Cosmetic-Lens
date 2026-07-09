/**
 * Request → identity resolution.
 *
 * SECURITY INVARIANT: user identity is derived ONLY from a verified
 * Supabase JWT in the `Authorization: Bearer <token>` header. Never
 * trust a `userId` supplied in a request body or query string — doing
 * so previously allowed any caller to read another user's profile
 * (pregnancy status, allergies) by guessing their UUID (IDOR).
 *
 * Endpoints that allow anonymous use treat `null` as "anonymous".
 * Endpoints that require auth should 401 when this returns `null`.
 */
import type { User } from '@supabase/supabase-js';
import { createServerClient } from './supabase';

export async function getUserFromRequest(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}
