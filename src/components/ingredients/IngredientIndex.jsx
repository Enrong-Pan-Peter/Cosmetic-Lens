import { useMemo, useState } from 'react';
import FavoriteButton from './FavoriteButton';

/**
 * Client-side searchable grid of ingredient cards linking to the prerendered
 * detail pages. Receives a slim projection (built in the .astro page) so the
 * full 100-entry database never ships to the browser.
 */
export default function IngredientIndex({ items, categories, lang, t }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const isZh = lang === 'zh';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (category !== 'all' && it.category !== category) return false;
      if (!q) return true;
      return (
        it.inci_name.toLowerCase().includes(q) ||
        (it.chinese_name || '').includes(search) ||
        (it.aliases || []).some((a) => a.toLowerCase().includes(q)) ||
        (it.blurb || '').toLowerCase().includes(q)
      );
    });
  }, [items, search, category, lang]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-grow relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.ingredients.search_placeholder}
            aria-label={t.ingredients.search_placeholder}
            className="w-full h-10 rounded-md border border-input bg-background pl-10 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t.ingredients.all_categories}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <option value="all">{t.ingredients.all_categories}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {isZh ? c.name_zh : c.name_en}
            </option>
          ))}
        </select>
      </div>

      <div className="text-sm text-muted-foreground">
        {t.ingredients.showing} {filtered.length} {t.ingredients.of} {items.length}{' '}
        {t.ingredients.ingredients_word}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-muted-foreground">{t.ingredients.no_results}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it) => (
            <div key={it.id} className="relative">
              <a
                href={`/${lang}/ingredients/${it.slug}`}
                className="card-hover group flex h-full flex-col rounded-xl border border-border bg-card p-4 pr-12 shadow-sm hover:border-primary/40 hover:bg-accent/40"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-card-foreground">
                    {isZh ? it.chinese_name : it.inci_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isZh ? it.inci_name : it.chinese_name}
                  </span>
                </div>
                {it.blurb && (
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{it.blurb}</p>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {t.ingredients.view_details}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </a>
              <div className="absolute top-3 right-3">
                <FavoriteButton id={it.id} t={t} variant="icon" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
