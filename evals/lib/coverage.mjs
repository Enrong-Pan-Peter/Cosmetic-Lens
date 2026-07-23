/**
 * Eval coverage math (improvement-plan 10.5).
 *
 * Manages the eval set as a DATASET: which intents × languages × content-types
 * are covered, and where it's thin. Pure (no I/O) so it's unit-tested; the CLI
 * (`node evals/run.mjs --coverage`) loads the datasets and prints the matrices.
 */

/** Count cases grouped by one key → { [key]: count }. */
export function countBy(cases, keyFn) {
  const out = {};
  for (const c of cases || []) {
    const k = keyFn(c) ?? 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

/**
 * 2-D coverage matrix. `thinThreshold` (default 1) flags cells with fewer than
 * that many cases — with the default, every empty (row,col) combo shows up as a
 * gap to fill.
 * @returns {{ rows: string[], cols: string[], cell: (r:string,c:string)=>number, thin: {row:string,col:string,count:number}[] }}
 */
export function coverageMatrix(cases, keyA, keyB, thinThreshold = 1) {
  const rows = new Set();
  const cols = new Set();
  const counts = {};
  for (const c of cases || []) {
    const a = keyA(c) ?? 'unknown';
    const b = keyB(c) ?? 'unknown';
    rows.add(a);
    cols.add(b);
    counts[`${a}::${b}`] = (counts[`${a}::${b}`] || 0) + 1;
  }
  const rowList = [...rows].sort();
  const colList = [...cols].sort();
  const cell = (r, c) => counts[`${r}::${c}`] || 0;

  const thin = [];
  for (const r of rowList) {
    for (const c of colList) {
      const n = cell(r, c);
      if (n < thinThreshold) thin.push({ row: r, col: c, count: n });
    }
  }
  return { rows: rowList, cols: colList, cell, thin };
}
