/**
 * LLM call telemetry (improvement-plan P4.6).
 *
 * Fire-and-forget inserts into `llm_calls` (service-role only; see
 * supabase/migrations/20260707_rag_language_telemetry.sql). Failures are
 * logged once and never block or fail a user request. Token counts are
 * REAL (from OpenAI `usage`, enabled via stream_options.include_usage),
 * replacing the chars/4 estimates used by the eval harness.
 */
import { createServerClient } from './supabase';

export interface LlmCallLog {
  endpoint: string; // 'chat' | 'chat-agentic' | 'chat-title' | ...
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  latencyMs?: number | null;
  ok?: boolean;
  error?: string | null;
}

let tableMissingWarned = false;

export function logLlmCall(log: LlmCallLog): void {
  // Deliberately not awaited by callers.
  void (async () => {
    try {
      const supabase = createServerClient();
      const { error } = await supabase.from('llm_calls').insert({
        endpoint: log.endpoint,
        model: log.model ?? null,
        prompt_tokens: log.promptTokens ?? null,
        completion_tokens: log.completionTokens ?? null,
        latency_ms: log.latencyMs ?? null,
        ok: log.ok ?? true,
        error: log.error ? String(log.error).slice(0, 500) : null,
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      if (!tableMissingWarned) {
        tableMissingWarned = true;
        console.warn(
          '[telemetry] llm_calls insert failed (run 20260707_rag_language_telemetry.sql?):',
          err instanceof Error ? err.message : err,
        );
      }
    }
  })();
}
