import { describe, expect, it } from 'vitest';
import { wilsonInterval } from '../evals/lib/stats.mjs';
import { checkThresholds, formatFailures } from '../evals/lib/gate.mjs';
import { feedbackRowToCandidate, dedupeCandidates } from '../evals/lib/feedback.mjs';

describe('wilsonInterval (10.4)', () => {
  it('brackets the point estimate', () => {
    const ci = wilsonInterval(5, 10);
    expect(ci.phat).toBe(0.5);
    expect(ci.low).toBeLessThan(0.5);
    expect(ci.high).toBeGreaterThan(0.5);
  });

  it('for a perfect score gives an upper bound of 1 and a lower bound below 1', () => {
    const ci = wilsonInterval(10, 10);
    expect(ci.phat).toBe(1);
    expect(ci.high).toBeCloseTo(1, 9); // exactly 1 up to float rounding
    expect(ci.low).toBeGreaterThan(0);
    expect(ci.low).toBeLessThan(1);
  });

  it('handles n = 0 without NaN', () => {
    expect(wilsonInterval(0, 0)).toEqual({ phat: 0, low: 0, high: 0 });
  });

  it('narrows as n grows', () => {
    const small = wilsonInterval(9, 10);
    const large = wilsonInterval(900, 1000);
    expect(large.high - large.low).toBeLessThan(small.high - small.low);
  });
});

describe('checkThresholds (10.3)', () => {
  it('passes when every metric meets its floor', () => {
    const res = checkThresholds({ overall: 1, en: 1, zh: 1 }, { overall: 0.95, en: 0.95, zh: 0.9 });
    expect(res.pass).toBe(true);
    expect(res.failures).toEqual([]);
  });

  it('fails a metric below its floor and reports the delta', () => {
    const res = checkThresholds({ overall: 0.8 }, { overall: 0.95 });
    expect(res.pass).toBe(false);
    expect(res.failures[0].metric).toBe('overall');
    expect(res.failures[0].delta).toBeCloseTo(-0.15, 5);
    expect(formatFailures(res.failures)).toContain('overall');
  });

  it('treats a missing metric as a failure and ignores non-numeric baseline keys', () => {
    const res = checkThresholds({ en: 1 }, { overall: 0.95, _note: 'x' as unknown as number });
    expect(res.pass).toBe(false);
    expect(res.failures).toHaveLength(1);
    expect(res.failures[0].actual).toBeNull();
  });
});

describe('feedbackRowToCandidate + dedupeCandidates (10.1)', () => {
  it('routes substantive intents to the e2e suite and others to intent', () => {
    expect(feedbackRowToCandidate({ rating: 'down', intent: 'knowledge' }).suggested_suite).toBe('e2e');
    expect(feedbackRowToCandidate({ rating: 'down', intent: 'other' }).suggested_suite).toBe('intent');
  });

  it('normalizes language and truncates the answer excerpt', () => {
    const c = feedbackRowToCandidate({ language: 'fr', answer: 'x'.repeat(500) });
    expect(c.language).toBe('en');
    expect(c.answer_excerpt).toHaveLength(280);
  });

  it('dedupes by normalized query + language, counting and sorting by frequency', () => {
    const rows = [
      { rating: 'down', language: 'en', query: 'Is retinol safe?', reason: 'wrong' },
      { rating: 'down', language: 'en', query: 'is   RETINOL safe?', reason: 'missing sources' },
      { rating: 'down', language: 'en', query: 'what is niacinamide', reason: 'ok' },
    ].map(feedbackRowToCandidate);
    const deduped = dedupeCandidates(rows);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].count).toBe(2);
    expect(deduped[0].reasons).toContain('wrong');
    expect(deduped[0].reasons).toContain('missing sources');
  });
});
