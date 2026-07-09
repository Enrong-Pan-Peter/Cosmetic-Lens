/**
 * Execution routing (improvement-plan 8.6).
 *
 * Not every turn needs the full agentic machinery. Greetings and off-topic
 * chatter (`intent: other`) don't benefit from RAG, tools, or the user profile
 * — running them through the tool loop just adds latency and tokens. The router
 * sends those to a FAST path (one no-tools completion with a short persona
 * prompt) and everything substantive to the full AGENTIC path.
 *
 * Pure + tiny so it's unit-testable and cheap to reason about; the intent it
 * keys on is already computed upstream by `classifyLatestIntent`.
 */
import type { ChatIntent } from './intent';

export type ExecutionPlan = 'fast' | 'agentic';

/** Intents that don't need tools/RAG — answered by a single short completion. */
const FAST_INTENTS = new Set<ChatIntent>(['other']);

export function routeIntent(intent: ChatIntent): ExecutionPlan {
  return FAST_INTENTS.has(intent) ? 'fast' : 'agentic';
}

/** Env kill-switch (`FAST_ROUTING=off`) — routing is on by default. */
export function isFastRoutingEnabled(): boolean {
  return String(import.meta.env.FAST_ROUTING ?? '').toLowerCase() !== 'off';
}

/** Short, cheap persona prompt for the fast path (vs the full analysis prompt). */
export function fastPathSystemPrompt(lang: 'en' | 'zh'): string {
  return lang === 'zh'
    ? '你是 CosmeticLens 的护肤成分助手。用户的这条消息是问候或与护肤无关的闲聊。请用一到两句友好、简短的话回应，并温和地引导他们粘贴成分表或询问某个护肤成分。不要编造任何成分分析或事实。'
    : "You are CosmeticLens, a friendly skincare-ingredient assistant. The user's latest message is a greeting or off-topic small talk, not a product or ingredient question. Reply in one or two warm, concise sentences and gently steer them toward pasting an ingredient list or asking about a skincare ingredient. Do not fabricate any ingredient analysis or facts.";
}
