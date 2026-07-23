# CosmeticLens — Advanced Roadmap (Phases 8–12)

**Created:** 2026-07-08 · **Extends:** [`improvement-plan.md`](./improvement-plan.md) (P0–P7)
**See also:** [`ui-roadmap.md`](./ui-roadmap.md) — Phases 13 (UI/UX polish: dark mode, motion/a11y, toasts, homepage) & 14 (features: quiz, PDF export, favorites, citations, barcode).
**Goal (unchanged):** prove senior **AI/LLM application-engineer** skill — retrieval quality, inference cost/latency engineering, guardrails, eval rigor, and analytics — on a publicly deployed, commercial-looking product. Every item below must ship **a metric or an interview story**, and reuse existing infrastructure (`evals/`, `llm_calls`, `feedback`, `analysis_cache`) rather than adding surface area for its own sake.

## Where we are (2026-07-08 baseline)

- **Pipelines:** classic RAG (`chat.ts`) + agentic (`chat-agentic.ts`, 5 tools) on **gpt-5.4-mini** (gpt-4o-mini fallback).
- **Retrieval:** single dense vector search over `knowledge_embeddings` with language + type filters; cosine threshold 0.3, matchCount 6. No reranking, no keyword/hybrid, no query rewriting.
- **Evals:** intent (60) + retrieval (38, recall@k/MRR) + e2e (26, LLM-judge) with latency/cost capture; deterministic subset in CI, judge runs manual.
- **Observability:** `llm_calls` (real tokens, latency, cost, error) + `feedback` (👍/👎 + reason). **No dashboard reads them yet.**
- **Caching:** exact-match `analysis_cache` on `/api/analyze` only; chat/agentic are uncached.
- **Known gaps from evals:** ret-036 (小黑瓶 nickname retrieval miss); occasional CLAIMS_DATA format flakes; agentic latency rises with correctness.

---

## Phase 8 — Advanced RAG & inference engineering

> **Status 2026-07-08:** **8.1 + 8.2 BUILT** (typecheck 0 errors, 129/129 unit tests, clean build). Two-stage hybrid retrieval: `src/lib/retrieval.ts` (pure, tested — CJK+Latin `queryTerms`, `lexicalScore`, `reciprocalRankFusion`, feature `rerankCandidates`); `embeddings.ts` `searchKnowledge` now runs dense (`match_knowledge`) + lexical (`content ILIKE` via `.or()`) → RRF → rerank, with total graceful fallback to dense (`mode:'dense'` / `RETRIEVAL_MODE=dense`). Migration `20260708_hybrid_search.sql` (pg_trgm + GIN trigram index). Eval harness gained `--retrieval dense|hybrid` mirroring the app so ret-036 (小黑瓶) is measurable. `tests/retrieval.test.ts` includes the ret-036 scenario. **User ran both eval modes + the SQL (2026-07-08).**
>
> **Status 2026-07-08 (cont.):** **8.4 semantic cache BUILT** (134/134 tests, 0 type errors, clean build). `src/lib/semantic-cache.ts`: `shouldUseCache` (pure, tested — first-turn + cacheable intents only, so follow-ups that depend on context are never served from cache), `lookupCachedAnswer`/`storeCachedAnswer` (embed → `match_chat_cache` RPC / upsert, all fail-open). Migration `20260709_semantic_cache.sql` (`chat_semantic_cache` table + RPC, service-role). Wired into `chat-agentic.ts`: on hit emits `meta{cached}` + `delta` + `done` and short-circuits the model; stores the final answer fire-and-forget. Client shows the existing "Cached" badge (ChatInterface + ChatMessage tweaks). **OFF by default** — enable with `SEMANTIC_CACHE=on`; logged to `llm_calls` as model `semantic-cache`. **Pending user:** run `20260709_semantic_cache.sql`, set `SEMANTIC_CACHE=on`, then re-ask an example prompt to see the instant cached reply + badge (hit-rate/latency = the metric).
>
> **Status 2026-07-08 (cont.):** **8.6 execution routing BUILT** (138/138 tests, 0 type errors, clean build). `src/lib/router.ts`: pure `routeIntent` (`other` → fast, else agentic) + `fastPathSystemPrompt` + `isFastRoutingEnabled` (on by default; `FAST_ROUTING=off` disables). `chat-agentic.ts` gains a fast branch after the cache check: greetings/off-topic skip the tool loop, RAG, and profile fetch — one no-tools completion (`streamOneTurn` parameterized with `includeTools`/`maxTokens`), short persona prompt, `meta{mode:'fast'}` (no trace, no badge). `tests/router.test.ts`. Live by default (env-disable).
>
> **Status 2026-07-08 (cont.):** **8.3 query transformation BUILT** (146/146 tests, 0 type errors, clean build). `src/lib/query-expansion.ts` (pure, tested): `isFollowUp` (short + pronoun/marker + doesn't self-name an ingredient), `extractSubjects` (recent INCI subjects via `findIngredientData`), `expandQuery` (re-attaches subject to a bare follow-up, no-op otherwise). Wired into classic RAG (`chat.ts` expands `userText`) and the agentic `search_knowledge_base` tool (`ToolContext.history` now carries prior turns; `chat-agentic.ts` passes them). Fixes multi-turn retrieval ("is it safe at night?" → "Retinol — is it safe at night?"). Live by default.
>
> **Status 2026-07-08 (cont.):** **8.7 tuning sweep BUILT** (152/152 tests, 0 type errors, clean build). `evals/lib/sweep.mjs` (pure, tested — `recallAtK` via rank truncation, `survivalAtThreshold`); `node evals/run.mjs --sweep [--retrieval dense|hybrid]` runs retrieval ONCE at max-k and tabulates recall@{3,4,6,8} + first-hit survival at thresholds {0.2…0.4} by language, saving md/json — the data behind `matchCount=6` and the `0.3` threshold. `tests/sweep.test.ts`. **Pending user:** `node evals/run.mjs --sweep` to generate the tuning table.
>
> **PHASE 8 COMPLETE except 8.5.** 8.5 (structured outputs) intentionally deferred: converting the answer to a JSON-schema object conflicts with the token-by-token **streaming** UX that's a demo highlight (you'd wait for the full object, then render). Revisit only if the format-reliability win is judged worth losing streaming, or scope it to a non-streamed surface (`/api/analyze`).

**Why:** retrieval quality and cost/latency are the two things an AI-infra interviewer probes hardest. Each item is measurable against the *existing* retrieval + e2e eval suites (before/after tables are the deliverable).

| # | Task | Why / what it shows | Effort | Depends on |
|---|------|--------------------|--------|-----------|
| 8.1 | **Reranking.** Retrieve top-20 by vector, rerank to top-6 with an LLM reranker (score each snippet's relevance, temp 0) or a hosted cross-encoder. Wire behind a `RERANK=on` flag; A/B on the retrieval eval | Recall@6 / MRR uplift with a number; "two-stage retrieval" is a standard senior pattern | M | P2 evals |
| 8.2 | **Hybrid retrieval.** Add keyword/full-text search (Postgres `tsvector` / `pg_trgm`) alongside vector; fuse with Reciprocal Rank Fusion. Directly targets exact-name + nickname misses like ret-036 (小黑瓶), where dense embeddings underperform lexical | Fixes a *known* eval failure; shows you know dense-only is not enough | M–L | 8.1 optional |
| 8.3 | **Query transformation.** (a) Follow-up rewriting — rewrite "what about at night?" into a standalone query using chat history before retrieval; (b) HyDE or multi-query for sparse concepts. Measure on zh + follow-up eval cases | Retrieval for conversational turns; the classic multi-turn RAG weakness | M | P2 |
| 8.4 | **Semantic answer cache.** Embed the incoming query; if cosine ≥ τ to a cached (query, answer, lang, intent) tuple, serve cached + show the existing "cached" badge. TTL + invalidation on seed changes. Extends `analysis_cache` to the chat path | Cost + latency win with a **hit-rate %** and **$ saved/day** metric; the single most "productiony" cost story | M | P4 telemetry |
| 8.5 | **Structured outputs.** Move the analysis contract (CLAIMS_DATA table, Mode-C dupe format, disclaimer flags) to `response_format: json_schema` (already used loosely for vision `json_object`). Render from the parsed object instead of markdown-parsing | Kills the CLAIMS_DATA format eval flakes; reliability/latency story; decouples model from renderer | M | none |
| 8.6 | **Model routing / cost cascade.** Route `intent: other`/greetings to a no-RAG cheap path; route hard product/knowledge turns to the full pipeline; optionally escalate small→large on low self-confidence. Keeps traffic inside the free gpt-5.4-mini quota | Cost engineering with a measured **$/query by intent**; "not every turn needs the big hammer" | S–M | P2, P4 |
| 8.7 | **Tuning as experiments.** Treat similarity threshold (0.3), matchCount (6), rerank-k, agentic max-iterations, temp as a swept grid; log each run to `evals/results/` and pick with data, not vibes | The scientific-method framing interviewers love; supersedes the "arbitrary 0.3" in P2.6 | S | P2 |

**Done when:** README can cite a two-stage-retrieval before/after (recall/MRR), a cache hit-rate + $ saved, and a cost-per-intent table. ret-036 passes.

---

## Phase 9 — Trust, safety & guardrails

**Why:** health-adjacent advice + user PII (pregnancy, allergies) raise the bar. Guardrails are an explicit senior competency and dovetail with the existing disclaimer + confidence-banner work.

| # | Task | Why / what it shows | Effort | Depends on |
|---|------|--------------------|--------|-----------|
| 9.1 | **Groundedness verifier.** After generation, check the answer's claims are entailed by the retrieved context (NLI model or a cheap LLM judge). Flag/soften low-groundedness answers; log a **hallucination-rate** metric to `llm_calls` | The hallucination-guard story, quantified; ties to the "Sources" chips | M | P4 |
| 9.2 | **Prompt-injection defense.** Pasted ingredient lists and product names are untrusted input that can carry instructions ("ignore previous…"). Add input classification + tool-argument sanitization; add an injection eval set | Security thinking beyond auth/rate-limits; a red-team eval is a great artifact | M | P2 |
| 9.3 | **PII minimization.** Don't persist raw pregnancy/allergy text in `feedback.query`/`answer` or `llm_calls`; hash or redact before store; document retention | Privacy engineering; consistent with the IDOR-fix narrative | S | P7.3 |
| 9.4 | **Output moderation for medical claims.** Detect definitive medical/therapeutic claims and force the disclaimer + hedging; align with the per-answer disclaimer (4.3) | Responsible-AI story with a concrete rule engine | S | P4.3 |
| 9.5 | **Uncertainty calibration.** Make the Mode-B confidence banner data-driven — calibrate "confident/uncertain" against whether verified data was found + retrieval score | Calibration is a differentiator; measurable via feedback | S–M | 9.1 |

**Done when:** an injection eval passes, hallucination-rate is tracked and trends down, and no raw health PII sits in telemetry.

---

## Phase 10 — Eval maturity & the feedback flywheel (highest signal per line)

> **Status 2026-07-08 (cont.):** **10.5 coverage BUILT.** `evals/lib/coverage.mjs` (pure/tested `countBy`, `coverageMatrix` with gap flagging) + `node evals/run.mjs --coverage` (offline; intent×lang, retrieval content_type×lang, e2e category×lang matrices — already surfaced gaps: article/zh, dupe_uncurated/zh). `tests/coverage.test.ts`. Remaining P10: 10.2 online A/B (needs traffic), 10.6 model bake-off (needs egress).
>
> **Status 2026-07-08:** **10.1 + 10.3 + 10.4 BUILT** (164/164 tests, 0 type errors, clean build). **10.1 flywheel:** `evals/lib/feedback.mjs` (pure/tested `feedbackRowToCandidate` routes to intent/e2e suite, `dedupeCandidates` counts repeats) + `evals/feedback-to-cases.mjs` CLI (pulls 👎 from Supabase, writes `evals/triage/*.{md,json}` for promotion into golden sets). **10.3 gate:** `evals/lib/gate.mjs` (`checkThresholds`) + `evals/baseline.json` floors + `tests/regression-gate.test.ts` (computes offline intent accuracy overall/en/zh via the pure classifier, fails CI below floor — runs in existing `npm test`) + `.github/workflows/nightly-evals.yml` (weekly retrieval+sweep, secret-guarded). **10.4 rigor:** `wilsonInterval` in `evals/lib/stats.mjs` (95% CIs on small-N pass rates). `tests/eval-lib.test.ts` covers all three. **Pending user:** once 👎 accumulate, `node evals/feedback-to-cases.mjs` → review → promote. **Remaining:** 10.2 online A/B, 10.5 coverage report, 10.6 model bake-off.

**Why:** the eval harness is the resume centerpiece; making it *close a loop with real users* is the strongest senior signal in the whole project.

| # | Task | Why / what it shows | Effort | Depends on |
|---|------|--------------------|--------|-----------|
| 10.1 | **Feedback → eval pipeline.** A script pulls 👎 `feedback` rows into a triage queue; you label + promote failures into golden eval cases. This is the payoff of 7.3 | "User feedback → eval set → measured fix" — the flywheel, made real | S–M | P7.3 |
| 10.2 | **Online A/B eval.** Randomly assign classic vs agentic per session (or per new chat), log served pipeline + feedback + latency + cost; compare on *real traffic* with a significance test | Offline judge + online metrics = the full picture; the decision-5 payoff, upgraded | M | P4, P7.3 |
| 10.3 | **CI regression gating.** Fail the build when deterministic evals (intent acc, retrieval recall) drop below a threshold vs a committed baseline; nightly scheduled judge run posts a report | Turns evals into a safety net, not a one-off; catches exactly the gpt-5.4-mini kind of change | S | P6 CI |
| 10.4 | **Judge calibration + statistical rigor.** Measure LLM-judge agreement with your human labels (Cohen's κ); report **Wilson confidence intervals** on pass rates (N is small — honest error bars matter) | Stats maturity; "our judge is trustworthy because…" | S | P2 |
| 10.5 | **Coverage report.** Auto-generate which intents × languages × edge cases the eval set covers, and where it's thin | Shows you manage the eval set as a dataset, not a pile of cases | S | P2 |
| 10.6 | **Model bake-off template.** A repeatable "swap model → run all suites → diff" report. Run it now to refresh README numbers on gpt-5.4-mini (both pipelines now share one model → the A/B isolates *pipeline*, not model — reframe the headline) | Directly resolves the open item from the model swap; reusable for every future model | S | P2 |

**Done when:** a 👎 becomes a committed eval case in one documented workflow; CI blocks eval regressions; README numbers are gpt-5.4-mini and honest (with CIs).

---

## Phase 11 — Analytics & observability as a product surface (data-analyst signal)

**Why:** you asked for data-analyst technique. `llm_calls` + `feedback` are rich, unused. Turning them into an analytics surface demonstrates SQL, funnels, cohorts, and statistical inference — and doubles as a recruiter demo asset. Local skills that fit: `data:build-dashboard`, `data:sql-queries`, `data:statistical-analysis`, `data:create-viz`.

| # | Task | Why / what it shows | Effort | Depends on |
|---|------|--------------------|--------|-----------|
| 11.1 | **Metrics dashboard.** `/admin/metrics` (auth-gated) or a Cowork **artifact** reading a new `/api/admin/metrics`: cost/day, p50/p95 latency, tokens, error rate, thumbs-up rate by intent/pipeline/language, tool-use rate, cache hit-rate, retrieval-hit-rate | The single best demo asset; "I instrument what I ship" | M | P4, P7.3 |
| 11.2 | **SQL analytics layer.** Materialized daily-rollup views in Supabase (`daily_llm_costs`, `feedback_by_intent`, `pipeline_ab`) so the dashboard is cheap and the SQL is reviewable | Warehouse-modeling instinct; window functions, rollups | S–M | P4 |
| 11.3 | **Funnel + retention.** Query→answer→feedback→return-visit funnel; anonymous vs authed cohorts; where users drop | Product-analyst framing; conversion thinking | M | P3, P4 |
| 11.4 | **Statistical inference.** Significance test on pipeline feedback deltas (two-proportion z / chi-square); anomaly detection on cost/latency (z-score or IQR) with alerting; power analysis for "how many evals do we need" | Rigor beyond averages; ties to 10.4 | S–M | 11.2 |
| 11.5 | **Unit economics.** $/query by intent and by pipeline; projected monthly cost at N users given the free-quota + fallback model mix; dashboard the spend-cap backstop | Cost-conscious engineering; ties 8.4/8.6 to dollars | S | 11.1 |

**Done when:** one page/artifact answers "what does this cost, how fast is it, and are users happy — sliced by intent, language, and pipeline," backed by reviewable SQL and at least one significance test.

---

## Phase 12 — Feature depth (functionality, reusing infra)

> **Status 2026-07-08:** **12.1 share links BUILT** (170/170 tests, typecheck 0 errors across 131 files; production build not re-run in-sandbox — a mount FD ceiling (`EMFILE`) exhausted late in the session, environmental not code; the identical pipeline passed for Phases 8/10 and Phase 12 added no new deps). Security-careful design: `supabase/migrations/20260710_shared_analyses.sql` = a dedicated public-read table (RLS `USING (true)` for SELECT only; service-role writes) that SNAPSHOTS one answer — `chats`/`chat_messages` stay owner-only, so sharing never exposes a conversation. `src/lib/share.ts` (pure/tested: `generateShareId`, `sanitizeSharePayload` whitelists+clips metadata, `shareDescription`). `/api/share` (rate-limited, JWT-optional). Public SSR `/[en|zh]/a/[id]` render read-only via `SharedAnalysisView.astro` (reuses `AnalysisDisplay`, no interactive buttons) + og/canonical tags + 404 state. `ShareButton.jsx` in the chat footer (next to feedback) POSTs + copies the link. i18n `share.*` EN/ZH. `tests/share.test.ts`. **Pending user:** run `20260710_shared_analyses.sql`; confirm the build locally (`npm run build`) — expected clean. **Remaining P12:** 12.2 concern search / barcode / compare tool, 12.3 routine v2, 12.4 ingredient references, 12.5 personalization.

> **Status 2026-07-08 (cont.):** **12.2 + 12.3 BUILT** (190/190 tests, typecheck 0 errors/142 files; build still FD-blocked in-sandbox). **12.2 concern search (7.6):** `src/lib/concern-search.ts` (keyword→concern→DB, pure/tested) + `/api/concern-search` + `ConcernSearch.jsx` on both glossary pages, linking into ingredient pages; i18n `concern.*`. **12.2 compare tool (7.7):** `src/lib/compare.ts` (shared/unique + conflicts, reuses findIngredientData + analyzeRoutine) + `compare_products` agent tool (tools.ts now 6 tools; guide EN/ZH); `tests/compare.test.ts`. **12.3 routine v2:** `analyzeRoutine` gained `{isPregnant}` (re-enables pregnancy pairs as within-product avoid flags); wired through `/api/routine`, `check_routine` tool (`is_pregnant`), and a RoutineChecker checkbox; `tests/routine.test.ts` +2. **Guardrails (Phase 9): 9.3** `src/lib/redact.ts` (conservative PII scrub — emails/phones/long-digits, no false positives on concentrations) applied to stored feedback; **9.2** `src/lib/guardrails.ts` `detectInjection` + `injectionGuardNote`, wired into chat-agentic (re-anchor + log `injection_suspected`, never blocks). `tests/guardrails.test.ts`. **Deliberately NOT built:** 12.4 ingredient references (needs real vetted citations — fabrication risk), 12.5 personalization (larger), 7.5 barcode (browser-only, unverifiable here), 9.1 groundedness (needs LLM), 10.2 A/B (needs traffic), Phase 11 dashboard (large + internal-facing).

**Why:** rounds out commercial completeness. Ordered by value-per-effort; most reuse existing backends.

| # | Feature | Why / what it shows | Effort | Depends on |
|---|---------|--------------------|--------|-----------|
| 12.1 | **7.4 Share links (done right).** Public read-only `/a/[id]` + og card. Security-careful: a *separate* `shared_analyses` table with an explicit public-read RLS policy — never expose `chats`/`chat_messages`. Only content the user clicks "Share" on becomes public | Commercial norm + a live example to send recruiters; the RLS design is the story | M | P3 |
| 12.2 | **7.6 Concern search** on glossary ("what helps with redness?") reusing embeddings; **7.5 barcode scan** (`getProductByBarcode` already exists); **7.7 `compare_products`** agent tool | Cheap reuse of RAG + agent infra; phone-demo wow (barcode) | S–M each | P1, P8 |
| 12.3 | **Routine checker v2.** Profile-aware (skin type, pregnancy toggle re-enables the pregnancy pairs I currently skip), save/name routines to Supabase, infer product *type* for real layering order | Deepens the 7.1 differentiator; personalization | M | P3, P7.1 |
| 12.4 | **Ingredient references (4.4).** Add vetted `references[]` (PubChem/CIR/reviews) to top actives; cite on the new ingredient pages + in answers | Provenance/citations; pairs with 9.1 groundedness | M | P7.2 |
| 12.5 | **Personalization.** Profile-aware retrieval (bias toward the user's concerns) + few-shot exemplars mined from 👍 feedback | "Personalization without fine-tuning"; ties feedback → quality | M | P7.3, P11 |

---

## Recommended sequencing & cut line

- **Highest signal per effort (do first):** 10.6 model bake-off (refresh README now) → 8.5 structured outputs (kills format flakes) → 8.4 semantic cache (cost story) → 11.1 metrics dashboard (demo asset) → 10.1 feedback→eval loop (the flywheel).
- **Then the retrieval-quality arc:** 8.2 hybrid (fixes ret-036) → 8.1 rerank → 8.7 tuning table.
- **Then trust:** 9.1 groundedness + 9.2 injection evals.
- **Feature depth (12.x)** slots in whenever a demo needs a new *kind* of signal — not before.
- **Explicit cut line:** 10.6 + 8.5 + 8.4 + 11.1 + 10.1 is a complete, defensible "senior" story on their own. Everything else is depth, not a new signal type.

**Deliberately still out of scope** (scoping discipline is itself a signal): fine-tuning/RLHF, a vector DB migration off pgvector, multi-tenant infra, real-time collaboration, mobile app. Note them in the README as conscious non-goals.

## Interview stories this unlocks

- "Dense-only retrieval missed exact product nicknames; I added lexical + RRF hybrid and recall@6 went from X→Y."
- "I put a semantic cache on the chat path — Z% hit rate, $ N/day saved, p50 latency −M ms."
- "Down-votes flow into a triage queue and become eval cases; a regression there fails CI."
- "Both pipelines run one model now, so my A/B isolates the *pipeline* variable; here are the numbers with Wilson intervals."
- "Everything I ship is instrumented — here's the live cost/latency/satisfaction dashboard, sliced by intent and language."
