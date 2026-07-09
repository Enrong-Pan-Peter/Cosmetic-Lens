# CosmeticLens Improvement Plan

**Created:** 2026-07-07 · **Supersedes:** `plan-part-{1..5}.md` (frozen originals)
**Goal:** A publicly deployed, commercial-looking product that proves AI/LLM application engineering skill (agents, RAG, evals, cost/latency engineering) to recruiters and interviewers.
**Continues in:** [`advanced-roadmap.md`](./advanced-roadmap.md) — Phases 8–12 (advanced RAG/inference, guardrails, eval maturity, analytics, feature depth), added 2026-07-08 after the P7 core shipped.

## Locked decisions (from blind-spot review, 2026-07-07)

1. **ML claim** = LLM/RAG engineering. No trained models; the eval harness is the rigor evidence.
2. **Public URL on resume** → security/cost hardening gates deployment.
3. **Target role**: AI/LLM application engineer.
4. **Chat history**: full server-side sync for logged-in users.
5. **Pipelines**: keep both — `chat-agentic.ts` (default) vs `chat.ts` (baseline) — and compare via evals.
6. **Language**: EN flagship; zh maintained (correctness fixes only).

**Build order:** P0 quick wins → P1 security → P2 evals → P3 chat sync → P4 RAG quality + observability → P5 recruiter surface → P6 polish → P7 feature additions. P5 items that don't depend on deployment (screenshots, diagram, README skeleton) should land early, opportunistically; P7 features slot in once foundations exist.

---

## Phase 0 — Quick wins (≤ half a day)

> **Status 2026-07-07:** 0.1, 0.2, 0.5, 0.7 done (plus P1.1 IDOR fix, done ahead of schedule). 0.3 was already wired — the arch doc was stale. **0.4 (OpenAI spend cap) and 0.6 (`PUBLIC_SITE_URL` in Vercel) are manual dashboard steps — still pending.**

| # | Task | Files |
|---|------|-------|
| 0.1 | Move `plan-part-{1..5}.md` → `docs/archive/` — repo root should read clean to a recruiter | root |
| 0.2 | Unify zh brand name: pick **成分透视** (canonical per arch doc §12); fix `zh.json site.name`, README (护肤黄金眼) | `src/i18n/zh.json`, `README.md` |
| 0.3 | List zh articles on zh education index (files exist, not wired) | `src/pages/zh/education/index.astro` |
| 0.4 | Set OpenAI **hard spend cap** in platform dashboard (manual) | — |
| 0.5 | Add `export const maxDuration = 60` (or vercel.json function config) to all SSE routes — agentic loop + streaming will exceed Vercel's default 10s and die mid-stream in prod | `src/pages/api/chat*.ts` |
| 0.6 | **Set `PUBLIC_SITE_URL` in Vercel env** — production HTML ships `canonical: http://localhost:4321/en` + localhost og:image (verified live 2026-07-07). Breaks SEO + all link previews | Vercel dashboard |
| 0.7 | Dynamic copyright year (footer shows © 2025); **only ever share the production domain** (`cosmetic-lens.vercel.app`) — `*-projects.vercel.app` preview URLs are behind Vercel auth | `Footer.astro` |

**Done when:** repo root has no stale plans; zh brand is consistent; a prod chat request streams to completion; view-source on prod shows the real domain in canonical/og tags.

---

## Phase 1 — Security & cost hardening (gate for public URL) — ~2–3 days

> **Status 2026-07-07:** 1.1 (IDOR), 1.2 (rate limiting — done without middleware indirection; shared `src/lib/rate-limit.ts`, applied to chat, chat-agentic, chat-title, vision-extract, search-product, analyze), 1.3 (input caps — done inline; zod skipped as unnecessary for 3 simple fields, keeps deps lean) all done. 1.4 covered by `MAX_TOOL_ITERATIONS=4` × `MAX_TOKENS_PER_TURN=1800` existing caps. Remaining: 1.5 key rotation (manual), 1.6 CSP, 1.7 deferred. **Verify after deploy:** RPC exists — run `select increment_rate_limit('smoke:test','ip');` in Supabase SQL editor (then `delete from rate_limits where identifier='smoke:test';`); rate limiting fails open if the function is missing.

**Why:** `/api/chat-agentic`, `/api/chat`, `/api/chat-title`, `/api/vision-extract`, `/api/search-product` are unauthenticated, unlimited, and spend money. Body `userId` is trusted → IDOR leaking pregnancy status/allergies via service-role profile fetch (`chat-agentic.ts:298–308`, same in `chat.ts`).

| # | Task | Notes |
|---|------|-------|
| 1.1 | **Kill the IDOR.** New `src/lib/auth.ts` with `getUserFromRequest(request)`: reads `Authorization: Bearer`, verifies via `supabase.auth.getUser(token)`, returns user or null. Chat endpoints derive userId from this — **delete body `userId` entirely** | Client: `ChatInterface.jsx` attaches session token when logged in |
| 1.2 | **Rate limiting middleware** `src/lib/rate-limit.ts` using existing `rate_limits` table + `increment_rate_limit()` RPC. Per-IP daily cap for anon (e.g. 20 msgs), per-user cap for authed (e.g. 100). IP from `x-forwarded-for` (Vercel). Apply to all 5 open endpoints. Return 429 + friendly UI message | Table + RPC already exist, unused |
| 1.3 | **Input caps + validation** (zod): max message length (~4k chars), max `messages` array (~30), reject oversized bodies. Vision: keep 8MB but rate-limit hardest (most expensive) | `zod` new dep |
| 1.4 | **Per-request budget guards:** confirm `maxTokens` caps; add total-token ceiling per agentic run (4 iterations × 1800 can hit ~10k output tokens) | `chat-agentic.ts` |
| 1.5 | Rotate Supabase service-role + OpenAI keys before publicizing (hygiene; `.env` was never committed — verified) | manual |
| 1.6 | Add basic CSP header; keep existing nosniff/DENY | `vercel.json` |
| 1.7 | (Defer unless abused) Cloudflare Turnstile on anonymous chat | — |

**Done when:** you cannot fetch another user's profile by any means; a script hammering `/api/chat-agentic` gets 429 within N requests; a stranger can't cost you >$1/day.
**Interview story:** "trust boundary at route level, JWT-derived identity, tiered rate limits, spend caps."

---

## Phase 2 — Eval harness (the resume centerpiece) — ~3–5 days

> **Status 2026-07-07:** 2.1–2.5 built. `evals/` contains the runner (`run.mjs`), three golden datasets (60 intent / 38 retrieval / 26 e2e cases, EN+ZH), LLM-judge rubric, latency+cost capture, and `--pipeline both` comparison. Known-hard cases are labeled and excluded from the core metric — they're the improvement backlog. A `RATE_LIMIT_BYPASS_TOKEN` header exempts eval traffic from daily limits (dev-only env var). **First real run must happen on your machine** (sandbox has no OpenAI/Supabase egress): add the token to `.env`, `npm run dev`, then `node evals/run.mjs --suite all --pipeline both`. 2.6 (tuning) starts after that first run's numbers; 2.7 (CI) lands with P6.
>
> **First run + fix cycle (2026-07-07):** baseline — intent 76.7% (EN 87.5% / zh 55%), retrieval recall@6 97.4%, e2e judge pass classic 92.3% vs agentic **100%** (agentic also cheaper; +230ms TTFT). Evals exposed 6 root causes, all fixed same day: CJK `\b` bug killing every zh brand in `KNOWN_BRANDS`; over-permissive `'maybe'` product path (greetings → product); domain-term rule eating product names ("…Toner"); zh 、/，list separators unhandled; `dupe-finder` normalize stripping CJK (zh dupe queries matched the *first* curated pair); dupe-phrase/slang gaps. Verified 34/34 in an offline unit test. Re-run `--suite intent` + (after re-seed) `--suite retrieval` for the after-numbers. Threshold 0.3 needs no change (97.4% survival).
>
> **After-numbers (2026-07-07 evening):** intent **100%** (EN 100 / zh 100, hard cases included); e2e classic struct 92.3% / agentic 96.2%, judge 92.3% vs **100%**, intent-ok 100% both. Second fix cycle from remaining failures: (a) agentic loop could exhaust `MAX_TOOL_ITERATIONS` without ever answering → empty bubble (e2e-002); fixed with a forced `tool_choice:'none'` final turn. (b) eval `zh_dominant` check was too strict for latin-heavy dupe tables; relaxed to 0.3 for dupe category (measurement fix). Retrieval re-run still pending re-seed.

**Why:** This is what makes the project defensible to AI interviewers. Everything downstream (threshold tuning, pipeline comparison, model swaps) becomes measurable.

| # | Task | Notes |
|---|------|-------|
| 2.1 | `evals/` directory + runner (`evals/run.mjs`, plain Node — no framework lock-in). Config: which pipeline (`chat` vs `chat-agentic`), model, language | |
| 2.2 | **Golden datasets** (JSON, versioned): (a) ~60 intent cases (EN + zh incl. follow-ups) → measures `intent.ts` accuracy; (b) ~40 retrieval cases: query → expected `knowledge_embeddings` doc ids → recall@k, MRR; (c) ~30 end-to-end cases: product analysis / knowledge / dupe prompts with rubric | Hand-label once; cheap to maintain |
| 2.3 | **LLM-as-judge** for (c): rubric scoring (groundedness to RAG context, format compliance incl. CLAIMS_DATA, no invented dupes — Mode C contract, disclaimer presence). Judge = stronger model (e.g. gpt-4.1), temp 0 | |
| 2.4 | **Latency + cost capture** per case: p50/p95, tokens in/out, $ per query | |
| 2.5 | **Classic vs agentic comparison report** → `evals/results/` markdown table; headline numbers go in README | Decision 5 payoff |
| 2.6 | **Tune with data:** similarity threshold (currently arbitrary 0.3), `matchCount` 6, agentic max-iterations. Document before/after | `chat.ts`, `embeddings.ts` |
| 2.7 | Wire deterministic evals (intent accuracy, retrieval recall — no LLM judge) into CI later (P6); full judge runs stay manual | |

**Done when:** `node evals/run.mjs --pipeline agentic` outputs a metrics table; README can cite real numbers (e.g. "retrieval recall@6 = 0.87, intent accuracy = 0.93, p95 = 8.2s, $0.004/query").

---

## Phase 3 — Server-side chat sync — ~3–4 days

> **Status 2026-07-07: BUILT (all of 3.1–3.7).** `chats`/`chat_messages` tables + RLS (`supabase/migrations/20260707_chat_sync.sql` — **run this in the Supabase SQL editor**), `/api/chats` + `/api/chats/[id]` (JWT + ownership), debounced client sync with localStorage as cache, one-time import prompt, cross-device `?chat=` deep links, History page now lists synced chats (`/api/history` kept but legacy), localStorage schema versioned (v2).

**Why:** History page is dead (nothing writes `analysis_history`); logged-in users lose chats across devices. Auth currently buys nothing.

| # | Task | Notes |
|---|------|-------|
| 3.1 | Migration: `chats` (id, user_id, title, created_at, updated_at) + `chat_messages` (id, chat_id, seq, role, content, metadata jsonb, created_at). RLS: owner-only. Forward-only file in `supabase/migrations/` | metadata holds `intent`, `source`, `toolCalls`, `dupes`, `fromPhoto` |
| 3.2 | API: `/api/chats` (GET list, POST create, DELETE), `/api/chats/[id]` (GET messages, PATCH title). Auth via P1 `getUserFromRequest` | |
| 3.3 | Client storage adapter in `ChatInterface.jsx`: logged-in → server (optimistic writes, localStorage as offline cache); anon → localStorage as today. Keep `?chat=` URL contract | Biggest UI change; respect abort contract |
| 3.4 | One-time **import prompt** on login: "Import N local chats to your account?" | Migration path |
| 3.5 | History page → server chat list (or fold into sidebar and repurpose the page as "Saved analyses"); either way, no dead page | Decide during build |
| 3.6 | Retire `analysis_history` writes or wire chat product-analyses into it — don't leave half-dead tables | `analyzer.ts` |
| 3.7 | Add `version` field to localStorage schema while touching it | cheap future-proofing |

**Done when:** login on a second device shows the same chats; logout still works fully (anonymous localStorage mode); no empty History page.

---

## Phase 4 — RAG quality, provenance & observability — ~3–4 days

> **Status 2026-07-07: BUILT (4.1–4.3, 4.5–4.7; 4.4 deferred).** Language-filtered `match_knowledge` (+ graceful fallback pre-migration; eval harness mirrors it), sources chips under answers (classic meta + agentic tool_result), required health-disclaimer rule in system prompt, intent-based temperature (product/dupe 0.4), `llm_calls` telemetry with REAL token counts (`stream_options.include_usage`) across chat/chat-agentic/chat-title, incremental hash-based seed with stale-row pruning. Migration: `supabase/migrations/20260707_rag_language_telemetry.sql` — **run in SQL editor, then re-run the seed once to backfill hashes**. 4.4 (ingredient references) deferred: citations need manual vetting to avoid fabricated sources — do alongside P7.2 ingredient pages. 4.6 Sentry/Vercel-Analytics remain manual dashboard steps.

| # | Task | Notes |
|---|------|-------|
| 4.1 | **Language-filtered retrieval:** `match_knowledge` RPC + `searchKnowledge` take `filter_language`; chat endpoints pass user language. Today zh queries search a mixed EN/ZH index with no filter — verify impact via P2 retrieval evals first (EN-flagship: this is a correctness fix, not new investment) | `schema.sql`, `embeddings.ts`, both chat endpoints |
| 4.2 | **Citations UI:** meta/tool events already know which snippets grounded the answer — surface "Sources: [ingredient] Niacinamide · [interaction] Retinol+AHA" chips under answers. Provenance story + hallucination guard in one | `AnalysisDisplay.jsx` |
| 4.3 | **Per-answer health disclaimer** line for pregnancy/medical-adjacent answers (detect via interaction context or intent); keep Mode B confidence banner | `system-prompt.md` |
| 4.4 | **Sources for top ingredients:** add `references[]` (PubChem/CIR/published reviews) to top ~20 actives in `ingredients-database.json`; render in glossary + cite in answers. Full 100 is a stretch goal | Retrofitting later is the expensive path |
| 4.5 | **Consistency:** product-analysis turns at temp ≤0.4 (agentic already 0.3; classic `chat.ts` is 0.7). Align, or justify in README | |
| 4.6 | **Observability:** (a) `llm_calls` Supabase table: route, model, tokens, latency, est. cost, error — written by `openai.ts` wrapper; (b) Sentry free tier (or Vercel error monitoring); (c) Vercel Analytics for traffic. Optional: tiny `/admin/metrics` page — great demo asset | Enables resume metrics + spend visibility |
| 4.7 | Seed script: switch destructive wipe → upsert on stable content hash; add `--dry-run` | `seed-embeddings.mjs` |

**Done when:** zh retrieval measurably improves (P2 evals re-run); every answer shows its sources; you can query real p95/cost from `llm_calls`.

---

## Phase 5 — Recruiter surface (README, demo, SEO) — ~1–2 days

> **Status 2026-07-07:** 5.1 done — README rewritten around the engineering story: live demo link top-of-fold, measured before/after eval tables, classic-vs-agentic comparison, mermaid architecture, quickstart, scope-discipline section. **Remaining manual:** record `docs/assets/demo.gif` (~30s: product analysis with agent trace → dupe table → zh safety question with sources; instructions in the README's HTML comment). 5.2 done — example prompts now cover the three modes (verified product / curated dupe / safety+sources). 5.5 done — `docs/resume-bullets.md` with quantified bullets + five interview story starters. 5.3 pending the `PUBLIC_SITE_URL` env var (0.6); 5.4 = deploy + cold smoke test.

**Why:** The actual user of this project reviews it in ~60 seconds.

| # | Task | Notes |
|---|------|-------|
| 5.1 | **README rewrite:** hero GIF (chat streaming + agent trace), **live demo URL** top-of-fold, mermaid architecture diagram, **eval results table** (from P2), "Engineering highlights" section (agentic loop, SSE contract, RAG, rate limiting, evals), honest tech-stack table, quickstart | The conversion surface |
| 5.2 | Suggested demo path: 3 example prompts already exist on empty chat state — curate them so a recruiter's first query hits curated data (Mode A), not LLM fallback | `i18n` example keys |
| 5.3 | Link previews: og:image/canonical infra already exists in `BaseLayout.astro` (fixed by 0.6) — verify `/images/og.webp` is a real branded card and test a paste into Slack/LinkedIn | Link previews in Slack/LinkedIn |
| 5.4 | Deploy to production; smoke-test SSE, auth, rate limits from a cold client. Resume/README link = production domain only (consider a custom domain, ~$10/yr, for polish) | After P1 |
| 5.5 | Draft 3–4 resume bullets with real numbers from evals/observability | Deliverable of the whole project |

**Done when:** cold visitor → README → live demo → impressive first query, in under two minutes.

---

## Phase 6 — Product & code polish — ongoing

> **Status 2026-07-07:** 6.1 done — **105 vitest tests** across 5 files (the 60-case golden intent dataset replays as deterministic CI tests; prompt heuristics incl. regression guards for every eval-found bug; dupe matcher incl. the CJK-normalize regression; math/emoji normalizers; cleanTitle) + GitHub Actions (`.github/workflows/ci.yml`: test → astro check → build; LLM-judge evals stay manual by design). 6.2 done — `@ts-nocheck` removed from prompt.ts (typed interfaces, one documented boundary cast for JSON literal-union types); **found+fixed a latent bug**: `extractProductFromDupeRequest` returned `"s"` for "alternatives to X" (capturing group). 6.3 partial — `role="log"` + `aria-live="polite"` + `aria-busy` on the chat stream region, `role="alert"` on errors; skeletons already exist on History. 6.3b/c/d (icons/emoji/LaTeX) done earlier. **Deferred with reasons:** 6.4 i18n ternary sweep (high churn, zero user-visible change), 6.5 dark mode (do properly or not at all), 6.6 pipeline dedupe (would blur the A/B comparison that the README showcases).

| # | Task | Notes |
|---|------|-------|
| 6.1 | **Tests + CI:** vitest for `intent.ts`, `prompt.ts` heuristics, SSE frame parser, `cleanTitle`; GitHub Actions: typecheck (`astro check`), build, unit tests, deterministic evals | Zero tests today is itself a signal |
| 6.2 | Remove `@ts-nocheck` from `prompt.ts`; type it properly | |
| 6.3 | UI pass: loading skeletons, empty states, error UX, mobile drawer, a11y (`aria-live="polite"` on streaming region, keyboard nav, focus management) | "Commercial look" |
| 6.3b | ~~De-emoji pass~~ **done 2026-07-07**: all UI emoji (✅⚠️🤖💡 badges, Learn-page emoji cards, blue gradient icons) replaced with monochrome Phosphor regular-weight icons matching the homepage; ClaimsTable/AnalysisDisplay keep legacy-emoji fallbacks for old saved chats | Design-language consistency |
| 6.3c | **done 2026-07-07**: emoji→Phosphor render pipeline (`markdown-icons.jsx` rehype plugin) — model may use a restricted emoji set (✅⚠️❌❓⭐💡💧🚫🔬🛡️), renderer swaps each for the matching monochrome line icon at display time (code blocks stay literal). Restyles legacy chats for free | Model output stays on-brand without banning emoji |
| 6.3d | **done 2026-07-07**: LaTeX math rendering (remark-math + rehype-katex + KaTeX css) — `$$...$$` inline or own-line (centered display, ChatGPT-style); `singleDollarTextMath` OFF so `$15` prices are never parsed as math; system prompt instructs LaTeX for any math. New deps: katex, remark-math, rehype-katex (`npm install` required) | |
| 6.4 | i18n sweep: replace inline `lang === 'zh'` ternaries with `t` keys | arch doc §12 debt |
| 6.5 | Dark mode (optional — only if time; do it properly with `.dark` tokens) | |
| 6.6 | Phosphor deprecated icon names; dedupe shared logic between `chat.ts` / `chat-agentic.ts` into `src/lib/chat-shared.ts` where it doesn't blur the A/B comparison | |

---

## Phase 7 — Feature additions (functionality upgrades) — pick 3–4, not all

> **Status 2026-07-08:** recommended cut line **7.1 + 7.2 + 7.3 BUILT** (typecheck 0 errors, 114/114 unit tests, production build prerenders all 200 ingredient pages).
> - **7.2** `src/lib/ingredients.ts` (typed DB access, slug/lookup/related helpers) + `IngredientDetail.astro` + prerendered `/[en|zh]/ingredients/[id]` (100 each) and `/ingredients` index (`IngredientIndex.jsx`, client search/filter). Glossary rows now deep-link to detail pages; new `Ingredients` label + `Routine` nav item; `DefinedTerm` JSON-LD per page.
> - **7.1** `src/lib/routine.ts` (pure `analyzeRoutine`, reuses `productHasIngredient` exported from prompt.ts) → cross-product + intra-product conflict matrix, AM/PM placement, layering tips; excludes pregnancy/synergy pairs. Surfaced two ways: `/api/routine` (light rate-limit, no LLM) + `RoutineChecker.jsx` page, AND a new `check_routine` agent tool (tools.ts is now 5 tools; taught in chat-agentic guide EN+ZH). Tests in `tests/routine.test.ts`.
> - **7.3** `supabase/migrations/20260708_feedback.sql` (feedback table, RLS owner-select, service-role writes) + `/api/feedback` (anonymous-friendly, JWT-only identity) + `MessageFeedback.jsx` (👍 immediate / 👎 optional reason) under every completed assistant answer. **Run the migration in the Supabase SQL editor.**
> - **7.4 (share links) deferred:** needs a public-read RLS table for analysis content — security-sensitive, do deliberately per decision #2, not rushed. 7.5–7.7 not started.
> - **Model swap (this session):** app pipelines now use **gpt-5.4-mini** (classic primary in openai.ts, agentic in chat-agentic.ts, vision primary in vision.ts; gpt-4o-mini kept as fallback). **Eval harness NOT changed** — `evals/run.mjs` PIPELINE_MODEL + `evals/lib/env.mjs` pricing still reference 4.1-mini/4o-mini. Re-run evals on gpt-5.4-mini to refresh README numbers; note both pipelines now share one model, so the A/B comparison isolates pipeline (not model) — decide how to frame that before rewriting the README headline.

**Why:** Current feature set is one core loop (chat analysis) + supporting pages. These additions deepen both stories — commercial completeness and AI engineering — while reusing existing infrastructure. Ordered by value-per-effort.

| # | Feature | Why / what it shows | Effort | Depends on |
|---|---------|--------------------|--------|-----------|
| 7.1 | **Routine conflict checker** — user enters 2–5 products (their AM/PM routine); output: cross-product conflict matrix from `ingredient-interactions.json`, AM/PM ordering advice, layering tips. New agent tool `check_routine` + dedicated UI (matrix render) | The differentiator feature — no single-product analyzer does this; showcases multi-product agentic reasoning; **the data already exists** | M | P1 (cost) |
| 7.2 | **Ingredient detail pages** — prerendered `/en/ingredients/[id]` for all 100 DB entries: functions, effective concentrations, interactions, pregnancy safety, related ingredients. Glossary rows + chat answers link to them | Content depth = commercial feel; programmatic SEO (100 indexable pages); zero LLM runtime cost | M | none — can start anytime |
| 7.3 | **Answer feedback (👍/👎ᐩreason)** — stored to a `feedback` table; failures triaged into new eval cases | Closes the **eval flywheel** ("user feedback → eval set → measured fix") — the strongest interview story per line of code | S | P2 |
| 7.4 | **Shareable analysis links** — "Share" button → public read-only `/a/[id]` page with og card | Commercial norm (ChatGPT-style share); lets you send recruiters a *live example result*, not just the homepage | S–M | P3 |
| 7.5 | **Barcode scan** — mobile camera scan (`BarcodeDetector` API + lib fallback) → `getProductByBarcode` (already written in `openbeautyfacts.ts`, currently unused) → analysis | Wow-factor phone demo; backend path already exists | S–M | P1 |
| 7.6 | **Semantic concern search on glossary** — "what helps with redness?" box using existing embeddings (`filterType` ingredient/glossary) | Shows RAG infra reused outside chat; very cheap | S | none |
| 7.7 | (Optional) **Product comparison** — "compare A vs B" side-by-side table via a `compare_products` agent tool | Nice, but overlaps 7.1's mechanics; build only if demo flow wants it | M | 7.1 |

**Recommended cut line:** 7.1 + 7.2 + 7.3, plus 7.4 or 7.5. More than that delays the resume-ready date without adding a new *kind* of signal.

**Deliberately not building:** PWA/offline, price tracking, reminders/notifications, community reviews/comments, OAuth social login, model fine-tuning (decision 1). Each adds surface area without strengthening either story — list them in README as "consciously out of scope" (scoping discipline is itself a senior signal).

---

## Risk register (from blind-spot analysis — watch these)

- **Coverage cliff:** most real products fall to Mode B (LLM fallback). Mitigation: honest confidence banner (exists), citations (4.2), demo path through curated data (5.2). Expanding curated data is *not* planned — document the tradeoff in README instead.
- **Vercel limits:** re-test streaming after any adapter/runtime upgrade (P0.5).
- **Legal-ish:** dupes name real brands (nominative use — fine, keep factual); health advice needs the disclaimer visible per-answer (4.3), not just footer.
- **Two pipelines drift:** eval suite is the drift detector — run both pipelines on every eval run.

## Suggested sequencing (evenings/weekends pace)

- **Week 1:** P0 + P1 (deploy-safe) + 5.4 deploy
- **Week 2:** P2 evals + 5.1–5.3 README/demo (start applying with a live link + numbers)
- **Week 3:** P3 chat sync + 7.3 feedback (small, rides on P2)
- **Week 4:** P4 RAG/observability
- **Weeks 5–6:** P7 features (7.1 routine checker, 7.2 ingredient pages, then 7.4 or 7.5) + P6 rolling
- README/demo assets (P5) refresh whenever a phase ships something visible
