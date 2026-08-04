import { describe, expect, it } from 'vitest';
import { isNextGenModel, buildModelParams } from '../src/lib/model-params';

describe('isNextGenModel', () => {
  it('detects GPT-5 family and o-series', () => {
    expect(isNextGenModel('gpt-5.4-mini')).toBe(true);
    expect(isNextGenModel('gpt-5.6-luna')).toBe(true); // current chat primary
    expect(isNextGenModel('gpt-5-mini')).toBe(true);
    expect(isNextGenModel('gpt-5')).toBe(true);
    expect(isNextGenModel('o3')).toBe(true);
    expect(isNextGenModel('o1-mini')).toBe(true);
  });

  it('treats gpt-4o / gpt-4.1 as legacy', () => {
    expect(isNextGenModel('gpt-4o-mini')).toBe(false);
    expect(isNextGenModel('gpt-4.1-mini')).toBe(false);
    expect(isNextGenModel('gpt-4o')).toBe(false);
  });
});

describe('buildModelParams', () => {
  it('uses max_completion_tokens and drops temperature/top_p for next-gen models', () => {
    const p = buildModelParams('gpt-5.4-mini', { temperature: 0.3, maxTokens: 1800, topP: 0.95 });
    expect(p).toEqual({ max_completion_tokens: 1800 });
    expect(p).not.toHaveProperty('max_tokens');
    expect(p).not.toHaveProperty('top_p');
    expect(p).not.toHaveProperty('temperature');
  });

  it('keeps the default temperature (1) for next-gen models when explicitly requested', () => {
    const p = buildModelParams('gpt-5.4-mini', { temperature: 1, maxTokens: 100 });
    expect(p).toEqual({ max_completion_tokens: 100, temperature: 1 });
  });

  it('sends the classic max_tokens + temperature + top_p trio for legacy models', () => {
    const p = buildModelParams('gpt-4o-mini', { temperature: 0.7, maxTokens: 4096, topP: 0.95 });
    expect(p).toEqual({ max_tokens: 4096, temperature: 0.7, top_p: 0.95 });
  });

  it('disables reasoning when function tools ride on a next-gen chat-completions call', () => {
    // gpt-5.6-luna rejects tools + default reasoning effort on /v1/chat/completions
    // ("set reasoning_effort to 'none'"), so toolCalling must pin it off.
    const p = buildModelParams('gpt-5.6-luna', { temperature: 0.3, maxTokens: 1800, toolCalling: true });
    expect(p).toEqual({ max_completion_tokens: 1800, reasoning_effort: 'none' });
  });

  it('omits reasoning_effort without tools and on legacy models', () => {
    expect(buildModelParams('gpt-5.6-luna', { maxTokens: 100 })).not.toHaveProperty('reasoning_effort');
    expect(
      buildModelParams('gpt-4o-mini', { maxTokens: 100, toolCalling: true }),
    ).not.toHaveProperty('reasoning_effort');
  });

  it('omits params that were not provided', () => {
    expect(buildModelParams('gpt-4o-mini', { maxTokens: 512 })).toEqual({ max_tokens: 512 });
    expect(buildModelParams('gpt-5.4-mini', {})).toEqual({});
  });
});
