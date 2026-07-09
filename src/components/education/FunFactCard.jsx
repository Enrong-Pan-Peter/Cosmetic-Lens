import { useState } from 'react';
import { Lightbulb, CaretDown, ArrowRight } from '@phosphor-icons/react';

/**
 * Did-you-know card. Monochrome Phosphor line icons + design tokens to match
 * the homepage — the emoji icons from fun-facts.json are intentionally not
 * rendered anymore.
 */
export default function FunFactCard({ fact, glossaryPath, lang }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-card border border-border rounded-xl overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-md hover:border-primary/40 ${
        isExpanded ? 'shadow-md' : ''
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-4 flex items-center gap-3">
        <span className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-primary">
          <Lightbulb size={18} weight="regular" aria-hidden="true" />
        </span>
        <h3 className="flex-grow font-medium text-foreground text-sm sm:text-base">
          {fact.title}
        </h3>
        <span
          className={`text-muted-foreground transition-transform duration-300 shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        >
          <CaretDown size={18} weight="regular" aria-hidden="true" />
        </span>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4">
          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
            {fact.content}
          </p>

          {fact.ingredient_link && (
            <a
              href={`${glossaryPath}#${fact.ingredient_link}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-sm text-primary hover:opacity-80 font-medium"
            >
              {lang === 'zh' ? '在成分词典中查看' : 'View in glossary'}
              <ArrowRight size={14} weight="regular" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
