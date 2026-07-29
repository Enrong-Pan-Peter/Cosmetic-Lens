#!/usr/bin/env node
/**
 * Before/after comparison for the eval harness.
 *
 * `run.mjs` writes one timestamped JSON per suite into evals/results/. This
 * script reads a saved baseline snapshot (evals/baseline-metrics.json) plus the
 * latest results, then prints a before → after table and writes
 * evals/results/comparison.md. It does no network calls and invents no numbers:
 * every value comes from a real recorded run.
 *
 * The temporal before → after table covers the metrics that compare cleanly
 * across code changes (intent classification and the end-to-end suites).
 * Retrieval is reported separately as hybrid vs dense on the same run, because
 * that is the apples-to-apples question (the retrieval dataset itself changes
 * over time, so a raw temporal recall delta would be misleading).
 *
 * Usage:
 *   node evals/compare.mjs                       # compare latest results vs the baseline
 *   node evals/compare.mjs --save-baseline       # snapshot the LATEST results as the baseline
 *   node evals/compare.mjs --save-baseline --pick first
 *                                                # snapshot the EARLIEST recorded run instead
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pct, round } from './lib/stats.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(HERE, 'results');
const BASELINE_FILE = join(HERE, 'baseline-metrics.json');

const SCALAR_KEYS = new Set(['Retrieval MRR']); // shown as a raw score, not a percentage

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function resultFiles(tag) {
  if (!existsSync(RESULTS_DIR)) return [];
  return readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(`-${tag}.json`))
    .sort()
    .map((f) => join(RESULTS_DIR, f));
}

function pickResultFile(tag, pick) {
  const files = resultFiles(tag);
  if (!files.length) return null;
  return pick === 'first' ? files[0] : files[files.length - 1];
}

/** Temporal metrics (intent + e2e) from the earliest or latest run per suite. */
function metricsFromResults(pick) {
  const out = {};

  const intent = readJson(pickResultFile('intent', pick));
  if (intent) {
    out['Intent accuracy'] = intent.accuracy ?? null;
    out['Intent EN'] = intent.accuracy_by_language?.en ?? null;
    out['Intent ZH'] = intent.accuracy_by_language?.zh ?? null;
  }

  for (const p of ['agentic', 'classic']) {
    const e2e = readJson(pickResultFile(`e2e-${p}`, pick));
    if (e2e) {
      out[`E2E ${p} struct pass`] = e2e.struct_pass_rate ?? null;
      out[`E2E ${p} judge pass`] = e2e.judge_pass_rate ?? null;
    }
  }

  return out;
}

/** Latest retrieval result for a given mode ('hybrid' | 'dense'). */
function latestRetrieval(mode) {
  const files = resultFiles('retrieval').reverse();
  for (const f of files) {
    const j = readJson(f);
    if (!j) continue;
    const m = j.mode ?? 'dense'; // pre-hybrid runs had no mode field
    if (m === mode) {
      const k = j.k ?? 6;
      return { recall: j.overall?.[`recall@${k}`] ?? null, mrr: j.overall?.mrr ?? null, k, total: j.total ?? null };
    }
  }
  return null;
}

function fmtValue(key, v) {
  if (v === null || v === undefined) return '—';
  return SCALAR_KEYS.has(key) ? String(round(v, 2)) : pct(v);
}

function fmtDelta(key, before, after) {
  if (before == null || after == null) return '—';
  if (SCALAR_KEYS.has(key)) {
    const d = round(after - before, 2);
    return d === 0 ? '±0' : `${d > 0 ? '+' : ''}${d}`;
  }
  const d = round((after - before) * 100, 1);
  return d === 0 ? '±0 pp' : `${d > 0 ? '+' : ''}${d} pp`;
}

function saveBaseline(pick) {
  const metrics = metricsFromResults(pick);
  if (Object.keys(metrics).length === 0) {
    console.error(`No intent/e2e result files in ${RESULTS_DIR}. Run evals/run.mjs first.`);
    process.exit(1);
  }
  const payload = {
    _note:
      'Baseline snapshot for evals/compare.mjs (intent + e2e). From real recorded runs in evals/results/. Regenerate: node evals/compare.mjs --save-baseline',
    captured_at: new Date().toISOString(),
    source: pick === 'first' ? 'earliest recorded run per suite' : 'latest recorded run per suite',
    metrics,
  };
  writeFileSync(BASELINE_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Saved baseline (${payload.source}) → ${BASELINE_FILE}`);
  for (const [k, v] of Object.entries(metrics)) console.log(`  ${k}: ${fmtValue(k, v)}`);
}

function buildRetrievalLines() {
  const hybrid = latestRetrieval('hybrid');
  const dense = latestRetrieval('dense');
  if (!hybrid && !dense) return null;
  const lines = [];
  if (hybrid) lines.push(`Current (hybrid): recall@${hybrid.k} ${pct(hybrid.recall)}, MRR ${round(hybrid.mrr, 2)} (${hybrid.total} queries)`);
  if (dense) lines.push(`Dense-only baseline: recall@${dense.k} ${pct(dense.recall)}, MRR ${round(dense.mrr, 2)} (${dense.total} queries)`);
  if (hybrid && dense && hybrid.recall != null && dense.recall != null) {
    lines.push(`Hybrid vs dense: ${fmtDelta('r', dense.recall, hybrid.recall)} recall, ${fmtDelta('Retrieval MRR', dense.mrr, hybrid.mrr)} MRR`);
  }
  return lines;
}

function compare() {
  if (!existsSync(BASELINE_FILE)) {
    console.error(`No baseline at ${BASELINE_FILE}.\nCapture one first:  node evals/compare.mjs --save-baseline`);
    process.exit(1);
  }
  const baseline = readJson(BASELINE_FILE) ?? {};
  const before = baseline.metrics ?? {};
  const after = metricsFromResults('latest');

  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const rows = keys.map((k) => ({
    Metric: k,
    Before: fmtValue(k, before[k]),
    After: fmtValue(k, after[k]),
    Delta: fmtDelta(k, before[k], after[k]),
  }));

  const cols = ['Metric', 'Before', 'After', 'Delta'];
  const widths = Object.fromEntries(cols.map((c) => [c, Math.max(c.length, ...rows.map((r) => String(r[c]).length))]));
  const line = (cells) => cols.map((c) => String(cells[c]).padEnd(widths[c])).join('  ');
  console.log(`\nBefore → after  (baseline captured ${baseline.captured_at ?? 'unknown'})\n`);
  console.log(line({ Metric: 'Metric', Before: 'Before', After: 'After', Delta: 'Delta' }));
  console.log(cols.map((c) => '-'.repeat(widths[c])).join('  '));
  for (const r of rows) console.log(line(r));

  const retrieval = buildRetrievalLines();
  if (retrieval) {
    console.log('\nRetrieval (measured separately — see header note):');
    for (const l of retrieval) console.log(`  ${l}`);
  }

  const md = [
    `# Eval before/after — ${new Date().toISOString().slice(0, 16)}Z`,
    '',
    `Baseline captured: ${baseline.captured_at ?? 'unknown'} (${baseline.source ?? 'n/a'}).`,
    '',
    '| Metric | Before | After | Delta |',
    '|---|---|---|---|',
    ...rows.map((r) => `| ${r.Metric} | ${r.Before} | ${r.After} | ${r.Delta} |`),
    '',
    ...(retrieval ? ['## Retrieval (hybrid vs dense, latest run)', '', ...retrieval.map((l) => `- ${l}`), ''] : []),
    '_Values are read directly from evals/results/. A — means that suite has not been run on one side yet._',
  ].join('\n');
  writeFileSync(join(RESULTS_DIR, 'comparison.md'), md + '\n');
  console.log(`\nmarkdown → evals/results/comparison.md`);
}

function main() {
  const argv = process.argv.slice(2);
  const pick = argv.includes('--pick') ? argv[argv.indexOf('--pick') + 1] : 'latest';
  if (argv.includes('--save-baseline')) saveBaseline(pick === 'first' ? 'first' : 'latest');
  else compare();
}

main();
