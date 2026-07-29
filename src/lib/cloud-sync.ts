/**
 * Cloud sync for favorites + saved routines (14.3b / 14.7).
 *
 * The localStorage stores stay the source of truth for the live UI (instant,
 * offline-friendly, anonymous-friendly). This module reconciles them with the
 * per-user cloud copy so a logged-in user's shelf and routines follow them
 * across devices:
 *
 *   • on login / page load with a session → PULL remote, union-MERGE into local,
 *     then PUSH the merged set back (so every device converges).
 *   • on a local change while logged in → debounced PUSH of the exact current
 *     set (an unstar/delete made online therefore propagates as a real delete).
 *
 * The merge is union-based, so the worst case (unstar while offline, then log in
 * on another device) can re-add an item rather than lose one — a deliberate
 * "never lose a save" bias. `mergeFavoriteIds` / `mergeRoutineLists` are pure
 * and unit-tested.
 */
import { supabase } from './supabase';
import { readFavorites, writeFavorites, FAVORITES_EVENT } from './favorites-store';
import { readRoutines, writeRoutines, ROUTINES_EVENT, type SavedRoutine } from './routine-store';
import { mergeFavoriteIds, mergeRoutineLists } from './cloud-sync-merge';

const PUSH_DEBOUNCE_MS = 800;

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

// ---------------------------------------------------------------------------
// Network helpers (all fail-open — sync is best-effort)
// ---------------------------------------------------------------------------

async function authHeaders(): Promise<Record<string, string> | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : null;
  } catch {
    return null;
  }
}

async function apiGet(path: string, headers: Record<string, string>): Promise<any | null> {
  try {
    const res = await fetch(path, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function apiPut(path: string, headers: Record<string, string>, body: unknown): Promise<void> {
  try {
    await fetch(path, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    /* offline / transient — the next change or page load will retry */
  }
}

// Guard so applying a remote merge to localStorage doesn't immediately trigger
// its own change-event push (harmless but chatty).
let suppressPush = false;

async function syncFavorites(headers: Record<string, string>): Promise<void> {
  const payload = await apiGet('/api/favorites', headers);
  if (!payload?.success) return;
  const remote: string[] = Array.isArray(payload.ids) ? payload.ids : [];
  const local = readFavorites();
  const merged = mergeFavoriteIds(local, remote);

  if (!sameStringSet(merged, local)) {
    suppressPush = true;
    writeFavorites(merged);
    suppressPush = false;
  }
  if (!sameStringSet(merged, remote)) {
    await apiPut('/api/favorites', headers, { ids: merged });
  }
}

async function syncRoutines(headers: Record<string, string>): Promise<void> {
  const payload = await apiGet('/api/routines', headers);
  if (!payload?.success) return;
  const remote: SavedRoutine[] = Array.isArray(payload.routines) ? payload.routines : [];
  const local = readRoutines();
  const merged = mergeRoutineLists(local, remote);

  const localIds = local.map((r) => r.id);
  const mergedIds = merged.map((r) => r.id);
  if (!sameStringSet(mergedIds, localIds)) {
    suppressPush = true;
    writeRoutines(merged);
    suppressPush = false;
  }
  const remoteIds = remote.map((r) => r.id);
  if (!sameStringSet(mergedIds, remoteIds)) {
    await apiPut('/api/routines', headers, { routines: merged });
  }
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

let started = false;

/**
 * Wire up cloud sync for the current page. Idempotent per page load; safe to
 * call when logged out (it simply no-ops until a session appears).
 */
export function initCloudSync(): void {
  if (typeof window === 'undefined' || started) return;
  started = true;

  const PULLED_KEY = 'cosmeticlens:cloudsync:pulled';
  const pulledThisSession = () => {
    try {
      return sessionStorage.getItem(PULLED_KEY) === '1';
    } catch {
      return false;
    }
  };

  const runSync = async () => {
    const headers = await authHeaders();
    if (!headers) return;
    try {
      sessionStorage.setItem(PULLED_KEY, '1');
    } catch {
      /* storage blocked — fine */
    }
    await Promise.allSettled([syncFavorites(headers), syncRoutines(headers)]);
  };

  // Pull once per tab session on load — avoids re-GETting on every MPA
  // navigation and draining the shared `light` rate-limit budget. A fresh
  // sign-in always re-pulls (that's the moment devices need to converge);
  // ongoing local edits keep the cloud current via the debounced push below.
  if (!pulledThisSession()) runSync();
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') runSync();
  });

  const pushFavorites = debounce(async () => {
    if (suppressPush) return;
    const headers = await authHeaders();
    if (headers) await apiPut('/api/favorites', headers, { ids: readFavorites() });
  }, PUSH_DEBOUNCE_MS);

  const pushRoutines = debounce(async () => {
    if (suppressPush) return;
    const headers = await authHeaders();
    if (headers) await apiPut('/api/routines', headers, { routines: readRoutines() });
  }, PUSH_DEBOUNCE_MS);

  window.addEventListener(FAVORITES_EVENT, () => {
    if (!suppressPush) pushFavorites();
  });
  window.addEventListener(ROUTINES_EVENT, () => {
    if (!suppressPush) pushRoutines();
  });
}
