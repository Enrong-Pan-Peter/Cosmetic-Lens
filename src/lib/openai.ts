// ================================================================
// Single-turn interfaces (used by /api/analyze)
// ================================================================

interface OpenAIRequest {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

interface OpenAIResponse {
  success: boolean;
  content?: string;
  error?: string;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

// ================================================================
// Multi-turn interfaces (used by /api/chat)
// ================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

// ================================================================
// Shared internals
// ================================================================

import { logLlmCall } from './telemetry';
import { buildModelParams } from './model-params';

// Primary is gpt-5.4-mini (generous free daily quota). gpt-4o-mini stays as
// the resilience fallback: if the primary errors on connect, we switch once
// and never mid-stream.
const PRIMARY_MODEL = 'gpt-5.4-mini';
const FALLBACK_MODEL = 'gpt-4o-mini';

async function callModel(
  model: string,
  messages: ChatMessage[],
  temperature = 0.7,
  maxTokens = 4096,
): Promise<OpenAIResponse> {
  const apiKey = import.meta.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('OPENAI_API_KEY not configured');
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        ...buildModelParams(model, { temperature, maxTokens, topP: 0.95 }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error (${model}):`, response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'No content in response' };
    }

    return { success: true, content, model, usage: data.usage ?? undefined };
  } catch (error) {
    console.error(`OpenAI API error (${model}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function withFallback(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
): () => Promise<OpenAIResponse> {
  let tried = false;
  return async () => {
    if (!tried) {
      tried = true;
      const r = await callModel(PRIMARY_MODEL, messages, temperature, maxTokens);
      if (r.success) return r;
      console.warn(`Primary model (${PRIMARY_MODEL}) failed, falling back to ${FALLBACK_MODEL}`);
    }
    return callModel(FALLBACK_MODEL, messages, temperature, maxTokens);
  };
}

const RETRYABLE_PATTERN = /\b(429|rate|5\d{2})\b/;

async function retryLoop(
  attempt: () => Promise<OpenAIResponse>,
  maxRetries = 3,
): Promise<OpenAIResponse> {
  let lastError: string | undefined;

  for (let i = 0; i < maxRetries; i++) {
    const result = await attempt();
    if (result.success) return result;

    lastError = result.error;

    if (result.error && RETRYABLE_PATTERN.test(result.error)) {
      const wait = Math.pow(2, i) * 1000;
      console.warn(`Retry ${i + 1}/${maxRetries} after ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    break;
  }

  return { success: false, error: lastError };
}

// ================================================================
// Single-turn API (backward compat for /api/analyze)
// ================================================================

export async function callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
  const messages: ChatMessage[] = [
    { role: 'system', content: request.systemPrompt },
    { role: 'user', content: request.userMessage },
  ];
  const fn = withFallback(messages, request.temperature ?? 0.7, request.maxTokens ?? 4096);
  return fn();
}

export async function callOpenAIWithRetry(
  request: OpenAIRequest,
  maxRetries = 3,
): Promise<OpenAIResponse> {
  const messages: ChatMessage[] = [
    { role: 'system', content: request.systemPrompt },
    { role: 'user', content: request.userMessage },
  ];
  const fn = withFallback(messages, request.temperature ?? 0.7, request.maxTokens ?? 4096);
  return retryLoop(fn, maxRetries);
}

// ================================================================
// Multi-turn chat API (used by /api/chat)
// ================================================================

export async function callOpenAIChat(request: ChatRequest): Promise<OpenAIResponse> {
  const fn = withFallback(request.messages, request.temperature ?? 0.7, request.maxTokens ?? 4096);
  return fn();
}

export async function callOpenAIChatWithRetry(
  request: ChatRequest,
  maxRetries = 3,
): Promise<OpenAIResponse> {
  const fn = withFallback(request.messages, request.temperature ?? 0.7, request.maxTokens ?? 4096);
  return retryLoop(fn, maxRetries);
}

// ================================================================
// Streaming chat API (used by /api/chat for SSE token-by-token output)
// ================================================================

export interface StreamChunk {
  type: 'delta' | 'done' | 'error';
  delta?: string;
  error?: string;
  /** Real token usage (present on 'done' when the API sent a usage frame). */
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export interface StreamRequest extends ChatRequest {
  /**
   * AbortSignal forwarded to fetch. When aborted the iterator finishes and
   * cleans up. Server should pass the request signal here.
   */
  signal?: AbortSignal;
  /**
   * When set, the call is logged to `llm_calls` (P4.6) under this endpoint
   * name, with real token counts from stream_options.include_usage.
   */
  telemetryEndpoint?: string;
}

/**
 * Stream a chat completion. Returns an async iterable of text chunks.
 * Falls back from PRIMARY_MODEL to FALLBACK_MODEL only if the initial
 * connection fails — once tokens have started flowing, we don't switch.
 */
export async function* streamOpenAIChat(
  request: StreamRequest,
): AsyncGenerator<StreamChunk, void, void> {
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) {
    yield { type: 'error', error: 'API key not configured' };
    return;
  }

  const body = JSON.stringify({
    model: PRIMARY_MODEL,
    messages: request.messages,
    ...buildModelParams(PRIMARY_MODEL, {
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? 4096,
      topP: 0.95,
    }),
    stream: true,
    stream_options: { include_usage: true },
  });

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal: request.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    yield { type: 'error', error: (err as Error).message };
    return;
  }

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => '');
    console.warn(
      `OpenAI streaming error (${PRIMARY_MODEL}): ${response.status} ${errorText}; trying fallback`,
    );
    if (request.telemetryEndpoint) {
      logLlmCall({
        endpoint: request.telemetryEndpoint,
        model: PRIMARY_MODEL,
        ok: false,
        error: `HTTP ${response.status}`,
      });
    }
    yield* streamWithModel(FALLBACK_MODEL, request, apiKey);
    return;
  }

  yield* withStreamTelemetry(
    parseSSE(response.body, request.signal),
    request.telemetryEndpoint,
    PRIMARY_MODEL,
  );
}

/**
 * Pass-through generator that records one llm_calls row when the stream
 * finishes (done or error). No-op when endpoint is undefined.
 */
async function* withStreamTelemetry(
  inner: AsyncGenerator<StreamChunk, void, void>,
  endpoint: string | undefined,
  model: string,
): AsyncGenerator<StreamChunk, void, void> {
  if (!endpoint) {
    yield* inner;
    return;
  }
  const started = Date.now();
  let usage: StreamChunk['usage'] = undefined;
  let ok = true;
  let errMsg: string | undefined;
  try {
    for await (const chunk of inner) {
      if (chunk.type === 'done' && chunk.usage) usage = chunk.usage;
      if (chunk.type === 'error') {
        ok = false;
        errMsg = chunk.error;
      }
      yield chunk;
    }
  } finally {
    logLlmCall({
      endpoint,
      model,
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      latencyMs: Date.now() - started,
      ok,
      error: errMsg ?? null,
    });
  }
}

async function* streamWithModel(
  model: string,
  request: StreamRequest,
  apiKey: string,
): AsyncGenerator<StreamChunk, void, void> {
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        ...buildModelParams(model, {
          temperature: request.temperature ?? 0.7,
          maxTokens: request.maxTokens ?? 4096,
          topP: 0.95,
        }),
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: request.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    yield { type: 'error', error: (err as Error).message };
    return;
  }

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => '');
    yield { type: 'error', error: `OpenAI error ${response.status}: ${errorText.slice(0, 200)}` };
    return;
  }

  yield* withStreamTelemetry(parseSSE(response.body, request.signal), request.telemetryEndpoint, model);
}

async function* parseSSE(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let usage: StreamChunk['usage'] = undefined;

  try {
    while (true) {
      if (signal?.aborted) return;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const rawLine = buffer.slice(0, newlineIdx).trimEnd();
        buffer = buffer.slice(newlineIdx + 1);
        if (!rawLine.startsWith('data:')) continue;
        const data = rawLine.slice(5).trim();
        if (data === '[DONE]') {
          yield { type: 'done', usage };
          return;
        }
        try {
          const json = JSON.parse(data);
          // Final usage frame (stream_options.include_usage) has empty choices.
          if (json.usage) usage = json.usage;
          const delta: string | undefined = json.choices?.[0]?.delta?.content;
          if (delta) yield { type: 'delta', delta };
        } catch (err) {
          // Ignore malformed lines (OpenAI occasionally sends keep-alive pings).
        }
      }
    }
    yield { type: 'done', usage };
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    yield { type: 'error', error: (err as Error).message };
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* noop */
    }
  }
}
