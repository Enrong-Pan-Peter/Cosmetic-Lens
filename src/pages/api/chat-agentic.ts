/**
 * POST /api/chat-agentic
 *
 * Agentic alternative to /api/chat. Instead of pre-injecting product /
 * dupe / RAG context into the prompt, the LLM is given a set of tools and
 * decides which to call (if any). The endpoint runs a bounded tool-call
 * loop (max 4 iterations) and forwards everything as Server-Sent Events.
 *
 * SSE events emitted:
 *
 *   event: intent            data: { intent }                       (once, up-front)
 *   event: meta              data: { source, mode: 'agentic' }      (once, up-front)
 *   event: agent_step        data: { step, status }                 (start of each model call)
 *   event: tool_call         data: { id, name, arguments }          (after tool args are fully assembled)
 *   event: tool_result       data: { id, name, success, durationMs, summary }
 *                                                                   (after each tool finishes)
 *   event: delta             data: { delta }                        (final answer tokens)
 *   event: done              data: {}
 *   event: error             data: { error }
 *
 * The shape of `intent`, `meta`, `delta`, `done`, `error` matches /api/chat
 * so existing consumeChatStream code in the UI works unchanged. Only
 * agent_step / tool_call / tool_result are new.
 */

import type { APIRoute } from 'astro';
import {
  buildSystemPrompt,
  type Language,
} from '../../lib/prompt';
import { classifyLatestIntent, type ChatIntent } from '../../lib/intent';
import {
  OPENAI_TOOLS,
  executeToolCall,
  MAX_TOOL_ITERATIONS,
  type ToolCallRequest,
  type ToolName,
} from '../../lib/tools';
import { createServerClient } from '../../lib/supabase';

export const prerender = false;

const MAX_HISTORY_MESSAGES = 10;
const MODEL = 'gpt-4o-mini';
const TEMPERATURE = 0.3;
const MAX_TOKENS_PER_TURN = 1800;

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

function sseEvent(name: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

function sseError(
  controller: ReadableStreamDefaultController<Uint8Array>,
  error: string,
) {
  try {
    controller.enqueue(sseEvent('error', { error }));
  } catch {
    /* controller may already be closed */
  }
  try {
    controller.close();
  } catch {
    /* idem */
  }
}

// ---------------------------------------------------------------------------
// OpenAI types (subset — what we actually consume)
// ---------------------------------------------------------------------------

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface StreamTurnResult {
  /** Text content streamed in this turn (forwarded to client as `delta` events). */
  textOutput: string;
  /** Fully assembled tool_calls if the model wants to call any. */
  toolCalls: OpenAIToolCall[];
  /** OpenAI finish_reason. */
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | 'unknown';
}

// ---------------------------------------------------------------------------
// Streaming chat call (one turn). Forwards text deltas to client as it goes,
// and accumulates tool_calls without emitting them — that happens after the
// stream completes so the UI sees fully-formed JSON args.
// ---------------------------------------------------------------------------

async function streamOneTurn(
  messages: OpenAIMessage[],
  apiKey: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  signal?: AbortSignal,
  emitDeltas = true,
): Promise<StreamTurnResult> {
  const body = JSON.stringify({
    model: MODEL,
    messages,
    tools: OPENAI_TOOLS,
    tool_choice: 'auto',
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS_PER_TURN,
    stream: true,
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body,
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI ${response.status}: ${text.slice(0, 300)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let textOutput = '';
  let finishReason: StreamTurnResult['finishReason'] = 'unknown';
  // Index → partial OpenAIToolCall (function.arguments built up over deltas).
  const toolCallsByIndex = new Map<number, OpenAIToolCall>();

  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const rawLine = buffer.slice(0, newlineIdx).trimEnd();
        buffer = buffer.slice(newlineIdx + 1);
        if (!rawLine.startsWith('data:')) continue;
        const data = rawLine.slice(5).trim();
        if (data === '[DONE]') {
          // Sometimes OpenAI sends [DONE] without finish_reason in delta.
          if (finishReason === 'unknown') finishReason = 'stop';
          continue;
        }
        let json: any;
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        const choice = json.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta ?? {};

        if (typeof delta.content === 'string' && delta.content.length > 0) {
          textOutput += delta.content;
          if (emitDeltas) {
            controller.enqueue(sseEvent('delta', { delta: delta.content }));
          }
        }

        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = typeof tc.index === 'number' ? tc.index : 0;
            const existing = toolCallsByIndex.get(idx) ?? {
              id: '',
              type: 'function' as const,
              function: { name: '', arguments: '' },
            };
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.function.name = tc.function.name;
            if (typeof tc.function?.arguments === 'string') {
              existing.function.arguments += tc.function.arguments;
            }
            toolCallsByIndex.set(idx, existing);
          }
        }

        if (choice.finish_reason) {
          finishReason = choice.finish_reason;
        }
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* noop */
    }
  }

  const toolCalls = Array.from(toolCallsByIndex.values())
    .filter((tc) => tc.id && tc.function.name)
    // Order doesn't formally matter for parallel tool calls, but preserve
    // index order to make traces deterministic.
    .sort((a, b) => a.id.localeCompare(b.id));

  return { textOutput, toolCalls, finishReason };
}

// ---------------------------------------------------------------------------
// Argument parser — tolerant of model returning empty `{}` etc.
// ---------------------------------------------------------------------------

function parseToolArguments(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' && !Array.isArray(obj)
      ? (obj as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const {
    messages: clientMessages = [],
    language = 'en',
    userId = null,
  } = body as {
    messages: Array<{ role: string; content: string }>;
    language: string;
    userId?: string | null;
  };

  if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: 'No messages provided' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const lang = (language === 'zh' ? 'zh' : 'en') as Language;
  const lastUserMsg = [...clientMessages].reverse().find((m) => m.role === 'user');
  if (!lastUserMsg || typeof lastUserMsg.content !== 'string' || !lastUserMsg.content.trim()) {
    return new Response(
      JSON.stringify({ success: false, error: 'No user message found' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const abortSignal = request.signal;

      try {
        // ---------------------------------------------------------------
        // 0. Intent + (best-effort) profile load
        // ---------------------------------------------------------------
        const intent: ChatIntent = classifyLatestIntent(clientMessages);
        controller.enqueue(sseEvent('intent', { intent }));

        let userProfile: any = null;
        if (userId) {
          try {
            const supabase = createServerClient();
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', userId)
              .single();
            userProfile = data;
          } catch {
            /* continue without profile */
          }
        }

        // ---------------------------------------------------------------
        // 1. Emit a meta event up front so the UI shows the trace card
        // ---------------------------------------------------------------
        controller.enqueue(
          sseEvent('meta', {
            source: 'agentic',
            mode: 'agentic',
          }),
        );

        // ---------------------------------------------------------------
        // 2. Build the conversation we send to OpenAI
        // ---------------------------------------------------------------
        const systemPrompt = buildSystemPrompt(lang, userProfile);
        const agenticGuide = buildAgenticInstructions(lang);

        const messages: OpenAIMessage[] = [
          { role: 'system', content: `${systemPrompt}\n\n${agenticGuide}` },
        ];

        const history = clientMessages.slice(-MAX_HISTORY_MESSAGES);
        for (const m of history) {
          const role = m.role === 'user' ? 'user' : 'assistant';
          const isLastUser = m === lastUserMsg;
          messages.push({
            role,
            content: isLastUser ? `[intent: ${intent}]\n\n${m.content}` : m.content,
          });
        }

        // ---------------------------------------------------------------
        // 3. Tool-call loop
        // ---------------------------------------------------------------
        for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
          if (abortSignal?.aborted) break;

          controller.enqueue(
            sseEvent('agent_step', { step: iter + 1, status: 'thinking' }),
          );

          // Only stream text deltas on the *final* iteration — when the model
          // is still planning (i.e. will issue tool calls), the streamed text
          // is usually filler. We emit deltas optimistically every turn; if
          // the turn ends with tool_calls we don't display whatever buffer
          // came along (it's almost always empty when tool_calls fire).
          const turn = await streamOneTurn(
            messages,
            apiKey,
            controller,
            abortSignal,
            /* emitDeltas */ true,
          );

          // If this turn ends with tool calls, any streamed text was planning
          // filler — tell the client to discard it before the next turn.
          if (turn.toolCalls.length > 0 && turn.textOutput) {
            controller.enqueue(sseEvent('delta_reset', {}));
          }

          // Push the model's assistant message (with its tool_calls if any)
          // BEFORE we run the tools — required by OpenAI's tool-call protocol.
          const assistantMessage: OpenAIMessage = {
            role: 'assistant',
            content: turn.textOutput || null,
          };
          if (turn.toolCalls.length > 0) {
            assistantMessage.tool_calls = turn.toolCalls;
          }
          messages.push(assistantMessage);

          // No more tool calls → final answer was streamed. Done.
          if (turn.toolCalls.length === 0 || turn.finishReason === 'stop') {
            break;
          }

          // ---------------- Execute each tool, append result messages -----
          for (const tc of turn.toolCalls) {
            if (abortSignal?.aborted) break;

            const call: ToolCallRequest = {
              id: tc.id,
              name: tc.function.name as ToolName,
              arguments: parseToolArguments(tc.function.arguments),
            };

            controller.enqueue(
              sseEvent('tool_call', {
                id: call.id,
                name: call.name,
                arguments: call.arguments,
              }),
            );

            const result = await executeToolCall(call, { language: lang });

            const toolResultPayload: Record<string, unknown> = {
              id: result.id,
              name: result.name,
              success: result.success,
              durationMs: result.durationMs,
              summary: result.summary,
            };

            // Optional UI hints — client uses these for badges / dupe cards
            // without parsing the full tool JSON the model sees.
            if (result.success && result.result && typeof result.result === 'object') {
              const r = result.result as Record<string, unknown>;
              if (call.name === 'find_dupes' && r.found && Array.isArray(r.dupes)) {
                toolResultPayload.dupes = r.dupes;
              }
              if (call.name === 'search_product' && r.found) {
                toolResultPayload.verified = true;
              }
            }

            controller.enqueue(sseEvent('tool_result', toolResultPayload));

            messages.push({
              role: 'tool',
              tool_call_id: result.id,
              name: result.name,
              // OpenAI expects a string here; we stringify the structured result.
              content: JSON.stringify(result.result),
            });
          }

          // Loop continues — next iteration the model will see the tool
          // results and either call more tools or produce the final answer.
        }

        controller.enqueue(sseEvent('done', {}));
        try {
          controller.close();
        } catch {
          /* idem */
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          try {
            controller.close();
          } catch {
            /* noop */
          }
          return;
        }
        console.error('chat-agentic error:', err);
        sseError(controller, err instanceof Error ? err.message : 'unexpected error');
      }
    },
    cancel() {
      /* client disconnected */
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};

// ---------------------------------------------------------------------------
// System prompt addendum that teaches the model how to use the tools.
// ---------------------------------------------------------------------------

function buildAgenticInstructions(lang: Language): string {
  const policyEn = `
You have access to the following tools and may call any of them. Plan first, then act:

1. **search_product(query)** — Open Beauty Facts lookup. Call when the user names a specific product. The "ingredients_text" field in the result is the canonical INCI list — use that as ground truth.
2. **find_dupes(target_product)** — Curated + vector dupe lookup. Call ONLY when the user explicitly asks for dupes/alternatives.
3. **get_ingredient_interactions(ingredients[], is_pregnant?)** — Rule engine for safety warnings. Call AFTER you have an ingredient list (from search_product OR pasted by user) so you can surface concrete warnings instead of speculating.
4. **search_knowledge_base(query, limit?)** — RAG over our curated ingredient & interaction docs. Call for general "is X safe?" / "what does Y do?" questions.

Guidelines:
- Don't call tools for greetings, off-topic chatter, or simple follow-ups that don't need new data.
- Prefer calling \`search_product\` once, then \`get_ingredient_interactions\` with the result — do NOT call \`get_ingredient_interactions\` with an empty array.
- Cap yourself to at most 3 tool calls per turn. Quality > quantity.
- After the tools have returned, compose the final answer following the system prompt's existing output rules (Modes A / B / C). Cite verified data when relevant ("✅ Verified data from Open Beauty Facts").
- If a tool returns \`found: false\`, acknowledge it briefly in your answer and fall back to your general knowledge, clearly labeled.`;

  const policyZh = `
你可以调用以下工具，请先规划再行动：

1. **search_product(query)** — Open Beauty Facts 产品查询。用户提到具体产品名时调用。返回的 "ingredients_text" 是权威成分表，请以此为准。
2. **find_dupes(target_product)** — 精选 + 向量平替查询。仅在用户明确要求平替/替代品时调用。
3. **get_ingredient_interactions(ingredients[], is_pregnant?)** — 成分相互作用规则引擎。在你已有成分列表（来自 search_product 或用户粘贴）后调用，给出具体警告而非猜测。
4. **search_knowledge_base(query, limit?)** — 在精选成分与相互作用知识库中检索。通用「X 安全吗？」「Y 有什么作用？」类问题时调用。

规则：
- 闲聊、无关话题或无需新数据的追问，不要调用工具。
- 优先先 \`search_product\` 再 \`get_ingredient_interactions\`；不要用空数组调用 \`get_ingredient_interactions\`。
- 每轮工具调用最多 3 次，质量优先。
- 工具返回后，按系统提示已有的输出规范（模式 A/B/C）撰写最终回答。来自验证数据时请标注「✅ Open Beauty Facts 已验证数据」。
- 若工具返回 \`found: false\`，简短说明后回退到你的常识，并清楚标注。`;

  return lang === 'zh' ? policyZh : policyEn;
}
