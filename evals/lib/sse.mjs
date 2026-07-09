/**
 * SSE client for /api/chat and /api/chat-agentic.
 *
 * Mirrors the wire contract in docs/architecture.md §6.2 / §7.4:
 * frames are `event: <name>\ndata: <json>\n\n`; events include
 * intent, meta, agent_step, tool_call, tool_result, delta_reset,
 * delta, done, error.
 */
import { CONFIG } from './env.mjs';

/**
 * Run one chat case against a pipeline endpoint.
 *
 * @param {object} opts
 * @param {string} opts.endpoint          e.g. '/api/chat-agentic'
 * @param {Array}  opts.messages          [{ role, content }]
 * @param {string} opts.language          'en' | 'zh'
 * @param {boolean} [opts.abortAfterIntent=false]  stop as soon as intent arrives (cheap intent-only runs)
 * @param {number} [opts.timeoutMs=90000]
 * @returns {Promise<{intent, meta, text, toolCalls, error, timings}>}
 */
export async function runChatCase({
  endpoint,
  messages,
  language,
  abortAfterIntent = false,
  timeoutMs = 90_000,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  const result = {
    intent: null,
    meta: null,
    text: '',
    toolCalls: [],
    error: null,
    timings: { ttfbMs: null, firstDeltaMs: null, totalMs: null },
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (CONFIG.rateLimitBypassToken) {
      headers['x-ratelimit-bypass'] = CONFIG.rateLimitBypassToken;
    }

    const res = await fetch(`${CONFIG.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, language }),
      signal: controller.signal,
    });

    result.timings.ttfbMs = Math.round(performance.now() - started);

    if (!res.ok || !res.body) {
      let detail = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        detail += `: ${j?.error || j?.message || ''}`;
      } catch {
        /* not JSON */
      }
      result.error = detail;
      return result;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Frames are separated by a blank line.
      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        let event = null;
        let data = null;
        for (const line of frame.split('\n')) {
          if (line.startsWith('event: ')) event = line.slice(7).trim();
          else if (line.startsWith('data: ')) {
            try {
              data = JSON.parse(line.slice(6));
            } catch {
              data = null;
            }
          }
        }
        if (!event) continue;

        switch (event) {
          case 'intent':
            result.intent = data?.intent ?? null;
            if (abortAfterIntent) {
              controller.abort();
              break outer;
            }
            break;
          case 'meta':
            result.meta = data;
            break;
          case 'tool_call':
            result.toolCalls.push({
              id: data?.id,
              name: data?.name,
              arguments: data?.arguments,
              status: 'called',
            });
            break;
          case 'tool_result': {
            const tc = result.toolCalls.find((t) => t.id === data?.id);
            if (tc) {
              tc.status = data?.success ? 'ok' : 'failed';
              tc.durationMs = data?.durationMs;
              tc.summary = data?.summary;
            }
            if (data?.dupes) result.meta = { ...(result.meta || {}), dupes: data.dupes };
            break;
          }
          case 'delta_reset':
            result.text = '';
            break;
          case 'delta':
            if (result.timings.firstDeltaMs === null) {
              result.timings.firstDeltaMs = Math.round(performance.now() - started);
            }
            result.text += data?.delta ?? '';
            break;
          case 'error':
            result.error = data?.error || 'stream error';
            break outer;
          case 'done':
            break outer;
          default:
            break; // agent_step and future events: ignore
        }
      }
    }
  } catch (err) {
    if (!(abortAfterIntent && result.intent !== null)) {
      result.error = result.error || err?.message || String(err);
    }
  } finally {
    clearTimeout(timeout);
    result.timings.totalMs = Math.round(performance.now() - started);
  }

  return result;
}
