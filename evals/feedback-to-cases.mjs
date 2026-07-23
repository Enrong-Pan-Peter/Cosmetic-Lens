/**
 * feedback-to-cases (improvement-plan 10.1) — the eval flywheel.
 *
 * Pulls 👎 rows from the `feedback` table (Supabase), turns them into candidate
 * eval cases, dedupes, and writes a triage file you review and promote into the
 * golden datasets (evals/datasets/*.json). Closes the loop: user feedback →
 * eval set → measured fix.
 *
 * Usage:
 *   node evals/feedback-to-cases.mjs                 # last 200 down-votes
 *   node evals/feedback-to-cases.mjs --rating all --limit 500
 *   node evals/feedback-to-cases.mjs --since 2026-07-01
 *
 * Needs PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env (same as the app).
 * Output: evals/triage/feedback-<timestamp>.{json,md}
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from './lib/env.mjs';
import { feedbackRowToCandidate, dedupeCandidates } from './lib/feedback.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRIAGE_DIR = join(HERE, 'triage');

function parseArgs(argv) {
  const args = { rating: 'down', limit: 200, since: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--rating') args.rating = argv[++i];
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--since') args.since = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node evals/feedback-to-cases.mjs [--rating down|up|all] [--limit N] [--since YYYY-MM-DD]');
      process.exit(0);
    }
  }
  return args;
}

async function fetchFeedback(args) {
  const params = new URLSearchParams({
    select: 'rating,reason,intent,pipeline,language,query,answer,created_at',
    order: 'created_at.desc',
    limit: String(args.limit),
  });
  if (args.rating !== 'all') params.set('rating', `eq.${args.rating}`);
  if (args.since) params.set('created_at', `gte.${args.since}`);

  const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/feedback?${params}`, {
    headers: {
      apikey: CONFIG.supabaseServiceKey,
      Authorization: `Bearer ${CONFIG.supabaseServiceKey}`,
    },
  });
  if (!res.ok) {
    throw new Error(`feedback fetch ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

function toMarkdown(candidates, args) {
  const lines = [
    `# Feedback triage — ${new Date().toISOString()}`,
    '',
    `Source: \`feedback\` table · rating=${args.rating}${args.since ? ` · since ${args.since}` : ''} · ${candidates.length} unique candidate(s)`,
    '',
    'Review each, then promote the real failures into `evals/datasets/intent-cases.json` (intent) or `evals/datasets/e2e-cases.json` (answer quality). Delete the noise.',
    '',
  ];
  candidates.forEach((c, i) => {
    lines.push(`## ${i + 1}. [${c.language}] ${c.suggested_suite.toUpperCase()} · reported ×${c.count}`);
    lines.push('');
    lines.push(`- **Query:** ${c.query || '(empty)'}`);
    if (c.intent) lines.push(`- **Classified intent:** ${c.intent}${c.pipeline ? ` · ${c.pipeline}` : ''}`);
    if (c.reasons.length) lines.push(`- **Reasons:** ${c.reasons.map((r) => `“${r}”`).join(', ')}`);
    if (c.answer_excerpt) lines.push(`- **Answer excerpt:** ${c.answer_excerpt.replace(/\n+/g, ' ')}`);
    lines.push('');
    lines.push('- [ ] promote  - [ ] discard');
    lines.push('');
  });
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);

  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) {
    console.error('Missing PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env — cannot read feedback.');
    process.exit(1);
  }

  const rows = await fetchFeedback(args);
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('No feedback rows matched. (Have any 👎 been submitted yet?)');
    return;
  }

  const candidates = dedupeCandidates(rows.map(feedbackRowToCandidate));

  mkdirSync(TRIAGE_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const jsonPath = join(TRIAGE_DIR, `feedback-${stamp}.json`);
  const mdPath = join(TRIAGE_DIR, `feedback-${stamp}.md`);
  writeFileSync(jsonPath, JSON.stringify({ generated: new Date().toISOString(), args, candidates }, null, 2));
  writeFileSync(mdPath, toMarkdown(candidates, args));

  const bySuite = candidates.reduce((acc, c) => ((acc[c.suggested_suite] = (acc[c.suggested_suite] || 0) + 1), acc), {});
  console.log(`Fetched ${rows.length} row(s) → ${candidates.length} unique candidate(s): ${JSON.stringify(bySuite)}`);
  console.log(`triage → ${mdPath}`);
  console.log(`         ${jsonPath}`);
}

main().catch((err) => {
  console.error('feedback-to-cases failed:', err.message);
  process.exit(1);
});
