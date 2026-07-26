/**
 * Skin-profile storage + sanitization (improvement-plan 14.1).
 *
 * The quiz writes a profile here; logged-in users also persist it to Supabase
 * via /api/profile. Anonymous users keep it in localStorage, and the chat sends
 * it in the request body so their answers are personalized too (the server uses
 * a body profile ONLY for anonymous requests — authed always reads the DB).
 *
 * `sanitizeProfileInput` is pure and shared by the client and the server, so an
 * anon-supplied profile can never smuggle unexpected fields into a prompt.
 */
import type { UserProfile } from './prompt';

export const LOCAL_PROFILE_KEY = 'cosmeticlens:profile:v1';

const SKIN_TYPES = new Set(['oily', 'dry', 'combination', 'normal']);
const SENSITIVITY = new Set(['low', 'medium', 'high']);
const PRICE = new Set(['budget', 'mid', 'luxury', 'none', 'no_preference']);

/** Whitelist + clamp an untrusted profile object down to known fields. */
export function sanitizeProfileInput(raw: unknown): UserProfile {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: UserProfile = {};
  if (typeof r.skin_type === 'string' && SKIN_TYPES.has(r.skin_type)) out.skin_type = r.skin_type;
  if (typeof r.sensitivity === 'string' && SENSITIVITY.has(r.sensitivity)) out.sensitivity = r.sensitivity;
  if (Array.isArray(r.concerns)) {
    out.concerns = r.concerns.filter((c): c is string => typeof c === 'string').slice(0, 15);
  }
  if (typeof r.is_pregnant === 'boolean') out.is_pregnant = r.is_pregnant;
  if (typeof r.price_preference === 'string' && PRICE.has(r.price_preference)) {
    out.price_preference = r.price_preference;
  }
  if (Array.isArray(r.allergies)) {
    out.allergies = r.allergies.filter((a): a is string => typeof a === 'string').slice(0, 20);
  }
  return out;
}

/** True if the profile carries at least one meaningful preference. */
export function hasAnyProfileValue(p: UserProfile | null | undefined): boolean {
  if (!p) return false;
  return Boolean(
    p.skin_type ||
      p.sensitivity ||
      (p.concerns && p.concerns.length) ||
      p.is_pregnant ||
      (p.price_preference && p.price_preference !== 'none') ||
      (p.allergies && p.allergies.length),
  );
}

export function readLocalProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) return null;
    const parsed = sanitizeProfileInput(JSON.parse(raw));
    return hasAnyProfileValue(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalProfile(p: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(sanitizeProfileInput(p)));
  } catch {
    /* storage blocked — non-fatal */
  }
}
