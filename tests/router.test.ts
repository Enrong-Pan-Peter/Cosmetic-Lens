import { describe, expect, it } from 'vitest';
import { routeIntent, isFastRoutingEnabled, fastPathSystemPrompt } from '../src/lib/router';

describe('routeIntent', () => {
  it('routes greetings / off-topic to the fast path', () => {
    expect(routeIntent('other')).toBe('fast');
  });

  it('routes substantive intents to the full agentic path', () => {
    expect(routeIntent('product')).toBe('agentic');
    expect(routeIntent('dupe')).toBe('agentic');
    expect(routeIntent('knowledge')).toBe('agentic');
  });
});

describe('isFastRoutingEnabled', () => {
  it('is enabled by default (only FAST_ROUTING=off disables it)', () => {
    expect(isFastRoutingEnabled()).toBe(true);
  });
});

describe('fastPathSystemPrompt', () => {
  it('returns a short persona prompt per language and forbids fabrication', () => {
    const en = fastPathSystemPrompt('en');
    expect(en).toMatch(/CosmeticLens/);
    expect(en.toLowerCase()).toContain('do not fabricate');
    const zh = fastPathSystemPrompt('zh');
    expect(zh).toMatch(/[一-鿿]/);
    // Persona prompts must be far shorter than a full analysis system prompt.
    expect(en.length).toBeLessThan(600);
    expect(zh.length).toBeLessThan(600);
  });
});
