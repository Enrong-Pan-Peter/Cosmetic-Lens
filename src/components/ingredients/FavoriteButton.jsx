import { useEffect, useState } from 'react';
import { isFavorite, toggleFavorite, FAVORITES_EVENT } from '../../lib/favorites-store';

/**
 * Star toggle for saving an ingredient to "My Shelf" (14.3). localStorage-backed
 * via favorites-store; stays in sync with other stars + the shelf page through
 * the FAVORITES_EVENT. `variant='label'` shows a Save/Saved pill; 'icon' is a
 * bare star.
 */
export default function FavoriteButton({ id, t, variant = 'label' }) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    setFav(isFavorite(id));
    const onChange = () => setFav(isFavorite(id));
    window.addEventListener(FAVORITES_EVENT, onChange);
    return () => window.removeEventListener(FAVORITES_EVENT, onChange);
  }, [id]);

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFav(toggleFavorite(id));
  };

  const label = fav ? t.favorites.saved : t.favorites.save;
  const Star = (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill={fav ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={fav}
        aria-label={fav ? t.favorites.remove : t.favorites.add}
        title={fav ? t.favorites.remove : t.favorites.add}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
          fav
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
        }`}
      >
        {Star}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={fav}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
        fav
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-card text-foreground hover:bg-accent'
      }`}
    >
      {Star}
      {label}
    </button>
  );
}
