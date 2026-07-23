import { describe, expect, it } from 'vitest';
import { generateShareId, sanitizeSharePayload, shareDescription } from '../src/lib/share';

describe('generateShareId', () => {
  it('returns a short url-safe alphanumeric id', () => {
    const id = generateShareId();
    expect(id).toMatch(/^[a-zA-Z0-9]+$/);
    expect(id.length).toBeGreaterThan(6);
    expect(id.length).toBeLessThanOrEqual(12);
  });

  it('is effectively unique across calls', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateShareId()));
    expect(ids.size).toBe(200);
  });
});

describe('sanitizeSharePayload', () => {
  it('rejects empty or oversized content', () => {
    expect(sanitizeSharePayload({ content: '   ' })).toBeNull();
    expect(sanitizeSharePayload({ content: 'x'.repeat(20001) })).toBeNull();
    expect(sanitizeSharePayload(null)).toBeNull();
  });

  it('normalizes language and clips the title', () => {
    const p = sanitizeSharePayload({ content: 'hello', title: 'T'.repeat(300), language: 'fr' })!;
    expect(p.language).toBe('en');
    expect(p.title).toHaveLength(200);
    expect(sanitizeSharePayload({ content: 'x', language: 'zh' })!.language).toBe('zh');
  });

  it('whitelists + clips metadata and drops unknown keys', () => {
    const p = sanitizeSharePayload({
      content: 'answer',
      metadata: {
        source: 'agentic',
        intent: 'product',
        product: { name: 'CeraVe', brand: 'CeraVe', evil: 'x' },
        dupes: new Array(50).fill({ product_name: 'd' }),
        sources: new Array(50).fill({ type: 'ingredient', name: 'niacinamide' }),
        secret: 'should-not-persist',
      },
    })!;
    expect(p.metadata.source).toBe('agentic');
    expect(p.metadata.intent).toBe('product');
    expect((p.metadata.product as any).name).toBe('CeraVe');
    expect((p.metadata.product as any).evil).toBeUndefined();
    expect((p.metadata.dupes as any[]).length).toBe(10);
    expect((p.metadata.sources as any[]).length).toBe(8);
    expect(p.metadata.secret).toBeUndefined();
  });
});

describe('shareDescription', () => {
  it('strips the CLAIMS_DATA comment and markdown, then truncates', () => {
    const content = '# Title\n**Bold** analysis of niacinamide.\n<!-- CLAIMS_DATA\n[{"x":1}]\n-->';
    const d = shareDescription(content, 40);
    expect(d).not.toContain('CLAIMS_DATA');
    expect(d).not.toContain('#');
    expect(d).not.toContain('**');
    expect(d.length).toBeLessThanOrEqual(40);
  });
});
