/** Tiny stats + formatting helpers for eval reports. */

/**
 * Wilson score interval for a binomial proportion (improvement-plan 10.4).
 * Honest error bars on pass rates — matters because our eval N is small, where
 * the naive normal approximation is unreliable near 0/1.
 * @param {number} successes
 * @param {number} n
 * @param {number} z  z-score (default 1.96 = 95%)
 * @returns {{ phat: number, low: number, high: number }}
 */
export function wilsonInterval(successes, n, z = 1.96) {
  if (!n || n <= 0) return { phat: 0, low: 0, high: 0 };
  const phat = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = phat + z2 / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat)) / n + z2 / (4 * n * n));
  return {
    phat,
    low: Math.max(0, (center - margin) / denom),
    high: Math.min(1, (center + margin) / denom),
  };
}

export function mean(nums) {
  const xs = nums.filter((n) => Number.isFinite(n));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function percentile(nums, p) {
  const xs = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const idx = Math.min(xs.length - 1, Math.ceil((p / 100) * xs.length) - 1);
  return xs[Math.max(0, idx)];
}

export function round(n, digits = 2) {
  if (!Number.isFinite(n)) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function pct(n, digits = 1) {
  if (!Number.isFinite(n)) return 'n/a';
  return `${round(n * 100, digits)}%`;
}

export function ms(n) {
  if (!Number.isFinite(n)) return 'n/a';
  return n >= 1000 ? `${round(n / 1000, 2)}s` : `${Math.round(n)}ms`;
}

/** Render an array of same-keyed objects as a GitHub-flavored markdown table. */
export function mdTable(rows) {
  if (!rows.length) return '_no rows_';
  const keys = Object.keys(rows[0]);
  const head = `| ${keys.join(' | ')} |`;
  const sep = `| ${keys.map(() => '---').join(' | ')} |`;
  const body = rows
    .map((r) => `| ${keys.map((k) => String(r[k] ?? '')).join(' | ')} |`)
    .join('\n');
  return [head, sep, body].join('\n');
}
