import AnalysisDisplay from './AnalysisDisplay';

export default function ChatMessage({ message, lang }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} chat-bubble-enter`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full border ${
            isUser ? 'border-border bg-secondary' : 'border-border bg-card'
          }`}>
            {isUser ? '👤' : '🔍'}
          </div>

          {/* Message content */}
          <div className={`flex-grow ${isUser ? 'text-right' : ''}`}>
            {isUser ? (
              <div className="inline-block rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                {message.content}
              </div>
            ) : (
              <div className="rounded-xl rounded-tl-sm border border-border bg-card p-5 shadow-sm">
                {/* Product info header + source badge */}
                <div className="flex items-center gap-3 pb-3 mb-3 border-b border-border">
                  {message.product?.image && (
                    <img
                      src={message.product.image}
                      alt={message.product?.name || ''}
                      className="w-10 h-10 object-cover rounded-md border border-border"
                    />
                  )}

                  {message.product && (
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-card-foreground truncate">
                        {message.product.name}
                      </div>
                      {message.product.brand && (
                        <div className="text-xs text-muted-foreground">
                          {message.product.brand}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Source / confidence badge */}
                  <div className="ml-auto shrink-0 flex items-center gap-2">
                    {message.source === 'verified' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <span>✅</span>
                        {lang === 'zh' ? '已验证成分' : 'Verified ingredients'}
                      </span>
                    )}
                    {message.source === 'llm_knowledge' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <span>⚠️</span>
                        {lang === 'zh' ? '基于常见配方' : 'Based on typical formulation'}
                      </span>
                    )}
                    {message.cached && (
                      <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {lang === 'zh' ? '缓存' : 'Cached'}
                      </span>
                    )}
                  </div>
                </div>

                <AnalysisDisplay
                  content={message.content}
                  lang={lang}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
