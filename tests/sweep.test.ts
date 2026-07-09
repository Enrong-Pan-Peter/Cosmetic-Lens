import { describe, expect, it } from 'vitest';
// Pure eval-harness sweep math (plain .mjs, shared with evals/run.mjs).
import { recallAtK, survivalAtThreshold, SWEEP_KS, SWEEP_THRESHOLDS } from '../evals/lib/sweep.mjs';

describe('recallAtK', () => {
  const cases = [
    { ranks: [1], expectCount: 1 }, // hit at rank 1
    { ranks: [5], expectCount: 1 }, // hit at rank 5
    { ranks: [null], expectCount: 1 }, // never found
    { ranks: [2, 7], expectCount: 2 }, // one hit within 3, one at 7
  ];

  it('counts only hits within k', () => {
    // @3: case1 (1/1) + case2 (0) + case3 (0) + case4 (1/2) = (1 + 0 + 0 + 0.5)/4 = 0.375
    expect(recallAtK(cases, 3)).toBeCloseTo(0.375, 5);
  });

  it('is monotonic non-decreasing in k', () => {
    const r3 = recallAtK(cases, 3);
    const r8 = recallAtK(cases, 8);
    expect(r8).toBeGreaterThanOrEqual(r3);
    // @8 everything except the null is found: (1 + 1 + 0 + 1)/4 = 0.75
    expect(recallAtK(cases, 8)).toBeCloseTo(0.75, 5);
  });

  it('handles empty input', () => {
    expect(recallAtK([], 6)).toBe(0);
  });
});

describe('survivalAtThreshold', () => {
  const sims = [0.9, 0.31, 0.22, null, 0.5];

  it('counts found cases above the threshold', () => {
    // found = [0.9, 0.31, 0.22, 0.5]; > 0.3 → 0.9, 0.31, 0.5 = 3/4
    expect(survivalAtThreshold(sims, 0.3)).toBeCloseTo(0.75, 5);
    // > 0.4 → 0.9, 0.5 = 2/4
    expect(survivalAtThreshold(sims, 0.4)).toBeCloseTo(0.5, 5);
  });

  it('excludes not-found (null) cases from the denominator', () => {
    expect(survivalAtThreshold([null, null], 0.3)).toBe(0);
  });
});

describe('grids', () => {
  it('expose sensible defaults', () => {
    expect(SWEEP_KS).toContain(6);
    expect(SWEEP_THRESHOLDS).toContain(0.3);
  });
});
