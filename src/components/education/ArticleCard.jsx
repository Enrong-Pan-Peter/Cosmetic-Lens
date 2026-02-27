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
        <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
          <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
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
