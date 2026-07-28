import { useState } from 'react';
import FavoriteButton from '../ingredients/FavoriteButton';

/**
 * "What helps with…?" concern search (7.6). Calls /api/concern-search and links
 * results into the ingredient detail pages. Debounced-on-submit; example chips
 * seed a good first query.
 */
export default function ConcernSearch({ lang, t }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { concerns, ingredients }
  const isZh = lang === 'zh';

  const run = async (q) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setQuery(term);
    setLoading(true);
    try {
      const res = await fetch(`/api/concern-search?q=${encodeURIComponent(term)}&lang=${lang}`);
      const data = await res.json();
      setResult(data.success ? { concerns: data.concerns, ingredients: data.ingredients } : { concerns: [], ingredients: [] });
    } catch {
      setResult({ concerns: [], ingredients: [] });
    } finally {
      setLoading(false);
    }
  };

  const examples = isZh
    ? ['泛红舒缓', '美白淡斑', '控油', '抗老皱纹']
    : ['redness', 'dark spots', 'oily skin', 'fine lines'];

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">{t.concern.title}</h2>
      <p className="text-sm text-muted-foreground mt-0.5">{t.concern.subtitle}</p>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder={t.concern.placeholder}
          aria-label={t.concern.title}
          className="flex-grow h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <button
          type="button"
          onClick={() => run()}
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? t.concern.searching : t.concern.search}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => run(ex)}
            className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-background p-3">
              <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
              <div className="mt-2 h-3 w-full rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && result && (
        <div className="mt-4">
          {result.ingredients.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.concern.no_results}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {t.concern.results_prefix} {result.ingredients.length}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {result.ingredients.map((it) => (
                  <div key={it.id} className="relative">
                    <a
                      href={`/${lang}/ingredients/${it.slug}`}
                      className="card-hover flex h-full flex-col rounded-lg border border-border bg-background p-3 pr-11 hover:border-primary/40 hover:bg-accent/40"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-card-foreground">
                          {isZh ? it.chinese_name : it.inci_name}
                        </span>
                        {it.evidence_level === 'strong' && (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">{t.concern.strong}</span>
                        )}
                      </div>
                      {it.blurb && <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{it.blurb}</span>}
                    </a>
                    <div className="absolute top-2 right-2">
                      <FavoriteButton id={it.id} t={t} variant="icon" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
