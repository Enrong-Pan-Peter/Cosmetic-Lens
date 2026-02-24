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

const PRIMARY_MODEL = 'gpt-4.1-mini';
const FALLBACK_MODEL = 'gpt-4o-mini';

async function callOpenAIModel(
  model: string,
  { systemPrompt, userMessage, temperature = 0.7, maxTokens = 4096 }: OpenAIRequest
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
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
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

export async function callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
  // Try primary model first
  const primaryResult = await callOpenAIModel(PRIMARY_MODEL, request);
  if (primaryResult.success) {
    return primaryResult;
  }

  // Fallback to secondary model
  console.warn(`Primary model (${PRIMARY_MODEL}) failed, falling back to ${FALLBACK_MODEL}`);
  return callOpenAIModel(FALLBACK_MODEL, request);
}

// Retry wrapper for rate limiting
export async function callOpenAIWithRetry(
  request: OpenAIRequest,
  maxRetries = 3
): Promise<OpenAIResponse> {
  let lastError: string | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await callOpenAI(request);

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Retry on rate limit (429) or server errors (5xx)
    if (result.error?.includes('429') || result.error?.includes('rate') || result.error?.includes('5')) {
      const waitTime = Math.pow(2, attempt) * 1000;
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    // Don't retry on other errors
    break;
  }

  return { success: false, error: lastError };
}
