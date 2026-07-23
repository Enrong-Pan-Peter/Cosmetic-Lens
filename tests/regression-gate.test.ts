/**
 * CI regression gate (improvement-plan 10.3).
 *
 * Computes aggregate intent accuracy (overall + per language) from the golden
 * dataset via the PURE classifier — no server, no egress — and fails if any
 * metric drops below its committed floor in evals/baseline.json. This is the
 * metric-with-floor gate that complements the strict per-case intent test:
 * it's what would have caught a broad heuristic regression (or a bad model
 * swap on a deterministic path) as a single, legible number.
 */
import { describe, expect, it } from 'vitest';
import { classifyLatestIntent } from '../src/lib/intent';
import intentGolden from '../evals/datasets/intent-cases.json';
import baseline from '../evals/baseline.json';
import { checkThresholds, formatFailures } from '../evals/lib/gate.mjs';
import { wilsonInterval } from '../evals/lib/stats.mjs';

type Case = { language: string; messages: { role: string; content: string }[]; expected: string };

function score(cases: Case[]) {
  let correct = 0;
  for (const c of cases) {
    if (classifyLatestIntent(c.messages) === c.expected) correct++;
  }
  return { correct, n: cases.length, acc: cases.length ? correct / cases.length : 0 };
}

describe('CI regression gate — intent accuracy floors', () => {
  const all = intentGolden.cases as Case[];
  const en = all.filter((c) => c.language === 'en');
  const zh = all.filter((c) => c.language === 'zh');

  const actual = {
    overall: score(all).acc,
    en: score(en).acc,
    zh: score(zh).acc,
  };

  it('meets committed baseline floors (evals/baseline.json)', () => {
    const res = checkThresholds(actual, baseline.intent);
    // Surface the actual numbers on failure so CI logs are self-explanatory.
    if (!res.pass) throw new Error(`Intent regression gate FAILED — ${formatFailures(res.failures)}`);
    expect(res.pass).toBe(true);
  });

  it('reports a 95% Wilson CI on overall accuracy (rigor, bounds sanity)', () => {
    const s = score(all);
    const ci = wilsonInterval(s.correct, s.n);
    const EPS = 1e-9; // Wilson bounds hit exactly 0/1 only up to float rounding.
    expect(ci.low).toBeLessThanOrEqual(ci.phat + EPS);
    expect(ci.high + EPS).toBeGreaterThanOrEqual(ci.phat);
    expect(ci.low).toBeGreaterThanOrEqual(0);
    expect(ci.high).toBeLessThanOrEqual(1);
  });
});
