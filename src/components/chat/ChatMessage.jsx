import { Microscope } from '@phosphor-icons/react';
import AnalysisDisplay from './AnalysisDisplay';
import AgentTrace from './AgentTrace';

export default function ChatMessage({
  message,
  lang,
  prevUserContent,
  onFindDupes,
  onSimilarIngredients,
  agentLabels,
}) {
  const isUser = message.role === 'user';

  // ---- User bubble ----
  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end chat-bubble-enter">
        <div className="max-w-[80%] flex flex-col items-end gap-1.5">
          {message.fromPhoto && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700"
              title={lang === 'zh' ? '此消息的成分由照片自动识别' : 'Ingredients in this message were extracted from a photo'}
            >
              <svg className="w-3 h-3" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                <path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z" />
              </svg>
              {lang === 'zh' ? '已从照片识别' : 'Extracted from photo'}
            </span>
          )}
          <div className="rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
        <div
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground select-none"
          aria-label={lang === 'zh' ? '你' : 'You'}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
          </svg>
        </div>
      </div>
    );
  }

  // ---- Assistant response ----
  return (
    <div className="flex items-start gap-3 chat-bubble-enter">
      <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-primary select-none">
        <Microscope size={16} weight="regular" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Source / product badge row */}
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
            {message.source === 'agentic' && message.mode === 'agentic' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                🤖 {lang === 'zh' ? '智能体式' : 'Agentic'}
              </span>
            )}
            {message.cached && (
              <span className="inline-flex items-center rounded-full bg-muted border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                {lang === 'zh' ? '缓存' : 'Cached'}
              </span>
            )}
          </div>
        )}

        {(message.toolCalls?.length || (message._streaming && message.mode === 'agentic')) && (
          <AgentTrace
            toolCalls={message.toolCalls || []}
            lang={lang}
            active={Boolean(message._streaming)}
            labels={agentLabels}
          />
        )}

        <AnalysisDisplay
          content={message.content}
          lang={lang}
          dupes={message.dupes}
          intent={message.intent}
          stopped={message.stopped}
          streaming={message._streaming}
          prevUserContent={prevUserContent}
          onFindDupes={onFindDupes}
          onSimilarIngredients={onSimilarIngredients}
        />
      </div>
    </div>
  );
}
