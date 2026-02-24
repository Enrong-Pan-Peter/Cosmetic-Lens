import { Microscope } from '@phosphor-icons/react';
import AnalysisDisplay from './AnalysisDisplay';

export default function ChatMessage({ message, lang }) {
  const isUser = message.role === 'user';

  // ---- User bubble ----
  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end chat-bubble-enter">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5 text-sm text-foreground">
          {message.content}
        </div>
        <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs select-none">
          👤
        </div>
      </div>
    );
  }

  // ---- Assistant response (no card, clean text) ----
  return (
    <div className="flex items-start gap-3 chat-bubble-enter">
      <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-primary select-none">
        <Microscope size={16} weight="regular" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Product info + source badge row */}
        {(message.product || message.source) && (
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-2">
            {message.product?.name && (
              <span className="text-sm font-medium text-foreground">
                {message.product.name}
                {message.product.brand && (
                  <span className="font-normal text-muted-foreground">
                    {' '}· {message.product.brand}
                  </span>
                )}
              </span>
            )}

            {message.source === 'verified' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700">
                ✅ {lang === 'zh' ? '已验证' : 'Verified'}
              </span>
            )}
            {message.source === 'llm_knowledge' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                ⚠️ {lang === 'zh' ? '基于配方知识' : 'Based on knowledge'}
              </span>
            )}
            {message.cached && (
              <span className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
                {lang === 'zh' ? '缓存' : 'Cached'}
              </span>
            )}
          </div>
        )}

        <AnalysisDisplay content={message.content} lang={lang} />
      </div>
    </div>
  );
}
