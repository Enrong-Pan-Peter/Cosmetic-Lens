/**
 * Model-aware request parameters for the OpenAI Chat Completions API.
 *
 * Next-gen models (GPT-5 family, o-series) changed the request contract:
 *   - `max_tokens` is rejected → must use `max_completion_tokens`.
 *   - `top_p` and non-default `temperature` are rejected — they only accept
 *     the default sampling settings.
 *
 * Legacy models (gpt-4o, gpt-4.1, …) keep the classic `max_tokens` +
 * `temperature` + `top_p` trio. This helper returns the correct subset for a
 * given model so every call site (chat, agentic, vision, analyze) builds a
 * valid body without duplicating the branching.
 */

export interface SamplingOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  /**
   * Set when the request includes function tools. Newer gpt-5.x models apply a
   * server-side default reasoning effort, and /v1/chat/completions rejects
   * function tools combined with reasoning effort ("Function tools with
   * reasoning_effort are not supported … set reasoning_effort to 'none'").
   * When true, next-gen models get an explicit `reasoning_effort: 'none'`.
   */
  toolCalling?: boolean;
}

/** GPT-5 family and o-series reasoning models use the new parameter contract. */
export function isNextGenModel(model: string): boolean {
  return /^(gpt-5|o\d)/i.test(model.trim());
}

/**
 * Token-limit + sampling params to spread into a Chat Completions body.
 *
 * For next-gen models we send only `max_completion_tokens` and omit
 * temperature/top_p (they'd 400). For legacy models we send the classic trio.
 * Pass whatever your call site wants; the helper drops what the model can't take.
 */
export function buildModelParams(model: string, opts: SamplingOptions = {}): Record<string, number | string> {
  const { temperature, maxTokens, topP, toolCalling } = opts;
  const params: Record<string, number | string> = {};

  if (isNextGenModel(model)) {
    if (typeof maxTokens === 'number') params.max_completion_tokens = maxTokens;
    // temperature (unless default 1) and top_p are unsupported → omit.
    if (typeof temperature === 'number' && temperature === 1) params.temperature = 1;
    // Function tools on /v1/chat/completions require reasoning off (see above).
    if (toolCalling) params.reasoning_effort = 'none';
    return params;
  }

  if (typeof maxTokens === 'number') params.max_tokens = maxTokens;
  if (typeof temperature === 'number') params.temperature = temperature;
  if (typeof topP === 'number') params.top_p = topP;
  return params;
}
