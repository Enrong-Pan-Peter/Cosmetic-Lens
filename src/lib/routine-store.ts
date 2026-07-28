/**
 * Saved routines ("Routine library", improvement-plan 14.7).
 *
 * Extends the routine checker (7.1) so a user can name and save the routine
 * they just built, then reopen it later and re-check as products change.
 *
 * localStorage-backed so it works for everyone with zero backend (cloud sync
 * for logged-in users is a documented follow-up, same as favorites 14.3). The
 * `sanitize*` / `normalize*` functions are PURE and unit-tested; a
 * `routines-changed` window event keeps the checker in sync across islands.
 */
export const LOCAL_ROUTINES_KEY = 'cosmeticlens:routines:v1';
export const ROUTINES_EVENT = 'cosmeticlens:routines-changed';

const MAX_ROUTINES = 50;
const MAX_PRODUCTS = 5;
const MAX_NAME = 80;
const MAX_PRODUCT_NAME = 120;
const MAX_INGREDIENTS = 4000;

export interface RoutineProduct {
  name: string;
  ingredients: string;
}

export interface SavedRoutineInput {
  name?: string;
  products: RoutineProduct[];
  isPregnant?: boolean;
}

export interface SavedRoutine {
  id: string;
  name: string;
  products: RoutineProduct[];
  isPregnant: boolean;
  savedAt: number;
}

function clampStr(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/**
 * Normalize a product list: coerce/clamp fields, keep only products that
 * actually have an ingredient list, cap the count. Pure.
 */
export function normalizeProducts(raw: unknown): RoutineProduct[] {
  if (!Array.isArray(raw)) return [];
  const out: RoutineProduct[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const rec = p as Record<string, unknown>;
    const ingredients = clampStr(rec.ingredients, MAX_INGREDIENTS);
    if (!ingredients) continue; // nothing to check → drop
    out.push({ name: clampStr(rec.name, MAX_PRODUCT_NAME), ingredients });
    if (out.length >= MAX_PRODUCTS) break;
  }
  return out;
}

/**
 * Validate + clean a save request. Returns null if there is nothing worth
 * saving (no product with an ingredient list). Does NOT enforce the 2-product
 * minimum — that's a UI policy the checker applies before calling save. Pure.
 */
export function sanitizeRoutineInput(raw: unknown): {
  name: string;
  products: RoutineProduct[];
  isPregnant: boolean;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const products = normalizeProducts(rec.products);
  if (products.length === 0) return null;
  const name = clampStr(rec.name, MAX_NAME) || products[0].name || '';
  return { name, products, isPregnant: Boolean(rec.isPregnant) };
}

/** Coerce stored JSON into a clean, capped list of saved routines. Pure. */
export function normalizeSavedRoutines(raw: unknown): SavedRoutine[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedRoutine[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const rec = r as Record<string, unknown>;
    const id = typeof rec.id === 'string' ? rec.id : '';
    if (!id || seen.has(id)) continue;
    const products = normalizeProducts(rec.products);
    if (products.length === 0) continue;
    seen.add(id);
    out.push({
      id,
      name: clampStr(rec.name, MAX_NAME) || products[0].name || 'Routine',
      products,
      isPregnant: Boolean(rec.isPregnant),
      savedAt: typeof rec.savedAt === 'number' ? rec.savedAt : 0,
    });
    if (out.length >= MAX_ROUTINES) break;
  }
  return out;
}

function makeId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function readRoutines(): SavedRoutine[] {
  if (typeof window === 'undefined') return [];
  try {
    return normalizeSavedRoutines(
      JSON.parse(window.localStorage.getItem(LOCAL_ROUTINES_KEY) || '[]'),
    );
  } catch {
    return [];
  }
}

function persist(routines: SavedRoutine[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      LOCAL_ROUTINES_KEY,
      JSON.stringify(normalizeSavedRoutines(routines)),
    );
    window.dispatchEvent(new CustomEvent(ROUTINES_EVENT));
  } catch {
    /* storage blocked — non-fatal */
  }
}

/**
 * Save a new routine (most-recent first). Returns the stored record, or null
 * if there was nothing valid to save.
 */
export function saveRoutine(input: SavedRoutineInput): SavedRoutine | null {
  const clean = sanitizeRoutineInput(input);
  if (!clean) return null;
  const record: SavedRoutine = { id: makeId(), savedAt: Date.now(), ...clean };
  persist([record, ...readRoutines()]);
  return record;
}

export function removeRoutine(id: string): void {
  if (!id) return;
  persist(readRoutines().filter((r) => r.id !== id));
}

export function renameRoutine(id: string, name: string): void {
  if (!id) return;
  const next = readRoutines().map((r) =>
    r.id === id ? { ...r, name: clampStr(name, MAX_NAME) || r.name } : r,
  );
  persist(next);
}
