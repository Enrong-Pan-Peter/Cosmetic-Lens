/**
 * Daily rate limiting for public endpoints.
 *
 * Uses the existing `rate_limits` table + `increment_rate_limit()` RPC
 * (atomic upsert-and-increment, returns the new count for today).
 *
 * Strategy: increment first, then compare against the cap — rejected
 * requests still count, so hammering a 429 never resets the clock.
 *
 * Identifiers are namespaced per cost class so one budget can't be
 * drained through a cheaper endpoint:
 *   chat:user_<uuid>   chat:ip_<sha256/16>   vision:ip_<...>   light:ip_<...>
 *
 * FAIL-OPEN by design: if Supabase is unreachable or the RPC is missing,
 * we log and allow the request — availability beats strictness for a
 * demo product. The OpenAI dashboard spend cap is the hard backstop.
 */
import { createHash } from 'node:crypto';
import { createServerClient } from './supabase';

export type RateLimitClass = 'chat' | 'vision' | 'light';

/** Daily caps per class. `anon` keys on hashed IP, `authed` on user id. */
const LIMITS: Record<RateLimitClass, { anon: number; authed: number }> = {
  chat: { anon: 20, authed: 100 }, // LLM conversations (chat, chat-agentic, analyze)
  vision: { anon: 5, authed: 25 }, // image OCR — most expensive per call
  light: { anon: 60, authed: 200 }, // chat-title, OBF passthrough
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

/** First hop of x-forwarded-for (set by Vercel), else the socket address. */
export function getClientIp(request: Request, clientAddress?: string): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return clientAddress || 'unknown';
}

/**
 * Eval/CI bypass: when RATE_LIMIT_BYPASS_TOKEN is set in the environment
 * AND the request carries a matching `x-ratelimit-bypass` header, skip the
 * limit (and skip the increment). Never set that env var in production.
 */
function isBypassed(request?: Request): boolean {
  if (!request) return false;
  const token = import.meta.env.RATE_LIMIT_BYPASS_TOKEN;
  if (!token) return false;
  return request.headers.get('x-ratelimit-bypass') === token;
}

export async function enforceRateLimit(opts: {
  cls: RateLimitClass;
  userId?: string | null;
  ip: string;
  request?: Request;
}): Promise<RateLimitResult> {
  const { cls, userId, ip, request } = opts;
  const authed = Boolean(userId);
  const limit = authed ? LIMITS[cls].authed : LIMITS[cls].anon;

  if (isBypassed(request)) {
    return { allowed: true, limit, remaining: limit };
  }
  const identifier = `${cls}:${authed ? `user_${userId}` : `ip_${hashIp(ip)}`}`;

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_identifier: identifier,
      p_identifier_type: authed ? 'user' : 'ip',
    });
    if (error) throw new Error(error.message);

    const count = typeof data === 'number' ? data : Number(data);
    if (!Number.isFinite(count)) throw new Error(`unexpected RPC result: ${data}`);

    return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count) };
  } catch (err) {
    console.warn('[rate-limit] check failed — failing open:', err);
    return { allowed: true, limit, remaining: limit };
  }
}

/** Seconds until the daily window resets (midnight UTC — matches CURRENT_DATE in the RPC). */
function secondsUntilUtcMidnight(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.floor((next - now.getTime()) / 1000));
}

const MESSAGES: Record<RateLimitClass, { en: [string, string]; zh: [string, string] }> = {
  // [anonymous message, authenticated message]
  chat: {
    en: [
      'Daily free limit reached. Sign in for a higher limit, or come back tomorrow.',
      'Daily chat limit reached. Please come back tomorrow.',
    ],
    zh: ['今日免费次数已用完。登录可获得更高额度，或明天再来。', '今日对话次数已达上限，请明天再来。'],
  },
  vision: {
    en: [
      'Daily image-scan limit reached. Sign in for a higher limit, or come back tomorrow.',
      'Daily image-scan limit reached. Please come back tomorrow.',
    ],
    zh: ['今日图片识别次数已用完。登录可获得更高额度，或明天再来。', '今日图片识别次数已达上限，请明天再来。'],
  },
  light: {
    en: ['Daily request limit reached. Please come back tomorrow.', 'Daily request limit reached. Please come back tomorrow.'],
    zh: ['今日请求次数已达上限，请明天再来。', '今日请求次数已达上限，请明天再来。'],
  },
};

/**
 * Standard 429 JSON response.
 * `error` carries the machine code — ChatInterface's existing
 * `err.message.includes('rate_limit')` mapping shows the localized
 * `t.chat.error_rate_limit` banner. `message` is for API consumers.
 */
export function rateLimitResponse(
  cls: RateLimitClass,
  language: 'en' | 'zh',
  authed: boolean,
): Response {
  const message = MESSAGES[cls][language][authed ? 1 : 0];
  return new Response(
    JSON.stringify({
      success: false,
      error: 'rate_limit_exceeded',
      code: 'rate_limit_exceeded',
      message,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(secondsUntilUtcMidnight()),
      },
    },
  );
}
