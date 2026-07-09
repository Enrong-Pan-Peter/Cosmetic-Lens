/**
 * Deterministic intent eval: replays the SAME golden dataset the eval
 * harness uses (evals/datasets/intent-cases.json) directly against
 * classifyLatestIntent — no server, no LLM, runs in CI on every push.
 * If a heuristic change breaks a case, this fails before it ships.
 */
import { describe, expect, it } from 'vitest';
import { classifyIntent, classifyLatestIntent } from '../src/lib/intent';
import intentGolden from '../evals/datasets/intent-cases.json';

describe('intent golden dataset (60 cases, EN+ZH)', () => {
  for (const c of intentGolden.cases) {
    it(`${c.id} [${c.language}] "${c.messages.at(-1)?.content.slice(0, 40)}" → ${c.expected}`, () => {
      expect(classifyLatestIntent(c.messages)).toBe(c.expected);
    });
  }
});

describe('classifyIntent edge cases', () => {
  it('empty / whitespace / non-string input → other', () => {
    expect(classifyIntent('')).toBe('other');
    expect(classifyIntent('   ')).toBe('other');
    // @ts-expect-error deliberate bad input
    expect(classifyIntent(null)).toBe('other');
    // @ts-expect-error deliberate bad input
    expect(classifyIntent(undefined)).toBe('other');
  });

  it('very long non-list text is never product', () => {
    const long = 'I have been thinking about my skincare journey for a while now and '.repeat(5);
    expect(classifyIntent(long)).not.toBe('product');
  });

  it('previousIntent inheritance requires a follow-up hint', () => {
    expect(classifyIntent('completely unrelated words here', { previousIntent: 'product' })).toBe('other');
    expect(classifyIntent('is this one better?', { previousIntent: 'product' })).toBe('product');
  });

  it('dupe follow-up demotes to knowledge', () => {
    expect(classifyIntent('which of those is best for dry skin?', { previousIntent: 'dupe' })).toBe('knowledge');
  });
});
