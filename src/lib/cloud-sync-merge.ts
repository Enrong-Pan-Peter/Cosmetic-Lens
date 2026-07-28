/**
 * Pure merge helpers for cloud sync (14.3b / 14.7), split out from cloud-sync.ts
 * so they can be unit-tested without importing the Supabase client (which builds
 * at module load and needs env vars). See cloud-sync.ts for how these are used.
 */
import { normalizeSavedRoutines, type SavedRoutine } from './routine-store';

export const MAX_FAVORITES = 200;
export const MAX_ROUTINES = 50;

/** Union of favorite ids, local order first, deduped + clamped. Pure. */
export function mergeFavoriteIds(local: unknown, remote: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [
    ...(Array.isArray(local) ? local : []),
    ...(Array.isArray(remote) ? remote : []),
  ]) {
    if (typeof id === 'string' && id.trim() && !seen.has(id)) {
      seen.add(id);
      out.push(id);
      if (out.length >= MAX_FAVORITES) break;
    }
  }
  return out;
}

/** Union of routines by id (newer `savedAt` wins), sorted newest-first. Pure. */
export function mergeRoutineLists(local: unknown, remote: unknown): SavedRoutine[] {
  const all = [...normalizeSavedRoutines(remote), ...normalizeSavedRoutines(local)];
  const byId = new Map<string, SavedRoutine>();
  for (const r of all) {
    const cur = byId.get(r.id);
    if (!cur || (r.savedAt || 0) >= (cur.savedAt || 0)) byId.set(r.id, r);
  }
  return [...byId.values()]
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    .slice(0, MAX_ROUTINES);
}
