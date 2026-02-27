import { useState } from 'react';

export default function FunFactCard({ fact, glossaryPath, lang }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-md ${
        isExpanded ? 'shadow-md' : ''
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-4 flex items-center gap-3">
        <span className="text-2xl shrink-0">{fact.icon}</span>
        <h3 className="flex-grow font-medium text-gray-900 text-sm sm:text-base">
          {fact.title}
        </h3>
        <span className={`text-amber-600 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ${
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 pb-4">
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            {fact.content}
          </p>

          {fact.ingredient_link && (
            <a
              href={`${glossaryPath}#${fact.ingredient_link}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium"
            >
              {lang === 'zh' ? '在成分词典中查看' : 'View in glossary'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
