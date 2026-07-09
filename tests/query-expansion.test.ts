import { describe, expect, it } from 'vitest';
import { isFollowUp, extractSubjects, expandQuery } from '../src/lib/query-expansion';

describe('isFollowUp', () => {
  it('flags short, subject-less follow-ups', () => {
    expect(isFollowUp('is it safe at night?')).toBe(true);
    expect(isFollowUp('what about at night?')).toBe(true);
    expect(isFollowUp('晚上可以用吗？')).toBe(true);
  });

  it('does NOT flag self-contained queries that name an ingredient', () => {
    expect(isFollowUp('is niacinamide the same?')).toBe(false);
    expect(isFollowUp('tell me about retinol')).toBe(false);
  });

  it('does NOT flag greetings or long standalone questions', () => {
    expect(isFollowUp('hello there')).toBe(false);
    expect(
      isFollowUp('can you explain how alpha hydroxy acids improve skin texture over time'),
    ).toBe(false);
  });
});

describe('extractSubjects', () => {
  it('returns the most recent ingredient subjects first', () => {
    const prior = [
      'Tell me about niacinamide',
      'Niacinamide helps with oil control',
      'What about retinol?',
    ];
    const subjects = extractSubjects(prior);
    expect(subjects[0]).toBe('Retinol');
    expect(subjects).toContain('Niacinamide');
    expect(subjects.length).toBeLessThanOrEqual(2);
  });

  it('returns empty when no ingredient was mentioned', () => {
    expect(extractSubjects(['hi', 'how does this work?'])).toEqual([]);
  });
});

describe('expandQuery', () => {
  it('re-attaches the recent subject to a follow-up', () => {
    const out = expandQuery('is it safe at night?', ['Tell me about retinol']);
    expect(out).toContain('Retinol');
    expect(out).toContain('is it safe at night?');
    expect(out).not.toBe('is it safe at night?');
  });

  it('leaves self-contained queries unchanged', () => {
    const q = 'is retinol safe during pregnancy?';
    expect(expandQuery(q, ['some earlier text'])).toBe(q);
  });

  it('leaves a follow-up unchanged when no subject can be found', () => {
    const q = 'is it safe?';
    expect(expandQuery(q, ['hello', 'how are you'])).toBe(q);
  });
});
