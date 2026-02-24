import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ClaimsTable from './ClaimsTable';

// ---------------------------------------------------------------------------
// Parse the <!-- CLAIMS_DATA [...] --> block from the LLM response
// ---------------------------------------------------------------------------
function parseClaimsData(content) {
  const regex = /<!--\s*CLAIMS_DATA\s*\n([\s\S]*?)\n\s*-->/;
  const match = content.match(regex);

  if (!match) return { claims: null, cleanContent: content };

  try {
    const claims = JSON.parse(match[1].trim());
    const cleanContent = content.replace(regex, '').trim();
    return { claims: Array.isArray(claims) ? claims : null, cleanContent };
  } catch (e) {
    console.warn('Failed to parse CLAIMS_DATA:', e);
    return { claims: null, cleanContent: content };
  }
}

// ---------------------------------------------------------------------------
// Detect verdict emoji in a table cell and return a badge class
// ---------------------------------------------------------------------------
function getVerdictBadgeClass(children) {
  const text = extractText(children);
  if (text.includes('✅')) return 'bg-green-100 text-green-800';
  if (text.includes('⚠️') || text.includes('⚠')) return 'bg-yellow-100 text-yellow-800';
  if (text.includes('❌')) return 'bg-red-100 text-red-800';
  if (text.includes('❓')) return 'bg-gray-100 text-gray-600';
  return null;
}

/** Recursively extract plain text from React children */
function extractText(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node.props?.children) return extractText(node.props.children);
  return '';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AnalysisDisplay({ content, lang }) {
  const [copied, setCopied] = useState(false);
  const { claims, cleanContent } = useMemo(() => parseClaimsData(content), [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="relative group">
      {/* Copy button — top-right, visible on hover */}
      <button
        onClick={handleCopy}
        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground z-10"
        title={lang === 'zh' ? '复制' : 'Copy'}
      >
        {copied ? (
          <svg
            className="w-3.5 h-3.5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>

      <div className="prose-analysis">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // ----- Tables -----
            // If we have structured CLAIMS_DATA, replace every markdown table
            // with the rich ClaimsTable component. The LLM output typically has
            // a single table (Claims Check), so this is safe.
            // Fallback: render styled markdown table with verdict badges.
            table: claims
              ? () => <ClaimsTable claims={claims} lang={lang} />
              : ({ children }) => (
                  <div className="overflow-x-auto my-4 rounded-xl border border-border">
                    <table className="min-w-full border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                ),

            thead: claims
              ? () => null
              : ({ children }) => (
                  <thead className="bg-muted/50 border-b border-border">
                    {children}
                  </thead>
                ),

            tbody: claims
              ? () => null
              : ({ children }) => (
                  <tbody className="divide-y divide-border">{children}</tbody>
                ),

            tr: claims
              ? () => null
              : ({ children }) => (
                  <tr className="hover:bg-muted/30 transition-colors">
                    {children}
                  </tr>
                ),

            th: claims
              ? () => null
              : ({ children }) => (
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {children}
                  </th>
                ),

            td: claims
              ? () => null
              : ({ children }) => {
                  const badge = getVerdictBadgeClass(children);
                  return (
                    <td className="px-4 py-2.5 text-sm text-foreground">
                      {badge ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge}`}
                        >
                          {children}
                        </span>
                      ) : (
                        children
                      )}
                    </td>
                  );
                },

            // ----- Typography -----
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
              <strong className="font-semibold text-foreground">
                {children}
              </strong>
            ),
            p: ({ children }) => (
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                {children}
              </p>
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
            blockquote: ({ children }) => (
              <blockquote className="my-3 border-l-2 border-border pl-4 italic text-muted-foreground text-sm">
                {children}
              </blockquote>
            ),
          }}
        >
          {cleanContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
