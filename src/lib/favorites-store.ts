/**
 * Saved-ingredient favorites ("My Shelf", improvement-plan 14.3).
 *
 * localStorage-backed so it works for everyone with zero backend (cloud sync
 * for logged-in users is a documented follow-up). `normalizeFavorites` is pure
 * and unit-tested. A `favorites-changed` window event keeps the star buttons
 * and the shelf page in sync across React islands.
 */
export const LOCAL_FAVORITES_KEY = 'cosmeticlens:favorites:v1';
export const FAVORITES_EVENT = 'cosmeticlens:favorites-changed';
const MAX_FAVORITES = 200;

/** Dedupe + drop non-strings + clamp. Pure. */
export function normalizeFavorites(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === 'string' && x.trim() && !seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out.slice(0, MAX_FAVORITES);
}

export function readFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return normalizeFavorites(JSON.parse(window.localStorage.getItem(LOCAL_FAVORITES_KEY) || '[]'));
  } catch {
    return [];
  }
}

export function writeFavorites(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(normalizeFavorites(ids)));
    window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
  } catch {
    /* storage blocked — non-fatal */
  }
}

export function isFavorite(id: string): boolean {
  return readFavorites().includes(id);
}

/** Toggle and return the NEW favorited state (true = now saved). */
export function toggleFavorite(id: string): boolean {
  if (!id) return false;
  const cur = readFavorites();
  const exists = cur.includes(id);
  writeFavorites(exists ? cur.filter((x) => x !== id) : [...cur, id]);
  return !exists;
}
