import { BookOpen } from '@phosphor-icons/react';

export default function ArticleCard({ article, lang, basePath }) {
  return (
    <a
      href={`${basePath}/${article.slug}`}
      className="group block bg-background rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
    >
      {article.image ? (
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-muted/40 border-b border-border flex items-center justify-center">
          <BookOpen size={40} weight="regular" className="text-muted-foreground/50" aria-hidden="true" />
        </div>
      )}

      <div className="p-5">
        {article.category && (
          <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mb-3">
            {article.category}
          </span>
        )}

        <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-2">
          {article.title}
        </h3>

        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
          {article.description}
        </p>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{article.readingTime} {lang === 'zh' ? '分钟阅读' : 'min read'}</span>
          <span className="text-primary group-hover:translate-x-1 transition-transform">
            &rarr;
          </span>
        </div>
      </div>
    </a>
  );
}
