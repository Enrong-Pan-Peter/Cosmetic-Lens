import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { readRoutines, saveRoutine, removeRoutine, ROUTINES_EVENT } from '../../lib/routine-store';

const LEVEL_STYLES = {
  avoid: 'border-destructive/30 bg-destructive/5 text-destructive',
  caution: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  info: 'border-border bg-muted text-muted-foreground',
};

const TIMING_STYLES = {
  am: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
  pm: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300',
  either: 'border-border bg-muted text-muted-foreground',
};

const EXAMPLE = [
  { name: 'Exfoliant', ingredients: 'Aqua, Glycolic Acid, Sodium Hydroxide, Aloe Barbadensis Leaf Water, Panthenol' },
  { name: 'Night serum', ingredients: 'Aqua, Retinol, Squalane, Glycerin, Tocopherol' },
  { name: 'Morning serum', ingredients: 'Aqua, Ascorbic Acid, Niacinamide, Ferulic Acid, Propylene Glycol' },
];

function emptyProduct() {
  return { name: '', ingredients: '' };
}

export default function RoutineChecker({ lang, t }) {
  const [products, setProducts] = useState([emptyProduct(), emptyProduct()]);
  const [isPregnant, setIsPregnant] = useState(false);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [savedRoutines, setSavedRoutines] = useState([]);
  const [saveName, setSaveName] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setToken(data?.session?.access_token || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Saved routines (14.7) — localStorage-backed, synced across islands.
  useEffect(() => {
    const sync = () => setSavedRoutines(readRoutines());
    sync();
    window.addEventListener(ROUTINES_EVENT, sync);
    return () => window.removeEventListener(ROUTINES_EVENT, sync);
  }, []);

  const filledCount = useMemo(
    () => products.filter((p) => p.ingredients.trim().length > 0).length,
    [products],
  );

  const updateProduct = (i, field, value) => {
    setProducts((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };
  const addProduct = () => setProducts((prev) => (prev.length >= 5 ? prev : [...prev, emptyProduct()]));
  const removeProduct = (i) =>
    setProducts((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  const loadExample = () => {
    setProducts(EXAMPLE.map((p) => ({ ...p })));
    setResult(null);
    setError(null);
  };
  const clearAll = () => {
    setProducts([emptyProduct(), emptyProduct()]);
    setResult(null);
    setError(null);
  };
  const loadRoutine = (r) => {
    const next = r.products.map((p) => ({ name: p.name || '', ingredients: p.ingredients || '' }));
    while (next.length < 2) next.push(emptyProduct());
    setProducts(next);
    setIsPregnant(!!r.isPregnant);
    setResult(null);
    setError(null);
  };
  const saveCurrent = () => {
    if (filledCount < 2) {
      setError(t.routine.error_need_two);
      return;
    }
    const name =
      saveName.trim() || products.find((p) => p.name.trim())?.name || t.routine.saved_default;
    const saved = saveRoutine({ name, products, isPregnant });
    if (saved) {
      setSaveName('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  const submit = async () => {
    if (filledCount < 2) {
      setError(t.routine.error_need_two);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/routine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ products, language: lang, isPregnant }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 429) {
          setError(data.message || t.routine.error_generic);
        } else if (data.error === 'need_two_products') {
          setError(t.routine.error_need_two);
        } else {
          setError(t.routine.error_generic);
        }
        return;
      }
      setResult(data.result);
    } catch {
      setError(t.routine.error_generic);
    } finally {
      setLoading(false);
    }
  };

  const timingLabel = (timing) => t.routine[timing] || timing;
  const levelLabel = (level) =>
    level === 'avoid' ? t.routine.level_avoid : level === 'caution' ? t.routine.level_caution : t.routine.level_info;

  return (
    <div className="space-y-8">
      {/* Saved routines (14.7) — reopen and re-check as products change */}
      {savedRoutines.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="text-sm font-medium text-foreground mb-2">{t.routine.saved_title}</div>
          <ul className="flex flex-wrap gap-2">
            {savedRoutines.map((r) => (
              <li
                key={r.id}
                className="inline-flex items-center rounded-full border border-border bg-card pl-3 pr-1 py-1 text-sm shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => loadRoutine(r)}
                  title={t.routine.saved_load}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  {r.name}
                  <span className="ml-1 text-xs text-muted-foreground">({r.products.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeRoutine(r.id)}
                  aria-label={t.routine.saved_delete}
                  title={t.routine.saved_delete}
                  className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Product inputs */}
      <div className="space-y-4">
        {products.map((p, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {t.routine.product_heading} {i + 1}
              </span>
              {products.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProduct(i)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  {t.routine.remove}
                </button>
              )}
            </div>
            <input
              type="text"
              value={p.name}
              onChange={(e) => updateProduct(i, 'name', e.target.value)}
              placeholder={t.routine.product_name_placeholder}
              aria-label={`${t.routine.product_name_label} ${i + 1}`}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background mb-2"
            />
            <textarea
              value={p.ingredients}
              onChange={(e) => updateProduct(i, 'ingredients', e.target.value)}
              placeholder={t.routine.ingredients_placeholder}
              aria-label={`${t.routine.ingredients_label} ${i + 1}`}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-y"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addProduct}
          disabled={products.length >= 5}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          {t.routine.add_product}
        </button>
        <button
          type="button"
          onClick={loadExample}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t.routine.example_button}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t.routine.clear}
        </button>
        <div className="flex-grow" />
        <button
          type="button"
          onClick={submit}
          disabled={loading || filledCount < 2}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t.routine.checking : t.routine.check_button}
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isPregnant}
          onChange={(e) => setIsPregnant(e.target.checked)}
          className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
        />
        {t.routine.pregnant_label}
      </label>

      <p className="text-xs text-muted-foreground">{t.routine.min_products_note}</p>

      {/* Save current routine (14.7) */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder={t.routine.save_name_placeholder}
          aria-label={t.routine.save_routine}
          maxLength={80}
          className="h-9 flex-grow min-w-[180px] rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <button
          type="button"
          onClick={saveCurrent}
          disabled={filledCount < 2}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3h11l3 3v13a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z M7 3v5h8M7 21v-7h10v7" />
          </svg>
          {t.routine.save_routine}
        </button>
        {justSaved && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">{t.routine.saved_confirmation}</span>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 border-t border-border pt-6" aria-hidden="true">
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="h-14 rounded-lg border border-border bg-muted/50 animate-pulse" />
            <div className="h-14 rounded-lg border border-border bg-muted/50 animate-pulse" />
          </div>
          <div className="h-16 rounded-lg border border-border bg-muted/50 animate-pulse" />
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <div className="space-y-6 border-t border-border pt-6">
          <div className="flex items-center flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-foreground mr-2">{t.routine.results_title}</h2>
            {result.summary.avoid > 0 && (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEVEL_STYLES.avoid}`}>
                {result.summary.avoid} {t.routine.summary_avoid}
              </span>
            )}
            {result.summary.caution > 0 && (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEVEL_STYLES.caution}`}>
                {result.summary.caution} {t.routine.summary_caution}
              </span>
            )}
            {result.summary.info > 0 && (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEVEL_STYLES.info}`}>
                {result.summary.info} {t.routine.summary_info}
              </span>
            )}
          </div>

          {/* Per-product timing */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {result.products.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.recognizedCount > 0
                      ? p.matchedNames.slice(0, 4).join(', ') + (p.matchedNames.length > 4 ? '…' : '')
                      : t.routine.no_recognized}
                    {p.unmatchedCount > 0 && (
                      <span className="opacity-70">
                        {' '}· {p.unmatchedCount} {t.routine.unmatched_note}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`ml-2 shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TIMING_STYLES[p.timing]}`}>
                  {timingLabel(p.timing)}
                </span>
              </div>
            ))}
          </div>

          {/* Conflicts */}
          {result.conflicts.length === 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {t.routine.no_conflicts}
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{t.routine.conflicts_title}</h3>
              <div className="space-y-2.5">
                {result.conflicts.map((c, i) => (
                  <div key={i} className={`rounded-lg border px-4 py-3 ${LEVEL_STYLES[c.level]}`}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-wide">{levelLabel(c.level)}</span>
                      <span className="text-sm font-medium">
                        {c.termA} + {c.termB}
                      </span>
                      <span className="text-xs opacity-80">
                        {c.a === c.b
                          ? c.productA
                          : `${t.routine.between} ${c.productA} ${t.routine.and} ${c.productB}`}
                      </span>
                    </div>
                    {c.warning && <p className="text-sm opacity-90">{c.warning}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {result.tips.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{t.routine.tips_title}</h3>
              <ul className="space-y-1.5">
                {result.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground/80 border-t border-border pt-4">{t.routine.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
