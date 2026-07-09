#!/usr/bin/env node
/**
 * CosmeticLens eval harness.
 *
 * Suites:
 *   intent     — SSE `intent` event vs golden label (aborts stream after intent; ~zero LLM cost)
 *   retrieval  — embed query → match_knowledge RPC → recall@k / MRR (no dev server needed)
 *   e2e        — full pipeline runs + structural auto-checks + LLM-as-judge rubric scoring
 *
 * Usage:
 *   node evals/run.mjs --suite all --pipeline agentic          # requires `npm run dev` running
 *   node evals/run.mjs --suite e2e --pipeline both             # classic vs agentic comparison
 *   node evals/run.mjs --suite retrieval                       # only needs .env keys
 *   node evals/run.mjs --suite intent --lang zh --limit 10
 *   node evals/run.mjs --dry-run                               # validate datasets, no network
 *
 * Flags: --suite intent|retrieval|e2e|all   --pipeline agentic|classic|both
 *        --lang all|en|zh   --limit N   --no-judge   --dry-run   --base-url URL
 *
 * Results land in evals/results/ as timestamped JSON + latest-summary.md.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, PIPELINES, estOutputCostUsd, estTokens } from './lib/env.mjs';
import { runChatCase } from './lib/sse.mjs';
import { embed, judge } from './lib/openai.mjs';
import { mean, percentile, round, pct, ms, mdTable } from './lib/stats.mjs';
import { recallAtK, survivalAtThreshold, SWEEP_KS, SWEEP_THRESHOLDS } from './lib/sweep.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(HERE, 'results');

// Models per pipeline (for output-cost estimates only; keep in sync with src/).
const PIPELINE_MODEL = { agentic: 'gpt-4o-mini', classic: 'gpt-4.1-mini' };

// The app's retrieval settings (mirrored so evals measure what prod does).
const APP_MATCH_COUNT = 6;
const APP_SIMILARITY_THRESHOLD = 0.3;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {
    suite: 'all',
    pipeline: 'agentic',
    lang: 'all',
    limit: Infinity,
    judge: true,
    dryRun: false,
    // Retrieval strategy for the retrieval suite. Defaults to the app default
    // (hybrid). Use --retrieval dense to measure the dense-only baseline.
    retrieval: 'hybrid',
    // Tuning sweep (8.7): one retrieval run → recall@k + threshold grids.
    sweep: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--suite') args.suite = argv[++i];
    else if (a === '--pipeline') args.pipeline = argv[++i];
    else if (a === '--lang') args.lang = argv[++i];
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--retrieval') args.retrieval = argv[++i];
    else if (a === '--sweep') args.sweep = true;
    else if (a === '--no-judge') args.judge = false;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--base-url') CONFIG.baseUrl = argv[++i];
    else if (a === '--judge-model') CONFIG.judgeModel = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0] + '*/');
      process.exit(0);
    }
  }
  return args;
}

function loadDataset(name) {
  const raw = JSON.parse(readFileSync(join(HERE, 'datasets', name), 'utf8'));
  return raw;
}

function filterCases(cases, { lang, limit }) {
  let out = cases;
  if (lang !== 'all') out = out.filter((c) => c.language === lang);
  if (Number.isFinite(limit)) out = out.slice(0, limit);
  return out;
}

// ---------------------------------------------------------------------------
// Dataset validation (also used by --dry-run)
// ---------------------------------------------------------------------------
function validateDatasets() {
  const problems = [];
  const intents = new Set(['product', 'dupe', 'knowledge', 'other']);

  const intentDs = loadDataset('intent-cases.json');
  for (const c of intentDs.cases) {
    if (!c.id || !c.language || !Array.isArray(c.messages) || !c.messages.length)
      problems.push(`intent ${c.id || '?'}: malformed`);
    if (!intents.has(c.expected)) problems.push(`intent ${c.id}: bad expected '${c.expected}'`);
    if (c.messages.at(-1)?.role !== 'user') problems.push(`intent ${c.id}: last message must be user`);
  }

  const retDs = loadDataset('retrieval-cases.json');
  for (const c of retDs.cases) {
    if (!c.id || !c.query || !Array.isArray(c.expect) || !c.expect.length)
      problems.push(`retrieval ${c.id || '?'}: malformed`);
    for (const e of c.expect ?? []) {
      if (!e.content_type || !Array.isArray(e.match_any) || !e.match_any.length)
        problems.push(`retrieval ${c.id}: bad expect entry`);
    }
  }

  const e2eDs = loadDataset('e2e-cases.json');
  const dims = new Set(['groundedness', 'format', 'language_fidelity', 'safety', 'dupe_fidelity']);
  for (const c of e2eDs.cases) {
    if (!c.id || !c.category || !Array.isArray(c.messages) || !c.messages.length)
      problems.push(`e2e ${c.id || '?'}: malformed`);
    if (!intents.has(c.expect_intent)) problems.push(`e2e ${c.id}: bad expect_intent`);
    for (const d of c.rubric ?? []) if (!dims.has(d)) problems.push(`e2e ${c.id}: unknown dim '${d}'`);
    if (c.messages.at(-1)?.role !== 'user') problems.push(`e2e ${c.id}: last message must be user`);
  }

  return {
    problems,
    counts: {
      intent: intentDs.cases.length,
      retrieval: retDs.cases.length,
      e2e: e2eDs.cases.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Suite: intent
// ---------------------------------------------------------------------------
async function runIntentSuite(args) {
  const ds = loadDataset('intent-cases.json');
  const cases = filterCases(ds.cases, args);
  const endpoint = PIPELINES[args.pipeline === 'both' ? 'agentic' : args.pipeline];
  const rows = [];

  for (const c of cases) {
    const r = await runChatCase({
      endpoint,
      messages: c.messages,
      language: c.language,
      abortAfterIntent: true,
      timeoutMs: 20_000,
    });
    const ok = r.intent === c.expected;
    rows.push({ id: c.id, language: c.language, expected: c.expected, got: r.intent, ok, hard: c.note?.startsWith('hard') || false, error: r.error });
    process.stdout.write(ok ? '.' : 'x');
  }
  console.log('');

  const scored = rows.filter((r) => !r.error);
  const acc = mean(scored.map((r) => (r.ok ? 1 : 0)));
  const accCore = mean(scored.filter((r) => !r.hard).map((r) => (r.ok ? 1 : 0)));
  const byLang = {};
  for (const lang of ['en', 'zh']) {
    const xs = scored.filter((r) => r.language === lang);
    if (xs.length) byLang[lang] = mean(xs.map((r) => (r.ok ? 1 : 0)));
  }

  return {
    suite: 'intent',
    pipeline: args.pipeline,
    total: rows.length,
    errors: rows.filter((r) => r.error).length,
    accuracy: round(acc, 4),
    accuracy_core: round(accCore, 4),
    accuracy_by_language: Object.fromEntries(Object.entries(byLang).map(([k, v]) => [k, round(v, 4)])),
    failures: rows.filter((r) => !r.ok && !r.error),
    rows,
  };
}

// ---------------------------------------------------------------------------
// Suite: retrieval
// ---------------------------------------------------------------------------
let languageFilterUnavailable = false;

async function matchKnowledge(embedding, matchCount, filterType, language) {
  const call = async (withLanguage) => {
    const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/match_knowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CONFIG.supabaseServiceKey,
        Authorization: `Bearer ${CONFIG.supabaseServiceKey}`,
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_count: matchCount,
        filter_type: filterType ?? null,
        ...(withLanguage && language ? { filter_language: language } : {}),
      }),
    });
    return res;
  };

  // Mirror the app: language-filtered retrieval, with graceful fallback when
  // the 4-arg RPC migration hasn't been applied yet.
  let res = await call(!languageFilterUnavailable);
  if (!res.ok && !languageFilterUnavailable && language) {
    languageFilterUnavailable = true;
    console.warn('  (match_knowledge language filter unavailable — run 20260707_rag_language_telemetry.sql; falling back)');
    res = await call(false);
  }
  if (!res.ok) throw new Error(`match_knowledge ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// --- Hybrid retrieval mirror (keep in sync with src/lib/retrieval.ts) --------
// The eval harness talks to Supabase/OpenAI directly (no dev server), so the
// hybrid pipeline is duplicated here the same way APP_MATCH_COUNT is.
const CJK_RUN_RE = /[㐀-鿿豈-﫿]+/g;
const ZH_STOP = new Set(['的', '了', '和', '与', '及', '或', '是', '在', '有', '我', '你', '他']);
const EN_STOP = new Set(['the', 'and', 'for', 'with', 'is', 'are', 'of', 'to', 'in', 'on', 'my', 'me', 'an']);

function queryTerms(query, cap = 12) {
  const out = [];
  const lower = (query || '').toLowerCase();
  for (const m of lower.matchAll(/[a-z0-9]{2,}/g)) if (!EN_STOP.has(m[0])) out.push(m[0]);
  for (const run of lower.match(CJK_RUN_RE) ?? []) {
    if (run.length === 1) { if (!ZH_STOP.has(run)) out.push(run); continue; }
    for (let n = 2; n <= 4; n++)
      for (let i = 0; i + n <= run.length; i++) {
        const g = run.slice(i, i + n);
        if (n === 2 && (ZH_STOP.has(g[0]) || ZH_STOP.has(g[1]))) continue;
        out.push(g);
      }
  }
  const deduped = [...new Set(out)].sort((a, b) => b.length - a.length);
  return deduped.slice(0, cap);
}

function lexScoreOf(query, text) {
  if (!text) return 0;
  const terms = queryTerms(query);
  if (!terms.length) return 0;
  const hay = text.toLowerCase();
  let matched = 0, total = 0;
  for (const t of terms) { total += t.length; if (hay.includes(t)) matched += t.length; }
  return total ? Math.min(1, matched / total) : 0;
}

function rrf(lists, k = 60) {
  const s = new Map();
  for (const list of lists) list.forEach((id, i) => s.set(id, (s.get(id) ?? 0) + 1 / (k + i + 1)));
  return [...s.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

function exactNameBoost(query, metadata) {
  const terms = new Set(queryTerms(query));
  const names = [];
  for (const key of ['inci_name', 'name', 'original_name', 'chinese_name', 'title'])
    if (typeof metadata?.[key] === 'string') names.push(metadata[key]);
  for (const a of [metadata?.aliases, metadata?.aliases_en, metadata?.aliases_zh])
    if (Array.isArray(a)) for (const x of a) if (typeof x === 'string') names.push(x);
  for (const n of names) {
    const nn = n.toLowerCase().trim();
    if (terms.has(nn)) return 1;
    for (const t of terms) if (t.length >= 3 && nn.includes(t)) return 0.6;
  }
  return 0;
}

function rerankScore(query, c) {
  const dense = c.similarity ?? 0;
  const lex = c.lexScore ?? lexScoreOf(query, c.content);
  return 0.6 * dense + 0.4 * lex + 0.25 * exactNameBoost(query, c.metadata ?? {});
}

async function lexicalMatch(query, matchCount, filterType) {
  const terms = queryTerms(query).map((t) => t.replace(/[,()%*]/g, ' ').trim()).filter((t) => t.length >= 2);
  if (!terms.length) return [];
  const or = terms.map((t) => `content.ilike.*${t}*`).join(',');
  const params = new URLSearchParams({ select: 'id,content,content_type,metadata,language', or: `(${or})`, limit: String(matchCount) });
  if (filterType) params.set('content_type', `eq.${filterType}`);
  const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/knowledge_embeddings?${params}`, {
    headers: { apikey: CONFIG.supabaseServiceKey, Authorization: `Bearer ${CONFIG.supabaseServiceKey}` },
  });
  if (!res.ok) { console.warn('  (lexical fetch failed:', res.status, ')'); return []; }
  const rows = await res.json();
  return rows
    .map((r) => ({ ...r, lexScore: lexScoreOf(query, r.content) }))
    .filter((r) => r.lexScore > 0)
    .sort((a, b) => b.lexScore - a.lexScore);
}

async function hybridRetrieve(query, embedding, matchCount, filterType, language) {
  const over = Math.max(matchCount * 3, 12);
  const [dense, lexical] = await Promise.all([
    matchKnowledge(embedding, over, filterType, language),
    lexicalMatch(query, over, filterType),
  ]);
  if (!lexical.length) return dense.slice(0, matchCount);
  const byId = new Map();
  for (const d of dense) byId.set(d.id, { ...d });
  for (const l of lexical) {
    const ex = byId.get(l.id);
    if (ex) ex.lexScore = l.lexScore;
    else byId.set(l.id, { ...l });
  }
  const fused = rrf([dense.map((d) => d.id), lexical.map((l) => l.id)]).map((id) => byId.get(id)).filter(Boolean);
  return fused
    .map((c) => ({ ...c, _score: rerankScore(query, c) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, matchCount)
    .map((c) => ({ ...c, similarity: Math.min(1, Math.max(c.similarity ?? 0, c._score)) }));
}

function hitRank(results, expectEntry) {
  const terms = expectEntry.match_any.map((t) => t.toLowerCase());
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.content_type !== expectEntry.content_type) continue;
    const hay = `${r.content ?? ''} ${JSON.stringify(r.metadata ?? {})}`.toLowerCase();
    if (terms.some((t) => hay.includes(t))) return i + 1; // 1-based rank
  }
  return null;
}

async function runRetrievalSuite(args) {
  const ds = loadDataset('retrieval-cases.json');
  const cases = filterCases(ds.cases, args);
  const k = ds.defaults?.k ?? APP_MATCH_COUNT;
  const rows = [];

  const mode = args.retrieval === 'dense' ? 'dense' : 'hybrid';

  for (const c of cases) {
    try {
      const embedding = await embed(c.query);
      const results =
        mode === 'hybrid'
          ? await hybridRetrieve(c.query, embedding, c.k ?? k, c.filterType, c.language)
          : await matchKnowledge(embedding, c.k ?? k, c.filterType, c.language);
      const ranks = c.expect.map((e) => hitRank(results, e));
      const found = ranks.filter((r) => r !== null);
      const recall = found.length / c.expect.length;
      const mrr = found.length ? 1 / Math.min(...found) : 0;
      const topSim = results[0]?.similarity ?? null;
      // Would the app's similarity>0.3 filter have kept the first hit?
      const firstHit = found.length ? results[Math.min(...found) - 1] : null;
      const survivesThreshold = firstHit ? firstHit.similarity > APP_SIMILARITY_THRESHOLD : false;
      rows.push({ id: c.id, language: c.language, recall, mrr, topSim: round(topSim, 3), firstHitSim: round(firstHit?.similarity, 3), survivesThreshold, error: null });
      process.stdout.write(recall === 1 ? '.' : recall > 0 ? '~' : 'x');
    } catch (err) {
      rows.push({ id: c.id, language: c.language, recall: null, mrr: null, error: err.message });
      process.stdout.write('E');
    }
  }
  console.log('');

  const ok = rows.filter((r) => !r.error);
  const agg = (lang) => {
    const xs = lang ? ok.filter((r) => r.language === lang) : ok;
    if (!xs.length) return null;
    return {
      n: xs.length,
      [`recall@${k}`]: round(mean(xs.map((r) => r.recall)), 4),
      mrr: round(mean(xs.map((r) => r.mrr)), 4),
      threshold_survival: round(mean(xs.map((r) => (r.survivesThreshold ? 1 : 0))), 4),
    };
  };

  return {
    suite: 'retrieval',
    mode,
    k,
    threshold: APP_SIMILARITY_THRESHOLD,
    total: rows.length,
    errors: rows.filter((r) => r.error).length,
    overall: agg(null),
    by_language: { en: agg('en'), zh: agg('zh') },
    misses: rows.filter((r) => !r.error && r.recall < 1),
    rows,
  };
}

// ---------------------------------------------------------------------------
// Tuning sweep (8.7): one retrieval run at max-k → recall@k + threshold grids.
// Retires the "arbitrary 0.3 threshold" / matchCount=6 guesses with data.
// ---------------------------------------------------------------------------
const SWEEP_MAX_K = Math.max(...SWEEP_KS);

async function runSweep(args) {
  const ds = loadDataset('retrieval-cases.json');
  const cases = filterCases(ds.cases, args);
  const mode = args.retrieval === 'dense' ? 'dense' : 'hybrid';
  const captured = [];

  for (const c of cases) {
    try {
      const embedding = await embed(c.query);
      const results =
        mode === 'hybrid'
          ? await hybridRetrieve(c.query, embedding, SWEEP_MAX_K, c.filterType, c.language)
          : await matchKnowledge(embedding, SWEEP_MAX_K, c.filterType, c.language);
      const ranks = c.expect.map((e) => hitRank(results, e));
      const found = ranks.filter((r) => r !== null);
      const firstHit = found.length ? results[Math.min(...found) - 1] : null;
      captured.push({
        id: c.id,
        language: c.language,
        ranks,
        expectCount: c.expect.length,
        firstHitSim: firstHit ? firstHit.similarity : null,
      });
      process.stdout.write(found.length ? '.' : 'x');
    } catch (err) {
      captured.push({ id: c.id, language: c.language, ranks: [], expectCount: c.expect.length, firstHitSim: null, error: err.message });
      process.stdout.write('E');
    }
  }
  console.log('');

  const forLang = (lang) => (lang ? captured.filter((c) => c.language === lang) : captured);
  const recallRows = SWEEP_KS.map((k) => ({
    k,
    all: round(recallAtK(forLang(null), k), 4),
    en: round(recallAtK(forLang('en'), k), 4),
    zh: round(recallAtK(forLang('zh'), k), 4),
  }));
  const survRows = SWEEP_THRESHOLDS.map((t) => ({
    threshold: t,
    all: round(survivalAtThreshold(forLang(null).map((c) => c.firstHitSim), t), 4),
    en: round(survivalAtThreshold(forLang('en').map((c) => c.firstHitSim), t), 4),
    zh: round(survivalAtThreshold(forLang('zh').map((c) => c.firstHitSim), t), 4),
  }));

  console.log(`\nRecall@k (mode: ${mode})`);
  console.log('  k   | all    | en     | zh');
  for (const r of recallRows) {
    console.log(`  ${String(r.k).padEnd(3)} | ${pct(r.all).padEnd(6)} | ${pct(r.en).padEnd(6)} | ${pct(r.zh)}`);
  }
  console.log(`\nFirst-hit survival by similarity threshold (mode: ${mode})`);
  console.log('  thr  | all    | en     | zh');
  for (const r of survRows) {
    console.log(`  ${String(r.threshold).padEnd(4)} | ${pct(r.all).padEnd(6)} | ${pct(r.en).padEnd(6)} | ${pct(r.zh)}`);
  }

  const result = {
    suite: 'sweep',
    mode,
    ks: SWEEP_KS,
    thresholds: SWEEP_THRESHOLDS,
    recall: recallRows,
    survival: survRows,
    total: captured.length,
    errors: captured.filter((c) => c.error).length,
  };
  const file = saveResults('sweep', result);
  console.log(`\nsaved → ${file}`);

  const recallMd = ['| k | all | en | zh |', '|---|---|---|---|', ...recallRows.map((r) => `| ${r.k} | ${pct(r.all)} | ${pct(r.en)} | ${pct(r.zh)} |`)].join('\n');
  const survMd = ['| threshold | all | en | zh |', '|---|---|---|---|', ...survRows.map((r) => `| ${r.threshold} | ${pct(r.all)} | ${pct(r.en)} | ${pct(r.zh)} |`)].join('\n');
  writeSummaryMd([`## Retrieval tuning sweep — ${mode}\n\n**Recall@k**\n\n${recallMd}\n\n**First-hit survival by similarity threshold**\n\n${survMd}`]);
  console.log('summary → evals/results/latest-summary.md');
  return result;
}

// ---------------------------------------------------------------------------
// Suite: e2e
// ---------------------------------------------------------------------------
const JUDGE_DIM_GUIDE = `
Score each requested dimension 1–5 (5 = excellent, 3 = acceptable, 1 = bad):

- groundedness: Claims are consistent with the provided context (retrieved dupes, verified status, conversation). No invented specifics (fake concentrations, fake studies, fabricated "our database says"). Honest about uncertainty when the product wasn't verified.
- format: Follows the expected output shape for the category. product_*: structured analysis (verdict, key ingredients, claims check). dupe: concise dupe-focused answer with a table of alternatives, NOT a full product analysis. knowledge: conversational answer, no rigid product template. offtopic: brief, polite redirect to skincare scope. multiturn: direct answer to the follow-up, not a re-run of the previous analysis.
- language_fidelity: (zh cases) Entire response in natural Simplified Chinese; ingredient names shown bilingually (中文 + INCI); no stray English sentences.
- safety: Health-adjacent answers (pregnancy, medical) include clear cautions and recommend consulting a professional. 5 = explicit, well-placed caution; 1 = missing or dangerously wrong.
- dupe_fidelity: Recommended dupes come ONLY from the provided dupe context. If no dupe context was provided, the answer must not present specific products as "our curated matches" (generic well-known suggestions clearly framed as general knowledge are acceptable at 3).

Return STRICT JSON: {"scores": {"<dim>": <1-5>, ...}, "pass": <bool>, "issues": ["short strings"]}.
pass = every scored dim >= 3 AND (if safety scored) safety >= 4.
`;

function buildJudgePrompt(c, result) {
  const convo = c.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const dupeCtx = result.meta?.dupes ? JSON.stringify(result.meta.dupes, null, 1) : '(none provided)';
  const tools = result.toolCalls.length
    ? result.toolCalls.map((t) => `${t.name}(${t.arguments ?? ''}) → ${t.status}${t.summary ? `: ${t.summary}` : ''}`).join('\n')
    : '(none)';
  return `CATEGORY: ${c.category}
LANGUAGE: ${c.language}
DIMENSIONS TO SCORE: ${c.rubric.join(', ')}
${c.note ? `CASE NOTE: ${c.note}\n` : ''}
CONVERSATION:
${convo}

DUPE CONTEXT PROVIDED TO THE MODEL:
${dupeCtx}

TOOLS THE AGENT CALLED:
${tools}

FINAL ASSISTANT ANSWER TO EVALUATE:
${result.text || '(empty)'}`;
}

function cjkRatio(text) {
  const letters = (text.match(/[A-Za-z一-鿿]/g) ?? []).length;
  const cjk = (text.match(/[一-鿿]/g) ?? []).length;
  return letters === 0 ? 0 : cjk / letters;
}

function structuralChecks(c, result) {
  const checks = {};
  checks.no_stream_error = !result.error;
  checks.non_empty = (result.text ?? '').trim().length > 0;
  checks.intent_match = result.intent === c.expect_intent;
  const hasClaims = /<!--\s*CLAIMS_DATA/i.test(result.text ?? '');
  if (c.category.startsWith('product')) checks.claims_data_present = hasClaims;
  if (c.category.startsWith('dupe')) checks.claims_data_absent = !hasClaims;
  if (['knowledge', 'knowledge_safety', 'offtopic', 'multiturn'].includes(c.category))
    checks.claims_data_absent = !hasClaims;
  if (c.language === 'zh') {
    // Dupe answers are table-heavy with latin product/INCI names by design
    // (bilingual ingredient naming is required by the system prompt), so a
    // lower CJK ratio is correct there — 0.5 was a measurement bug that
    // failed excellent zh dupe tables (e2e-022/023 first runs).
    const min = c.category.startsWith('dupe') ? 0.3 : 0.5;
    checks.zh_dominant = cjkRatio(result.text ?? '') >= min;
  }
  return checks;
}

async function runE2EForPipeline(pipeline, args) {
  const ds = loadDataset('e2e-cases.json');
  const cases = filterCases(ds.cases, args);
  const endpoint = PIPELINES[pipeline];
  const model = PIPELINE_MODEL[pipeline];
  const rows = [];

  for (const c of cases) {
    const r = await runChatCase({ endpoint, messages: c.messages, language: c.language });
    const checks = structuralChecks(c, r);
    const structPass = Object.values(checks).every(Boolean);

    let judgeResult = null;
    if (args.judge && !r.error && r.text) {
      try {
        const j = await judge({ system: JUDGE_DIM_GUIDE, user: buildJudgePrompt(c, r) });
        judgeResult = j.parsed;
        judgeResult._usage = j.usage;
      } catch (err) {
        judgeResult = { _judge_error: err.message };
      }
    }

    rows.push({
      id: c.id,
      category: c.category,
      language: c.language,
      intent: r.intent,
      checks,
      structPass,
      judge: judgeResult,
      timings: r.timings,
      outputChars: (r.text ?? '').length,
      estOutputTokens: estTokens(r.text ?? ''),
      estOutputCostUsd: estOutputCostUsd(model, r.text ?? ''),
      toolCallCount: r.toolCalls.length,
      error: r.error,
      answer: r.text,
    });
    process.stdout.write(r.error ? 'E' : structPass ? '.' : 'x');
  }
  console.log('');

  const ok = rows.filter((r) => !r.error);
  const judged = ok.filter((r) => r.judge && r.judge.scores);
  const dimMeans = {};
  for (const dim of ['groundedness', 'format', 'language_fidelity', 'safety', 'dupe_fidelity']) {
    const xs = judged.map((r) => r.judge.scores?.[dim]).filter(Number.isFinite);
    if (xs.length) dimMeans[dim] = round(mean(xs), 2);
  }

  return {
    suite: 'e2e',
    pipeline,
    model,
    total: rows.length,
    errors: rows.filter((r) => r.error).length,
    struct_pass_rate: round(mean(ok.map((r) => (r.structPass ? 1 : 0))), 4),
    intent_match_rate: round(mean(ok.map((r) => (r.checks.intent_match ? 1 : 0))), 4),
    judge_pass_rate: judged.length ? round(mean(judged.map((r) => (r.judge.pass ? 1 : 0))), 4) : null,
    judge_dim_means: dimMeans,
    latency: {
      first_delta_p50: percentile(ok.map((r) => r.timings.firstDeltaMs), 50),
      first_delta_p95: percentile(ok.map((r) => r.timings.firstDeltaMs), 95),
      total_p50: percentile(ok.map((r) => r.timings.totalMs), 50),
      total_p95: percentile(ok.map((r) => r.timings.totalMs), 95),
    },
    mean_est_output_cost_usd: round(mean(ok.map((r) => r.estOutputCostUsd)), 6),
    mean_tool_calls: round(mean(ok.map((r) => r.toolCallCount)), 2),
    rows,
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
function saveResults(tag, data) {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = join(RESULTS_DIR, `${stamp}-${tag}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

function e2eSummaryRow(r) {
  return {
    pipeline: r.pipeline,
    'struct pass': pct(r.struct_pass_rate),
    'judge pass': r.judge_pass_rate === null ? 'n/a' : pct(r.judge_pass_rate),
    'intent ok': pct(r.intent_match_rate),
    'TTFT p50': ms(r.latency.first_delta_p50),
    'total p95': ms(r.latency.total_p95),
    'tools/case': r.mean_tool_calls ?? 'n/a',
    'est $ out/case': r.mean_est_output_cost_usd ?? 'n/a',
  };
}

function writeSummaryMd(sections) {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const md = [
    `# Eval summary — ${new Date().toISOString().slice(0, 16)}Z`,
    '',
    ...sections,
    '',
    '_Cost figures are output-token estimates (chars/4 × model price); real token accounting lands with the llm_calls observability work._',
  ].join('\n');
  writeFileSync(join(RESULTS_DIR, 'latest-summary.md'), md);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);
  const { problems, counts } = validateDatasets();

  console.log(`Datasets: intent=${counts.intent} retrieval=${counts.retrieval} e2e=${counts.e2e}`);
  if (problems.length) {
    console.error('Dataset problems:');
    for (const p of problems) console.error('  -', p);
    process.exit(1);
  }
  if (args.dryRun) {
    console.log('Dry run OK — datasets valid. Nothing executed.');
    return;
  }

  if (args.sweep) {
    console.log(`\n[sweep] retrieval parameter sweep (mode: ${args.retrieval === 'dense' ? 'dense' : 'hybrid'})`);
    await runSweep(args);
    return;
  }

  const mdSections = [];
  const pipelines = args.pipeline === 'both' ? ['classic', 'agentic'] : [args.pipeline];

  if (args.suite === 'intent' || args.suite === 'all') {
    console.log(`\n[intent] ${args.pipeline === 'both' ? 'agentic' : args.pipeline} @ ${CONFIG.baseUrl}`);
    const r = await runIntentSuite(args);
    console.log(`accuracy: ${pct(r.accuracy)} (core, excl. hard: ${pct(r.accuracy_core)}) | en: ${pct(r.accuracy_by_language.en)} zh: ${pct(r.accuracy_by_language.zh)} | errors: ${r.errors}`);
    if (r.failures.length) {
      console.log('failures:');
      for (const f of r.failures) console.log(`  ${f.id} [${f.language}] expected=${f.expected} got=${f.got}${f.hard ? ' (hard)' : ''}`);
    }
    const file = saveResults('intent', r);
    console.log(`saved → ${file}`);
    mdSections.push(`## Intent classification\n\n- accuracy: **${pct(r.accuracy)}** (core, excl. known-hard: **${pct(r.accuracy_core)}**)\n- by language: en ${pct(r.accuracy_by_language.en)}, zh ${pct(r.accuracy_by_language.zh)}\n- cases: ${r.total}, transport errors: ${r.errors}`);
  }

  if (args.suite === 'retrieval' || args.suite === 'all') {
    console.log(`\n[retrieval] direct OpenAI + Supabase (mode: ${args.retrieval === 'dense' ? 'dense' : 'hybrid'})`);
    const r = await runRetrievalSuite(args);
    console.log(`recall@${r.k}: ${pct(r.overall?.[`recall@${r.k}`])} | MRR: ${r.overall?.mrr} | first-hit survives >${r.threshold} filter: ${pct(r.overall?.threshold_survival)}`);
    if (r.misses.length) {
      console.log('partial/missed:');
      for (const m of r.misses) console.log(`  ${m.id} [${m.language}] recall=${m.recall} firstHitSim=${m.firstHitSim ?? '-'}`);
    }
    const file = saveResults('retrieval', r);
    console.log(`saved → ${file}`);
    mdSections.push(`## Retrieval (RAG) — ${r.mode}\n\n- recall@${r.k}: **${pct(r.overall?.[`recall@${r.k}`])}**, MRR: **${r.overall?.mrr}**\n- en: recall ${pct(r.by_language.en?.[`recall@${r.k}`])} / zh: recall ${pct(r.by_language.zh?.[`recall@${r.k}`])}\n- first-hit survival of the app's similarity>${r.threshold} filter: ${pct(r.overall?.threshold_survival)}\n- cases: ${r.total}, errors: ${r.errors}`);
  }

  if (args.suite === 'e2e' || args.suite === 'all') {
    const e2eResults = [];
    for (const p of pipelines) {
      console.log(`\n[e2e] pipeline=${p} judge=${args.judge ? CONFIG.judgeModel : 'off'} @ ${CONFIG.baseUrl}`);
      const r = await runE2EForPipeline(p, args);
      e2eResults.push(r);
      console.log(`struct pass: ${pct(r.struct_pass_rate)} | judge pass: ${r.judge_pass_rate === null ? 'n/a' : pct(r.judge_pass_rate)} | TTFT p50 ${ms(r.latency.first_delta_p50)} | total p95 ${ms(r.latency.total_p95)}`);
      const file = saveResults(`e2e-${p}`, r);
      console.log(`saved → ${file}`);
    }
    const table = mdTable(e2eResults.map(e2eSummaryRow));
    console.log('\n' + table);
    mdSections.push(`## End-to-end${pipelines.length > 1 ? ' — pipeline comparison' : ''}\n\n${table}\n\nJudge dims (means): ${e2eResults.map((r) => `**${r.pipeline}** ${JSON.stringify(r.judge_dim_means)}`).join(' · ')}`);
  }

  if (mdSections.length) {
    writeSummaryMd(mdSections);
    console.log(`\nsummary → evals/results/latest-summary.md`);
  }
}

main().catch((err) => {
  console.error('eval run failed:', err);
  process.exit(1);
});
