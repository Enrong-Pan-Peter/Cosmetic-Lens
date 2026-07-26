import { useEffect, useMemo, useState } from 'react';
import { readFavorites, FAVORITES_EVENT } from '../../lib/favorites-store';
import FavoriteButton from './FavoriteButton';

/**
 * "My Shelf" (14.3) — the ingredients the user has starred. Resolves saved ids
 * against a slim index passed from the page, and stays live via FAVORITES_EVENT
 * (removing a star here updates immediately).
 */
export default function MyShelf({ items, lang, t }) {
  const isZh = lang === 'zh';
  const [favIds, setFavIds] = useState([]);

  useEffect(() => {
    const load = () => setFavIds(readFavorites());
    load();
    window.addEventListener(FAVORITES_EVENT, load);
    return () => window.removeEventListener(FAVORITES_EVENT, load);
  }, []);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const saved = favIds.map((id) => byId.get(id)).filter(Boolean);

  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-muted-foreground">{t.favorites.empty}</p>
        <a
          href={`/${lang}/ingredients`}
          className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t.favorites.browse}
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        {saved.length} {t.favorites.count_label}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {saved.map((it) => (
          <div
            key={it.id}
            className="card-hover flex items-start justify-between gap-2 rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <a href={`/${lang}/ingredients/${it.slug}`} className="min-w-0 flex-1">
              <div className="font-medium text-card-foreground">
                {isZh ? it.chinese_name : it.inci_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {isZh ? it.inci_name : it.chinese_name}
              </div>
              {it.blurb && (
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{it.blurb}</p>
              )}
            </a>
            <FavoriteButton id={it.id} t={t} variant="icon" />
          </div>
        ))}
      </div>
    </div>
  );
}
