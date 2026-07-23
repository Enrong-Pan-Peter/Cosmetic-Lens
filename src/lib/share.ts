/**
 * Shareable-analysis helpers (improvement-plan 12.1).
 *
 * Pure so they're unit-tested; used by /api/share. The share flow snapshots one
 * assistant answer into the public `shared_analyses` table — see
 * supabase/migrations/20260710_shared_analyses.sql for the security invariant
 * (chats stay owner-only; only the snapshot is world-readable).
 */
import { randomBytes } from 'node:crypto';

/** URL-safe, hard-to-guess id for a shared analysis (~12 alphanumerics). */
export function generateShareId(): string {
  return randomBytes(16)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 12);
}

export interface SharePayload {
  title: string | null;
  content: string;
  language: 'en' | 'zh';
  metadata: Record<string, unknown>;
}

const MAX_CONTENT = 20000;
const MAX_TITLE = 200;

/**
 * Validate + normalize a share request body. Returns null when there's nothing
 * worth sharing or the content is implausibly large. Metadata is whitelisted
 * and clipped so a caller can't stuff arbitrary payloads into a public row.
 */
export function sanitizeSharePayload(body: unknown): SharePayload | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const content = typeof b.content === 'string' ? b.content.trim() : '';
  if (!content || content.length > MAX_CONTENT) return null;

  const title = typeof b.title === 'string' && b.title.trim() ? b.title.trim().slice(0, MAX_TITLE) : null;
  const language = b.language === 'zh' ? 'zh' : 'en';

  const rawMeta = (b.metadata && typeof b.metadata === 'object' ? b.metadata : {}) as Record<string, unknown>;
  const metadata: Record<string, unknown> = {};
  if (typeof rawMeta.source === 'string') metadata.source = rawMeta.source.slice(0, 40);
  if (typeof rawMeta.intent === 'string') metadata.intent = rawMeta.intent.slice(0, 40);
  if (rawMeta.product && typeof rawMeta.product === 'object') {
    const p = rawMeta.product as Record<string, unknown>;
    metadata.product = {
      name: String(p.name ?? '').slice(0, 200),
      brand: String(p.brand ?? '').slice(0, 200),
    };
  }
  if (Array.isArray(rawMeta.dupes)) metadata.dupes = rawMeta.dupes.slice(0, 10);
  if (Array.isArray(rawMeta.sources)) metadata.sources = rawMeta.sources.slice(0, 8);

  return { title, content, language, metadata };
}

/** Short plain-text description for the share page's <meta> / og:description. */
export function shareDescription(content: string, max = 160): string {
  const plain = content
    .replace(/<!--[\s\S]*?-->/g, ' ') // strip CLAIMS_DATA comment
    .replace(/[#*_`>|]/g, ' ') // strip markdown punctuation
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}
