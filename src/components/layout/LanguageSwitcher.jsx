import { useState, useMemo, useEffect } from 'react';

/**
 * Build a target href that:
 *   - swaps the `/en` ↔ `/zh` prefix
 *   - preserves the query string (so `?chat=<id>` survives language toggles —
 *     fixes Bug 6 from docs/BUGS.md)
 *   - falls back to the static currentPath when running in SSR.
 */
function buildOtherLangHref(currentPath, lang, search) {
  const pathWithoutLang = currentPath.replace(/^\/(en|zh)/, '');
  const otherLang = lang === 'en' ? 'zh' : 'en';
  return `/${otherLang}${pathWithoutLang || '/'}${search || ''}`;
}

export default function LanguageSwitcher({ lang, currentPath }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // currentPath is passed from Astro (SSR). On the client, also read
  // window.location.search so `?chat=<id>` rides along on language switch.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSearch(window.location.search || '');
    }
  }, []);

  const sameLangHref = useMemo(
    () => `${currentPath}${search}`,
    [currentPath, search],
  );

  const otherLangHref = useMemo(
    () => buildOtherLangHref(currentPath, lang, search),
    [currentPath, lang, search],
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={lang === 'zh' ? '切换语言' : 'Switch language'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
        <span>{lang === 'en' ? 'EN' : '中文'}</span>
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-36 rounded-md border border-border bg-card shadow-md z-20 overflow-hidden"
            role="listbox"
          >
            <a
              href={lang === 'en' ? sameLangHref : otherLangHref}
              role="option"
              aria-selected={lang === 'en'}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                lang === 'en'
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              English
            </a>
            <a
              href={lang === 'zh' ? sameLangHref : otherLangHref}
              role="option"
              aria-selected={lang === 'zh'}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                lang === 'zh'
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              中文
            </a>
          </div>
        </>
      )}
    </div>
  );
}
