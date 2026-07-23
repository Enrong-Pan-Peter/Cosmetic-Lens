/**
 * Regression-gate threshold check (improvement-plan 10.3).
 *
 * Compares measured metrics against committed floors (evals/baseline.json). A
 * metric below its floor — or missing — is a failure. Pure so it's unit-tested
 * and reusable by both the CI gate test (tests/regression-gate.test.ts) and any
 * CLI report.
 */

/**
 * @param {Record<string, number>} actual   measured metric -> value (0..1)
 * @param {Record<string, number>} baseline  metric -> floor (0..1)
 * @returns {{ pass: boolean, failures: {metric: string, actual: number|null, floor: number, delta: number|null}[] }}
 */
export function checkThresholds(actual, baseline) {
  const failures = [];
  for (const [metric, floor] of Object.entries(baseline)) {
    if (typeof floor !== 'number') continue; // skip notes / non-numeric keys
    const a = actual?.[metric];
    if (typeof a !== 'number' || Number.isNaN(a)) {
      failures.push({ metric, actual: null, floor, delta: null });
    } else if (a < floor) {
      failures.push({ metric, actual: a, floor, delta: a - floor });
    }
  }
  return { pass: failures.length === 0, failures };
}

/** One-line human summary of a gate failure list. */
export function formatFailures(failures) {
  return failures
    .map((f) =>
      f.actual === null
        ? `${f.metric}: missing (floor ${(f.floor * 100).toFixed(0)}%)`
        : `${f.metric}: ${(f.actual * 100).toFixed(1)}% < floor ${(f.floor * 100).toFixed(0)}%`,
    )
    .join('; ');
}
