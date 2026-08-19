import { useState } from 'react';
import ThinkingMark from './ThinkingMark';

/**
 * Collapsible "Agent trace" card, rendered as a stepped progress record.
 *
 * Each tool call the model makes during an agentic turn is a step on a
 * vertical connector — check when done, a live thinking mark while running,
 * an X on error — so the trace reads like the analysis record it feeds.
 * While the stream is active the header names the *actual* current stage
 * (the running tool, or "writing" once tools are done); labels map 1:1 to
 * streamed tool events — nothing decorative.
 *
 * Props:
 *   toolCalls   — Array<{ id, name, arguments, status, durationMs?, summary?, success? }>
 *   lang        — 'en' | 'zh'
 *   active      — true while the stream is still running
 *   labels      — { title_thinking, title_done, hide, show, no_tools, running,
 *                   writing?, tools? } (i18n strings; tools maps tool name → label)
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
  const FALLBACK_TOOLS = isZh
    ? {
        search_product: '查询产品信息',
        find_dupes: '查找平替',
        get_ingredient_interactions: '检查相互作用',
        search_knowledge_base: '检索知识库',
        check_routine: '检查护肤搭配',
        compare_products: '对比产品',
      }
    : {
        search_product: 'Looking up product',
        find_dupes: 'Finding dupes',
        get_ingredient_interactions: 'Checking interactions',
        search_knowledge_base: 'Searching knowledge base',
        check_routine: 'Checking routine',
        compare_products: 'Comparing products',
      };
  const toolLabel = (name) => labels.tools?.[name] ?? FALLBACK_TOOLS[name] ?? name;

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
    writing: labels.writing ?? (isZh ? '正在撰写答案…' : 'Writing answer…'),
  };

  const completedCount = toolCalls.filter((t) => t.status === 'done').length;

  // The live stage: name what is ACTUALLY happening right now.
  const runningTool = toolCalls.find((t) => t.status === 'pending');
  const headerLabel = active
    ? runningTool
      ? `${toolLabel(runningTool.name)}…`
      : toolCalls.length > 0
        ? T.writing
        : T.title_thinking
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
            <ThinkingMark size={12} />
          ) : (
            <svg className="w-3 h-3" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M248,124a56.11,56.11,0,0,0-32-50.61V72a48,48,0,0,0-88-26.49A48,48,0,0,0,40,72v1.39a56,56,0,0,0,0,101.2V176a48,48,0,0,0,88,26.49A48,48,0,0,0,216,176v-1.41A56.09,56.09,0,0,0,248,124ZM88,208a32,32,0,0,1-31.81-28.56A55.87,55.87,0,0,0,64,180h8a8,8,0,0,0,0-16H64A40,40,0,0,1,50.67,86.27,8,8,0,0,0,56,78.73V72a32,32,0,0,1,64,0v68.26A47.8,47.8,0,0,0,88,128a8,8,0,0,0,0,16,32,32,0,0,1,0,64Zm104-44h-8a8,8,0,0,0,0,16h8a55.87,55.87,0,0,0,7.81-.56A32,32,0,1,1,168,144a8,8,0,0,0,0-16,47.8,47.8,0,0,0-32,12.26V72a32,32,0,0,1,64,0v6.73a8,8,0,0,0,5.33,7.54A40,40,0,0,1,192,164Z" />
            </svg>
          )}
        </span>
        <span className="flex-1 truncate" aria-live={active ? 'polite' : undefined}>{headerLabel}</span>
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
        <div className="border-t border-border/60 px-3 py-2">
          {toolCalls.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{T.no_tools}</p>
          ) : (
            <div className="relative before:content-[''] before:absolute before:left-[7.5px] before:top-3 before:bottom-3 before:w-px before:bg-border">
              {toolCalls.map((tc, idx) => (
                <TraceRow
                  key={tc.id || idx}
                  call={tc}
                  label={toolLabel(tc.name)}
                  runningLabel={T.running}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TraceRow({ call, label, runningLabel }) {
  const { name, arguments: args, status, summary, success, durationMs } = call;

  const state = status === 'pending' ? 'running' : success === false ? 'error' : 'done';

  const marker =
    state === 'running' ? (
      <span className="relative z-[1] mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-input bg-card">
        <ThinkingMark size={9} className="text-brand" />
      </span>
    ) : state === 'error' ? (
      <span className="relative z-[1] mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
        <svg className="h-2 w-2 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
      </span>
    ) : (
      <span className="relative z-[1] mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-safe/30 bg-safe-bg">
        <svg className="h-2.5 w-2.5 text-safe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4.5 12.5l5 5 10-11" />
        </svg>
      </span>
    );

  const statusBadge =
    state === 'running' ? (
      <span className="text-[10px] text-muted-foreground">{runningLabel}</span>
    ) : state === 'error' ? (
      <span className="text-[10px] font-medium text-destructive">error</span>
    ) : typeof durationMs === 'number' ? (
      <span className="text-[10px] text-muted-foreground tabular-nums font-mono">
        {durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(1)} s`}
      </span>
    ) : null;

  return (
    <div className="flex items-start gap-2.5 py-[5px] text-xs">
      {marker}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className={
              'text-xs font-semibold ' +
              (state === 'running' ? 'text-foreground' : state === 'error' ? 'text-destructive' : 'text-foreground')
            }
            title={name}
          >
            {label}
          </span>
          {statusBadge}
        </div>
        {summary && (
          <p className="font-mono text-[10.5px] text-muted-foreground leading-snug mt-0.5">{summary}</p>
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
