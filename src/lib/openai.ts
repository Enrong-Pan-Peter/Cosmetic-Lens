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

const PRIMARY_MODEL = 'gpt-4.1-mini';
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
        temperature,
        max_tokens: maxTokens,
        top_p: 0.95,
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

    return { success: true, content };
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

async function retryLoop(
  attempt: () => Promise<OpenAIResponse>,
  maxRetries = 3,
): Promise<OpenAIResponse> {
  let lastError: string | undefined;

  for (let i = 0; i < maxRetries; i++) {
    const result = await attempt();
    if (result.success) return result;

    lastError = result.error;

    if (result.error?.includes('429') || result.error?.includes('rate') || result.error?.includes('5')) {
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
