/**
 * Pure sweep math for retrieval tuning (improvement-plan 8.7).
 *
 * The whole point: one retrieval run at max-k yields the entire grid. Recall@k
 * for any k' <= max-k is just the fraction of expected items whose captured
 * rank is <= k'; threshold survival re-filters the same first-hit similarities.
 * So we never re-embed or re-query per grid cell. No I/O here — unit-tested in
 * tests/sweep.test.ts.
 */

/** Default parameter grids. */
export const SWEEP_KS = [3, 4, 6, 8];
export const SWEEP_THRESHOLDS = [0.2, 0.25, 0.3, 0.35, 0.4];

/**
 * Mean recall@k across cases.
 * @param {{ ranks: (number|null)[], expectCount: number }[]} cases
 * @param {number} k
 * @returns {number} 0..1
 */
export function recallAtK(cases, k) {
  if (!cases || cases.length === 0) return 0;
  let sum = 0;
  for (const c of cases) {
    const found = (c.ranks || []).filter((r) => r != null && r <= k).length;
    sum += c.expectCount ? found / c.expectCount : 0;
  }
  return sum / cases.length;
}

/**
 * Fraction of FOUND cases whose first-hit similarity clears the threshold.
 * (Cases where nothing was found are excluded — they're a recall problem, not
 * a threshold one.)
 * @param {(number|null)[]} firstHitSims
 * @param {number} threshold
 * @returns {number} 0..1
 */
export function survivalAtThreshold(firstHitSims, threshold) {
  const found = (firstHitSims || []).filter((s) => typeof s === 'number' && !Number.isNaN(s));
  if (found.length === 0) return 0;
  return found.filter((s) => s > threshold).length / found.length;
}
