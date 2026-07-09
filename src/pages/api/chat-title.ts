import type { APIRoute } from 'astro';
import { callOpenAIChatWithRetry, type ChatMessage } from '../../lib/openai';
import { enforceRateLimit, getClientIp, rateLimitResponse } from '../../lib/rate-limit';
import { logLlmCall } from '../../lib/telemetry';

const MAX_INPUT_CHARS = 600;
const TITLE_FALLBACK_LEN = 40;

const SYSTEM_PROMPT_EN = `You generate short, descriptive titles for skincare chat conversations.
Given the user's first message, produce a concise English title:
- 3–6 words total
- Title Case
- No surrounding quotes, periods, or emojis
- Use the product name if mentioned (e.g. "CeraVe pregnancy safety")
- For knowledge questions, summarize the topic (e.g. "Retinol vitamin C combo")
Output ONLY the title text, nothing else.`;

const SYSTEM_PROMPT_ZH = `你为护肤对话生成简短的标题。
基于用户首条消息生成中文标题：
- 总长不超过 12 个汉字
- 不要加引号、句号、表情
- 如提到产品名，使用产品名（例：CeraVe 孕期安全）
- 知识类问题，总结主题（例：早C晚A搭配）
只输出标题本身，不要任何其他文字。`;

/** Exported for unit tests. */
export function cleanTitle(raw: string): string {
  return raw
    .trim()
    .replace(/^["'「『《]+|["'」』》]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.。!?]+$/g, '')
    .slice(0, 80);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const { message, language = 'en' } = body as { message?: string; language?: string };

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lang = language === 'zh' ? 'zh' : 'en';

    // Cheap endpoint, but still an LLM call — per-IP daily cap.
    const rl = await enforceRateLimit({
      cls: 'light',
      ip: getClientIp(request, clientAddress),
      request,
    });
    if (!rl.allowed) {
      return rateLimitResponse('light', lang, false);
    }

    const trimmed = message.trim().slice(0, MAX_INPUT_CHARS);

    const fallback =
      trimmed.length > TITLE_FALLBACK_LEN
        ? trimmed.slice(0, TITLE_FALLBACK_LEN).trim() + '…'
        : trimmed;

    const messages: ChatMessage[] = [
      { role: 'system', content: lang === 'zh' ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_EN },
      { role: 'user', content: trimmed },
    ];

    const titleStarted = Date.now();
    const result = await callOpenAIChatWithRetry({
      messages,
      temperature: 0.3,
      maxTokens: 30,
    });
    logLlmCall({
      endpoint: 'chat-title',
      model: result.model ?? null,
      promptTokens: result.usage?.prompt_tokens ?? null,
      completionTokens: result.usage?.completion_tokens ?? null,
      latencyMs: Date.now() - titleStarted,
      ok: result.success,
      error: result.success ? null : (result.error ?? 'unknown'),
    });

    if (!result.success || !result.content) {
      return new Response(
        JSON.stringify({ success: true, data: { title: fallback, fallback: true } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const title = cleanTitle(result.content);
    return new Response(
      JSON.stringify({ success: true, data: { title: title || fallback, fallback: !title } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Chat title error:', err);
    return new Response(JSON.stringify({ success: false, error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
