# Evals

Measurement harness for CosmeticLens' AI behavior. Three suites, golden datasets under version control, results as timestamped JSON + a regenerated `results/latest-summary.md`.

| Suite | Measures | Needs dev server? | LLM cost |
|-------|----------|-------------------|----------|
| `intent` | `intent.ts` classification accuracy vs 60 golden cases (EN+ZH, follow-ups) | yes | ~zero (aborts after the SSE `intent` event) |
| `retrieval` | RAG quality: recall@6, MRR, and survival of the app's `similarity > 0.3` filter, vs 38 labeled queries | no (hits OpenAI + Supabase directly) | ~$0.001 (embeddings) |
| `e2e` | Full pipeline: structural checks (intent, CLAIMS_DATA contract, zh dominance) + LLM-judge rubric (groundedness, format, safety, dupe fidelity, language) + latency (TTFT/total p50/p95) + est. cost | yes | ~$0.10–0.30 per pipeline incl. judge |

## Setup

1. `.env` must contain `OPENAI_API_KEY`, `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Add `RATE_LIMIT_BYPASS_TOKEN=<any-long-random-string>` to `.env` (dev only — never set it in Vercel) so eval traffic isn't throttled by the daily limits.
3. For `intent`/`e2e`: run `npm run dev` in another terminal.

## Run

```bash
node evals/run.mjs --dry-run                    # validate datasets, no network
node evals/run.mjs --suite retrieval            # no server needed
node evals/run.mjs --suite intent
node evals/run.mjs --suite e2e --pipeline both  # classic vs agentic comparison
node evals/run.mjs --suite all --pipeline agentic
```

Flags: `--lang en|zh|all`, `--limit N`, `--no-judge`, `--base-url https://...` (point at prod), `--judge-model gpt-4.1`, `--retrieval dense|hybrid` (retrieval suite; default `hybrid` — use `dense` for the baseline, e.g. `node evals/run.mjs --suite retrieval --retrieval dense` then again without it to compare).

Tuning sweep (8.7): `node evals/run.mjs --sweep [--retrieval dense|hybrid]` runs retrieval once at max-k and tabulates **recall@{3,4,6,8}** and **first-hit survival at similarity thresholds {0.2…0.4}** by language — the data behind the app's `matchCount=6` and `0.3` threshold choices.

## Reading results

- Console prints per-suite metrics + failure lists; `x` = failed case, `~` = partial recall, `E` = transport error.
- `results/<timestamp>-<suite>.json` keeps full per-case records (including answers) for debugging.
- `results/latest-summary.md` is the copy-paste source for README headline numbers.

## Design notes

- **Hard cases are kept failing on purpose.** Cases with `note: "hard"` encode desired behavior the current heuristics miss (e.g. zh `、`-separated ingredient lists, 早C晚A slang, "substitute for" dupe phrasing). `accuracy_core` excludes them; the gap between the two numbers is the improvement backlog.
- **Retrieval expectations key on names, not row UUIDs**, so they survive destructive re-seeds of `knowledge_embeddings`.
- **Chat-side costs are estimates** (chars/4 × published price) because the app's SSE stream doesn't expose token usage; judge-side counts are exact. Real accounting arrives with the `llm_calls` logging work (improvement plan P4.6).
- **Variance:** pipelines run at temp 0.3 (agentic) / 0.7 (classic); judge runs at temp 0. Expect a few points of run-to-run noise in judge pass rates; compare trends, not single runs.
- Golden files live in `datasets/` — treat edits like code (review diffs; changing a label changes the metric).
