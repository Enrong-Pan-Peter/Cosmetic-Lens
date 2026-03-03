export default function DupeSuggestions({ dupes, productName, lang }) {
  if (!dupes || dupes.length === 0) return null;

  const isZh = lang === 'zh';
  const title = isZh ? '相似产品推荐' : 'Similar Products';
  const priceLabels = {
    budget: isZh ? '平价' : 'Budget',
    mid: isZh ? '中档' : 'Mid-range',
    luxury: isZh ? '高端' : 'Luxury',
  };

  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="space-y-3">
        {dupes.map((d, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-3 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-medium text-foreground">
                  {d.product_name}
                </span>
                {d.brand && (
                  <span className="text-muted-foreground ml-1">· {d.brand}</span>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {priceLabels[d.price_tier] || d.price_tier}
              </span>
            </div>
            {d.key_similarities?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {isZh ? '相似成分：' : 'Key similarities: '}
                {d.key_similarities.join(', ')}
              </p>
            )}
            <p className="text-muted-foreground mt-1.5 leading-relaxed">
              {isZh ? d.notes_zh || d.notes_en : d.notes_en || d.notes_zh}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
