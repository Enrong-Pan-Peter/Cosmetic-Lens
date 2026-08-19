import { Microscope, SealCheck, BookOpen, TreeStructure, ClockCounterClockwise } from '@phosphor-icons/react';
import AnalysisDisplay from './AnalysisDisplay';

// Deterministic short record number for the analysis-record header (02g).
// Hash of the final content, so saved chats keep stable numbers.
function recordNo(text) {
  let h = 0;
  for (let i = 0; i < (text || '').length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).toUpperCase().padStart(4, '0').slice(0, 4);
}
import AgentTrace from './AgentTrace';
import MessageFeedback from './MessageFeedback';
import ShareButton from './ShareButton';

export default function ChatMessage({
  message,
  lang,
  prevUserContent,
  onFindDupes,
  onSimilarIngredients,
  agentLabels,
  t,
  token,
  chatId,
  onDownloadPdf,
}) {
  const isUser = message.role === 'user';

  // ---- User bubble ----
  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end chat-bubble-enter">
        <div className="max-w-[80%] flex flex-col items-end gap-1.5">
          {message.fromPhoto && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300"
              title={lang === 'zh' ? '此消息的成分由照片自动识别' : 'Ingredients in this message were extracted from a photo'}
            >
              <svg className="w-3 h-3" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                <path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z" />
              </svg>
              {lang === 'zh' ? '已从照片识别' : 'Extracted from photo'}
            </span>
          )}
          {message.photoPreview && (
            <img
              src={message.photoPreview}
              alt={lang === 'zh' ? '上传的照片' : 'Uploaded photo'}
              className="max-h-40 w-auto rounded-xl border border-border object-cover"
              onError={(e) => {
                // Object URLs don't survive a reload; hide a stale one quietly.
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5 text-[15px] text-foreground whitespace-pre-wrap break-words">
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
        {(message.product || message.source || message.cached) && (
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
              <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2 py-0.5 text-[11px] font-medium text-foreground">
                <SealCheck size={12} weight="regular" aria-hidden="true" />
                {lang === 'zh' ? '已验证' : 'Verified'}
              </span>
            )}
            {message.source === 'llm_knowledge' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <BookOpen size={12} weight="regular" aria-hidden="true" />
                {lang === 'zh' ? '基于配方知识' : 'Based on knowledge'}
              </span>
            )}
            {message.source === 'agentic' && message.mode === 'agentic' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <TreeStructure size={12} weight="regular" aria-hidden="true" />
                {lang === 'zh' ? '多源核查' : 'Cross-checked'}
              </span>
            )}
            {message.cached && (
              <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                <ClockCounterClockwise size={12} weight="regular" aria-hidden="true" />
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

        {/* Analysis record header (02g): the answer presents as a numbered document */}
        {!message._streaming && message.intent && (message.content?.length ?? 0) > 400 && (
          <div className="record-head mt-1">
            <span className="rh-label">{lang === 'zh' ? '分析档案' : 'Analysis record'}</span>
            <span className="rh-meta">
              NO. CL-{recordNo(message.content)}
              {Array.isArray(message.sources) && message.sources.length > 0
                ? ` · ${message.sources.length} ${lang === 'zh' ? '个来源' : message.sources.length === 1 ? 'SOURCE' : 'SOURCES'}`
                : ''}
            </span>
          </div>
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

        {/* Provenance chips (P4.2): which KB entries grounded this answer */}
        {!message._streaming && Array.isArray(message.sources) && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">
              {lang === 'zh' ? '资料来源' : 'Sources'}:
            </span>
            {message.sources.slice(0, 6).map((s, i) => (
              <span
                key={`${s.type}-${s.name}-${i}`}
                className="inline-flex items-center rounded-full bg-muted border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                title={lang === 'zh' ? '来自 CosmeticLens 知识库' : 'From the CosmeticLens knowledge base'}
              >
                {s.type ? `${s.type} · ` : ''}{s.name}
              </span>
            ))}
          </div>
        )}

        {/* Further reading (14.5c): peer-reviewed reviews for ingredients named
            in the answer. Deterministically matched server-side — never invented. */}
        {!message._streaming &&
          Array.isArray(message.citations) &&
          message.citations.length > 0 && (
            <div className="mt-2 border-t border-border/60 pt-2">
              <div className="text-[11px] font-medium text-muted-foreground mb-1">
                {lang === 'zh' ? '延伸阅读' : 'Further reading'}
              </div>
              <ul className="space-y-1">
                {message.citations.map((c) => (
                  <li key={c.id} className="text-[11px] leading-snug text-muted-foreground">
                    <span className="text-foreground font-medium">{c.name}</span>
                    {' — '}
                    {(c.refs || []).map((r, i) => (
                      <span key={r.pmid || r.url || i}>
                        {i > 0 && '; '}
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          title={r.title}
                          className="text-primary hover:underline underline-offset-2"
                        >
                          {r.journal || r.title}
                          {r.year ? ` (${r.year})` : ''}
                        </a>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Answer footer: feedback (7.3) + share (12.1) — completed answers only */}
        {t?.feedback &&
          !message._streaming &&
          !message.stopped &&
          typeof message.content === 'string' &&
          message.content.trim().length > 0 && (
            <div className="mt-2 flex items-start justify-between gap-3">
              <MessageFeedback
                lang={lang}
                t={t}
                token={token}
                chatId={chatId}
                query={prevUserContent}
                answer={message.content}
                intent={message.intent}
                pipeline={message.mode || message.source}
              />
              <div className="flex items-center gap-3 shrink-0">
                {onDownloadPdf && (
                  <button
                    type="button"
                    onClick={() => onDownloadPdf({ ...message, _query: prevUserContent })}
                    aria-label={t.share?.download_pdf}
                    title={t.share?.download_pdf}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    PDF
                  </button>
                )}
                {t?.share && (
                  <ShareButton
                    lang={lang}
                    t={t}
                    token={token}
                    content={message.content}
                    title={message.product?.name || prevUserContent}
                    metadata={{
                      source: message.source,
                      intent: message.intent,
                      product: message.product,
                      dupes: message.dupes,
                      sources: message.sources,
                    }}
                  />
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
