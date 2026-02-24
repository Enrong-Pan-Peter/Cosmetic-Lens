import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function AnalysisDisplay({ content, lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {/* Copy button — appears on hover */}
      <button
        onClick={handleCopy}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title={lang === 'zh' ? '复制' : 'Copy'}
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      <div className="prose-analysis">
        <ReactMarkdown
          components={{
            table: ({ children }) => (
              <div className="overflow-x-auto my-3">
                <table className="w-full border-collapse rounded-md border border-border text-sm">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-muted">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="border border-border px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-border px-3 py-1.5 text-sm text-foreground">
                {children}
              </td>
            ),
            h2: ({ children }) => (
              <h2 className="text-base font-semibold text-foreground mt-5 mb-2 flex items-center gap-2">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-medium text-foreground mt-3 mb-1.5">
                {children}
              </h3>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
            p: ({ children }) => (
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="mb-3 space-y-1.5 pl-0 list-none">{children}</ul>
            ),
            li: ({ children }) => (
              <li className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-foreground/25 shrink-0" />
                <span>{children}</span>
              </li>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
