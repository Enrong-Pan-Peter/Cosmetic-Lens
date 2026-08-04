import { useState } from 'react';

/**
 * Collapsible "Agent trace" card.
 *
 * Renders the list of tool calls / results the model made during an agentic
 * turn. Designed to be tucked above the assistant's prose answer so the user
 * sees *what* the agent did before reading the conclusion.
 *
 * Props:
 *   toolCalls   — Array<{ id, name, arguments, status, durationMs?, summary?, success? }>
 *   lang        — 'en' | 'zh'
 *   active      — true while the stream is still running (last tool shows spinner)
 *   labels      — { title_thinking, title_done, hide, show, no_tools }  (i18n strings)
 */
export default function AgentTrace({
  toolCalls = [],
  lang,
  active = false,
  labels = {},
}) {
  const [expanded, setExpanded] = useState(true);

  if (!toolCalls.length && !active) return null;

  const isZh = lang === 'zh';
  const T = {
    title_thinking: labels.title_thinking ?? (isZh ? 'AI 智能体正在工作…' : 'Agent is working…'),
    title_done: (n) =>
      labels.title_done?.(n) ??
      (isZh
        ? `AI 智能体调用了 ${n} 个工具`
        : `Agent used ${n} tool${n === 1 ? '' : 's'}`),
    hide: labels.hide ?? (isZh ? '收起' : 'Hide'),
    show: labels.show ?? (isZh ? '展开' : 'Show'),
    no_tools: labels.no_tools ?? (isZh ? '尚未调用工具' : 'No tool calls yet'),
    running: labels.running ?? (isZh ? '执行中…' : 'Running…'),
  };

  const completedCount = toolCalls.filter((t) => t.status === 'done').length;
  const headerLabel = active
    ? T.title_thinking
    : T.title_done(toolCalls.length);

  return (
    <div className="mb-3 rounded-xl border border-border bg-card/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-accent/40 transition-colors"
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-primary/10 text-primary shrink-0">
          {active ? (
            <span className="thinking-dots scale-75">
              <span></span>
              <span></span>
              <span></span>
            </span>
          ) : (
            <svg className="w-3 h-3" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M248,124a56.11,56.11,0,0,0-32-50.61V72a48,48,0,0,0-88-26.49A48,48,0,0,0,40,72v1.39a56,56,0,0,0,0,101.2V176a48,48,0,0,0,88,26.49A48,48,0,0,0,216,176v-1.41A56.09,56.09,0,0,0,248,124ZM88,208a32,32,0,0,1-31.81-28.56A55.87,55.87,0,0,0,64,180h8a8,8,0,0,0,0-16H64A40,40,0,0,1,50.67,86.27,8,8,0,0,0,56,78.73V72a32,32,0,0,1,64,0v68.26A47.8,47.8,0,0,0,88,128a8,8,0,0,0,0,16,32,32,0,0,1,0,64Zm104-44h-8a8,8,0,0,0,0,16h8a55.87,55.87,0,0,0,7.81-.56A32,32,0,1,1,168,144a8,8,0,0,0,0-16,47.8,47.8,0,0,0-32,12.26V72a32,32,0,0,1,64,0v6.73a8,8,0,0,0,5.33,7.54A40,40,0,0,1,192,164Z" />
            </svg>
          )}
        </span>
        <span className="flex-1 truncate">{headerLabel}</span>
        {!active && toolCalls.length > 0 && (
          <span className="text-[10px] font-normal text-muted-foreground tabular-nums">
            {completedCount}/{toolCalls.length}
          </span>
        )}
        <span className="text-muted-foreground text-[10px] font-normal uppercase tracking-wider">
          {expanded ? T.hide : T.show}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border/60 px-3 py-2 space-y-1.5">
          {toolCalls.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{T.no_tools}</p>
          ) : (
            toolCalls.map((tc, idx) => <TraceRow key={tc.id || idx} call={tc} runningLabel={T.running} />)
          )}
        </div>
      )}
    </div>
  );
}

function TraceRow({ call, runningLabel }) {
  const { name, arguments: args, status, summary, success, durationMs } = call;

  const statusBadge =
    status === 'pending' ? (
      <span className="inline-flex items-center text-[10px] text-muted-foreground gap-1">
        <span className="thinking-dots scale-75">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span>{runningLabel}</span>
      </span>
    ) : success === false ? (
      <span className="text-[10px] font-medium text-destructive">error</span>
    ) : typeof durationMs === 'number' ? (
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(1)} s`}
      </span>
    ) : null;

  return (
    <div className="flex items-start gap-2 text-xs">
      <span
        className={
          'mt-1 inline-block h-1.5 w-1.5 rounded-full shrink-0 ' +
          (status === 'pending'
            ? 'bg-caution animate-pulse'
            : success === false
              ? 'bg-destructive'
              : 'bg-safe')
        }
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <code className="font-mono text-[11px] font-medium text-foreground">{name}</code>
          {statusBadge}
        </div>
        {summary && (
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{summary}</p>
        )}
        {args && Object.keys(args).length > 0 && status === 'pending' && (
          <p className="text-[10px] text-muted-foreground/80 leading-snug mt-0.5 truncate">
            <span className="font-mono">args:</span> {summarizeArgs(args)}
          </p>
        )}
      </div>
    </div>
  );
}

function summarizeArgs(args) {
  if (!args || typeof args !== 'object') return '';
  const entries = Object.entries(args).slice(0, 3);
  return entries
    .map(([k, v]) => {
      let s;
      if (typeof v === 'string') s = v.length > 40 ? v.slice(0, 40) + '…' : v;
      else if (Array.isArray(v)) s = `[${v.length}]`;
      else if (typeof v === 'object' && v !== null) s = '{…}';
      else s = String(v);
      return `${k}=${s}`;
    })
    .join(' · ');
}
