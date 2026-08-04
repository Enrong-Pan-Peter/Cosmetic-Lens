import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import ClaimsTable from './ClaimsTable';
import DupeSuggestions from './DupeSuggestions';
import { rehypeEmojiIcons, EmojiIcon, normalizeMathDelimiters } from './markdown-icons';

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
// Detect verdict wording (or legacy emoji from old saved chats) in a table
// cell and return a badge class. Uses the 02g status tokens (--safe/--caution);
// the label text and surrounding icons keep the meaning readable without color.
// ---------------------------------------------------------------------------
function getVerdictBadgeClass(children) {
  const text = extractText(children);
  const t = text.toLowerCase();

  // Order matters: "partially supported" must not match the "supported" branch.
  if (/partial|partly|⚠️|⚠/.test(t) || /(部分支持|注意|谨慎)/.test(text)) {
    return 'border border-caution/30 bg-caution-bg text-caution';
  }
  if (/unsupport|not support|❌/.test(t) || /(无支持|避免)/.test(text)) {
    return 'border border-destructive/30 bg-destructive/10 text-destructive';
  }
  if (/unverif|❓/.test(t) || /无法验证/.test(text)) {
    return 'border border-border bg-card text-muted-foreground';
  }
  if (/\bsupported\b|\bsafe\b|✅/.test(t) || /(有支持|安全)/.test(text)) {
    return 'border border-safe/25 bg-safe-bg text-safe';
  }
  return null;
}

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
export default function AnalysisDisplay({
  content,
  lang,
  dupes,
  intent,
  stopped,
  streaming,
  prevUserContent,
  onFindDupes,
  onSimilarIngredients,
}) {
  const [copied, setCopied] = useState(false);
  const { claims, cleanContent } = useMemo(() => {
    const parsed = parseClaimsData(content);
    return { ...parsed, cleanContent: normalizeMathDelimiters(parsed.cleanContent) };
  }, [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const isProductIntent = intent === 'product';
  const isKnowledgeIntent = intent === 'knowledge';
  const isDupeIntent = intent === 'dupe';
  const hasDupes = dupes?.length > 0;

  // Show "Find similar products" only when this was a product analysis,
  // we haven't already shown dupes inline, and we have a prev user message
  // that looks like a product to use as the dupe query (Bug 2/3/5).
  const showFindDupes =
    !streaming &&
    !stopped &&
    isProductIntent &&
    !hasDupes &&
    !isDupeIntent &&
    onFindDupes &&
    prevUserContent;

  const showSimilarIngredients =
    !streaming &&
    !stopped &&
    isKnowledgeIntent &&
    onSimilarIngredients;

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground z-10"
        title={lang === 'zh' ? '复制' : 'Copy'}
        aria-label={lang === 'zh' ? '复制' : 'Copy'}
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-safe" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>

      <div className={`prose-analysis ${streaming ? 'streaming-caret' : ''}`}>
        <ReactMarkdown
          // singleDollarTextMath OFF: "$15 and $30" are prices on this site,
          // not math delimiters. Math uses $$...$$ (inline or own-line block).
          remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
          rehypePlugins={[rehypeKatex, rehypeEmojiIcons]}
          components={{
            'emoji-icon': EmojiIcon,
            table: claims
              ? () => <ClaimsTable claims={claims} lang={lang} />
              : ({ children }) => (
                  <div className="overflow-x-auto my-4 rounded-xl border border-border">
                    <table className="min-w-full border-collapse text-sm">{children}</table>
                  </div>
                ),
            thead: claims
              ? () => null
              : ({ children }) => (
                  <thead className="bg-muted/50 border-b border-border">{children}</thead>
                ),
            tbody: claims
              ? () => null
              : ({ children }) => (
                  <tbody className="divide-y divide-border">{children}</tbody>
                ),
            tr: claims
              ? () => null
              : ({ children }) => (
                  <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
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

      {hasDupes && (
        <DupeSuggestions dupes={dupes} productName={prevUserContent} lang={lang} />
      )}

      {(showFindDupes || showSimilarIngredients) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {showFindDupes && (
            <button
              type="button"
              onClick={() => onFindDupes(prevUserContent)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              {lang === 'zh' ? '找相似产品' : 'Find Similar Products'}
            </button>
          )}
          {showSimilarIngredients && (
            <button
              type="button"
              onClick={() => onSimilarIngredients(prevUserContent)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                <path d="M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z"/>
              </svg>
              {lang === 'zh' ? '相似功效的成分' : 'Similar ingredients'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
