import { useState, useMemo } from 'react';
import ArticleCard from './ArticleCard';

export default function ArticleList({ articles, lang, basePath, translations: t }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { value: 'all', label: t.education.categories.all },
    { value: 'basics', label: t.education.categories.basics },
    { value: 'ingredient_types', label: t.education.categories.ingredient_types },
    { value: 'skin_concerns', label: t.education.categories.skin_concerns },
    { value: 'myths', label: t.education.categories.myths },
  ];

  const filtered = useMemo(() => {
    if (selectedCategory === 'all') return articles;
    return articles.filter((a) => a.category === selectedCategory);
  }, [articles, selectedCategory]);

  return (
    <div>
      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Article grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
              lang={lang}
              basePath={basePath}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h3 className="text-lg font-medium text-foreground mb-2">{t.education.coming_soon}</h3>
          <p className="text-muted-foreground">{t.education.coming_soon_desc}</p>
        </div>
      )}
    </div>
  );
}
